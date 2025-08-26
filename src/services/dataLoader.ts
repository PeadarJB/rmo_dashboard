// src/services/dataLoader.ts
import type { RoadSegmentData, SummaryData, DataLoadProgress } from '@/types/data';
import { 
  FullDatasetSchema,
  validateSummaryFile,
  type ValidatedSummaryFile 
} from '@/utils/validators';
import { fetchFromS3 } from './s3Service';
import { logger } from '@/utils/logger';

// Define the structure of the cached data
interface CacheEntry {
  data: RoadSegmentData[] | SummaryData;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.0.0';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// S3 file names
const SUMMARY_FILE = 'road_network_summary_2.json';
const FULL_DATA_FILE = 'road_network_full_2.json';

// Local file paths (fallback)
const LOCAL_SUMMARY_PATH = '/data/road_network_summary_2.json';
const LOCAL_FULL_PATH = '/data/road_network_full_2.json';

// Fallback to local files if S3 fails (development only)
const USE_LOCAL_FALLBACK = import.meta.env.DEV;

export interface DataLoaderService {
  loadSummaryData(onProgress?: (progress: DataLoadProgress) => void): Promise<SummaryData>;
  loadFullDataset(onProgress?: (progress: DataLoadProgress) => void): Promise<RoadSegmentData[]>;
  loadTwoStage(onProgress?: (progress: DataLoadProgress) => void): Promise<{ summary: SummaryData; full: RoadSegmentData[] }>;
  clearCache(): void;
  abort(): void;
}

export class DataLoaderServiceImpl implements DataLoaderService {
  private db: IDBDatabase | null = null;
  private controller: AbortController | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('rmo-cache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(request.result);
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('datasets')) {
          db.createObjectStore('datasets');
        }
      };
    });
  }

  private async getFromCache(key: string): Promise<CacheEntry | null> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['datasets'], 'readonly');
      const store = transaction.objectStore('datasets');
      const request = store.get(key);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveToCache(key: string, value: CacheEntry): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['datasets'], 'readwrite');
      const store = transaction.objectStore('datasets');
      const request = store.put(value, key);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async clearCacheStore(): Promise<void> {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['datasets'], 'readwrite');
      const store = transaction.objectStore('datasets');
      const request = store.clear();
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Load data with S3 primary and local fallback
   */
  private async loadFromS3OrFallback<T>(
    s3FileName: string,
    localPath: string,
    validator?: (data: any) => T
  ): Promise<T> {
    try {
      logger.info('dataLoader', `Attempting to load ${s3FileName} from S3...`);
      const data = await fetchFromS3<T>(s3FileName);
      
      // Validate if validator provided
      if (validator) {
        return validator(data);
      }
      return data;
    } catch (error) {
      logger.error('dataLoader', `Failed to load from S3: ${s3FileName}`, { error });
      
      // In development, fall back to local files
      if (USE_LOCAL_FALLBACK) {
        logger.warn('dataLoader', `Falling back to local file: ${localPath}`);
        const response = await fetch(localPath);
        if (!response.ok) {
          throw new Error(`Failed to load local file: ${response.status}`);
        }
        const data = await response.json();
        
        // Validate if validator provided
        if (validator) {
          return validator(data);
        }
        return data;
      }
      
      // In production, re-throw the error
      throw error;
    }
  }

  /**
   * Extract totals from the complex summary file structure
   */
  private extractSummaryTotals(summaryFile: ValidatedSummaryFile): SummaryData {
    let totalSegments = 0;
    let totalCost = 0;
    // Dynamically get the latest year from the metadata
    const latestYear = summaryFile.metadata.surveyYears.reduce((a, b) => a > b ? a : b);

    // Aggregate from all counties for the latest year
    for (const county in summaryFile.summary) {
      const countyData = summaryFile.summary[county];
      if (countyData[latestYear]) {
        const yearData = countyData[latestYear];
        for (const category in yearData) {
          const categoryData = yearData[category];
          totalSegments += categoryData.count;
          totalCost += categoryData.cost;
        }
      }
    }

    return {
      totalSegments,
      totalLength: totalSegments * 100, // Each segment is 100m
      totalCost,
      localAuthorities: summaryFile.metadata.localAuthorities,
      lastUpdated: new Date().toISOString(),
      // Include the rich data
      metadata: summaryFile.metadata,
      countyBreakdown: summaryFile.summary,
    };
  }

  async loadSummaryData(
    onProgress?: (progress: DataLoadProgress) => void
  ): Promise<SummaryData> {
    const cacheKey = 'summary';

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      onProgress?.({
        stage: 'complete',
        summaryLoaded: true,
        fullLoaded: false,
        progress: 100,
      });
      return cached.data as SummaryData;
    }

    onProgress?.({
      stage: 'loading-summary',
      summaryLoaded: false,
      fullLoaded: false,
      progress: 0,
    });

    try {
      // Load from S3 or fallback to local
      const summaryFile = await this.loadFromS3OrFallback<ValidatedSummaryFile>(
        SUMMARY_FILE,
        LOCAL_SUMMARY_PATH,
        (data) => {
          const validated = validateSummaryFile(data);
          if (!validated) {
            throw new Error('Summary file validation failed.');
          }
          return validated;
        }
      );

      // Extract and process the data
      const summaryData = this.extractSummaryTotals(summaryFile);

      // Cache the result
      await this.saveToCache(cacheKey, {
        data: summaryData,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      });

      onProgress?.({
        stage: 'complete',
        summaryLoaded: true,
        fullLoaded: false,
        progress: 50,
      });

      return summaryData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.({
        stage: 'error',
        summaryLoaded: false,
        fullLoaded: false,
        progress: 0,
        error: errorMessage,
      });
      throw new Error(`Failed to load summary data: ${errorMessage}`);
    }
  }

  async loadFullDataset(
    onProgress?: (progress: DataLoadProgress) => void
  ): Promise<RoadSegmentData[]> {
    const cacheKey = 'full';

    // Check cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      onProgress?.({
        stage: 'complete',
        summaryLoaded: true,
        fullLoaded: true,
        progress: 100,
      });
      return cached.data as RoadSegmentData[];
    }

    onProgress?.({
      stage: 'loading-full',
      summaryLoaded: true,
      fullLoaded: false,
      progress: 50,
    });

    try {
      // Load from S3 or fallback to local
      const fullData = await this.loadFromS3OrFallback<RoadSegmentData[]>(
        FULL_DATA_FILE,
        LOCAL_FULL_PATH,
        (data) => FullDatasetSchema.parse(data)
      );

      // Cache the result
      await this.saveToCache(cacheKey, {
        data: fullData,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      });

      onProgress?.({
        stage: 'complete',
        summaryLoaded: true,
        fullLoaded: true,
        progress: 100,
      });

      return fullData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.({
        stage: 'error',
        summaryLoaded: true,
        fullLoaded: false,
        progress: 0,
        error: errorMessage,
      });
      throw new Error(`Failed to load full dataset: ${errorMessage}`);
    }
  }

  async loadTwoStage(
    onProgress?: (progress: DataLoadProgress) => void
  ): Promise<{ summary: SummaryData; full: RoadSegmentData[] }> {
    // Load summary first for immediate interaction
    const summary = await this.loadSummaryData(onProgress);
    
    // Then load full dataset in background
    const full = await this.loadFullDataset(onProgress);
    
    return { summary, full };
  }

  clearCache(): void {
    this.clearCacheStore().catch(console.error);
  }

  abort(): void {
    this.controller?.abort();
  }
}

// Singleton instance - maintains compatibility with existing code
export const dataLoader = new DataLoaderServiceImpl();