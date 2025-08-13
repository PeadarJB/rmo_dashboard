// src/services/dataLoader.ts
import type { RoadSegmentData, SummaryData, DataLoadProgress } from '@/types/data';
import { 
  FullDatasetSchema,
  validateSummaryFile,
  type ValidatedSummaryFile 
} from '@/utils/validators';

// Define the structure of the cached data
interface CacheEntry {
  data: RoadSegmentData[] | SummaryData;
  timestamp: number;
  version: string;
}

const CACHE_VERSION = '1.0.0';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export class DataLoaderService {
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

  private async fetchWithRetry(
    url: string,
    retries = 3,
    delay = 1000
  ): Promise<Response> {
    this.controller = new AbortController();
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, {
          signal: this.controller.signal,
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        // Verify we're getting JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error(`Expected JSON, got ${contentType}`);
        }

        return response;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }
        
        if (i === retries - 1) {
          throw error;
        }
        
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
    
    throw new Error('Max retries reached');
  }

  /**
   * Extract totals from the complex summary file structure
   */
  private extractSummaryTotals(summaryFile: ValidatedSummaryFile): SummaryData {
    let totalSegments = 0;
    let totalCost = 0;
    
    // Aggregate from all counties and years
    for (const county in summaryFile.summary) {
      const countyData = summaryFile.summary[county];
      for (const year in countyData) {
        const yearData = countyData[year];
        for (const category in yearData) {
          const categoryData = yearData[category];
          // Only count 2018 data for totals (most recent complete survey)
          if (year === '2018') {
            totalSegments += categoryData.count;
            totalCost += categoryData.cost;
          }
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
      const response = await this.fetchWithRetry('/data/road_network_summary_2.json');
      const data = await response.json();
      
      // Validate and parse the complex summary structure
      const validatedFile = validateSummaryFile(data);
      if (!validatedFile) {
        throw new Error('Invalid summary file structure');
      }

      // Extract simplified summary for UI
      const summary = this.extractSummaryTotals(validatedFile);

      // Cache the result
      await this.saveToCache(cacheKey, {
        data: summary,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      });

      onProgress?.({
        stage: 'complete',
        summaryLoaded: true,
        fullLoaded: false,
        progress: 100,
      });

      return summary;
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
    const cacheKey = 'full-dataset';

    // Check cache
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
      progress: 0,
    });

    try {
      const response = await this.fetchWithRetry('/data/road_network_full_2.json');
      
      // Stream parsing for large file
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let chunks = '';
      let bytesReceived = 0;
      const contentLength = parseInt(response.headers.get('Content-Length') || '0');

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          bytesReceived += value.length;
          chunks += decoder.decode(value, { stream: true });
          
          const progress = contentLength ? (bytesReceived / contentLength) * 100 : 50;
          onProgress?.({
            stage: 'loading-full',
            summaryLoaded: true,
            fullLoaded: false,
            progress: Math.min(progress, 90), // Cap at 90% until parsing
          });
        }
      }

      // Parse and validate
      const parsed = JSON.parse(chunks);
      const validated = FullDatasetSchema.parse(parsed);

      // Cache the result
      await this.saveToCache(cacheKey, {
        data: validated,
        timestamp: Date.now(),
        version: CACHE_VERSION,
      });

      onProgress?.({
        stage: 'complete',
        summaryLoaded: true,
        fullLoaded: true,
        progress: 100,
      });

      return validated;
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

// Singleton instance
export const dataLoader = new DataLoaderService();