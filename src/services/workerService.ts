// src/services/workerService.ts
import * as Comlink from 'comlink';
import type {
  CalculationParams,
  WorkerOutput,
  WorkerProgress,
} from '@/types/calculations';
import type { RoadSegmentData } from '@/types/data';

// Worker interface with updated types
export interface CalculationWorkerType {
  calculate: (
    segments: RoadSegmentData[],  // Updated type
    params: CalculationParams,
    progressCallback?: (progress: WorkerProgress) => void
  ) => Promise<WorkerOutput>;
  abort: () => void;
  ping: () => string;
}

export class WorkerService {
  private worker: Worker | null = null;
  private workerProxy: Comlink.Remote<CalculationWorkerType> | null = null;
  private isCalculating = false;
  private restartAttempts = 0;
  private readonly MAX_RESTART_ATTEMPTS = 3;
  private cachedResults = new Map<string, WorkerOutput>();
  private readonly MAX_CACHE_SIZE = 10;

  async initialize(): Promise<void> {
    try {
      this.worker = new Worker(
        new URL('../workers/calculation.worker.ts', import.meta.url),
        { type: 'module' }
      );
      this.workerProxy = Comlink.wrap<CalculationWorkerType>(this.worker);

      const response = await this.workerProxy.ping();
      if (response !== 'pong') {
        throw new Error('Worker health check failed');
      }

      this.restartAttempts = 0;
      console.log('✅ Worker initialized successfully');
    } catch (error) {
      console.error('Failed to initialize worker:', error);
      throw error;
    }
  }

  private getCacheKey(params: CalculationParams): string {
    // Sorting arrays ensures key consistency
    // Note: localAuthorities actually contains county codes
    const sortedCounties = params.localAuthorities ? [...params.localAuthorities].sort() : undefined;
    return JSON.stringify({ ...params, localAuthorities: sortedCounties });
  }

  async calculate(
    segments: RoadSegmentData[],  // Updated type
    params: CalculationParams,
    onProgress?: (progress: WorkerProgress) => void
  ): Promise<WorkerOutput> {
    if (!this.workerProxy) {
      await this.initialize();
    }

    if (this.isCalculating) {
      console.warn('Calculation already in progress. Aborting previous.');
      this.abort();
    }

    const cacheKey = this.getCacheKey(params);
    const cached = this.cachedResults.get(cacheKey);
    if (cached) {
      console.log('Returning cached calculation result');
      onProgress?.({
        current: segments.length,
        total: segments.length,
        percentage: 100,
        stage: 'complete',
        message: 'Using cached results',
      });
      // Re-insert to mark as recently used for a more accurate LRU
      this.cachedResults.delete(cacheKey);
      this.cachedResults.set(cacheKey, cached);
      return cached;
    }

    this.isCalculating = true;

    try {
      const progressCallback = onProgress
        ? Comlink.proxy((progress: WorkerProgress) => {
            onProgress(progress);
          })
        : undefined;

      // Pass the segments array directly. The browser's structured cloning
      // algorithm will handle the transfer efficiently off the main thread.
      const result = await this.workerProxy!.calculate(
        segments,
        params,
        progressCallback
      );

      // Update cache (LRU)
      if (this.cachedResults.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.cachedResults.keys().next().value;
        if (firstKey) {
          this.cachedResults.delete(firstKey);
        }
      }
      this.cachedResults.set(cacheKey, result);

      return result;
    } catch (error) {
      console.error('Calculation failed:', error);

      if (this.restartAttempts < this.MAX_RESTART_ATTEMPTS) {
        this.restartAttempts++;
        console.log(`Attempting worker restart (${this.restartAttempts}/${this.MAX_RESTART_ATTEMPTS})`);
        await this.restart();
        return this.calculate(segments, params, onProgress);
      }

      throw error;
    } finally {
      this.isCalculating = false;
    }
  }

  abort(): void {
    if (this.workerProxy && this.isCalculating) {
      this.workerProxy.abort();
      this.isCalculating = false;
    }
  }

  async restart(): Promise<void> {
    this.terminate();
    await this.initialize();
  }
  
  clearCache(): void {
    this.cachedResults.clear();
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cachedResults.size,
      keys: Array.from(this.cachedResults.keys()),
    };
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerProxy = null;
      this.isCalculating = false;
    }
  }
}

// Singleton instance
export const workerService = new WorkerService();