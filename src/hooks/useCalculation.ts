import { useState, useCallback, useMemo } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { workerService } from '@/services/workerService';
import type { CalculationParams, WorkerProgress } from '@/types/calculations';
import type { RoadSegmentData } from '@/types/data'; // Import RoadSegmentData

export const useCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);

  // No longer need to select fullDataset here, it will be passed in.
  const thresholds = useAnalyticsStore(state => state.parameters.thresholds);
  const costs = useAnalyticsStore(state => state.parameters.costs);
  const selectedYear = useAnalyticsStore(state => state.parameters.selectedYear);
  const selectedCounties = useAnalyticsStore(state => state.parameters.selectedCounties);
  const results = useAnalyticsStore(state => state.cache.results);
  const setCalculationResults = useAnalyticsStore(state => state.setCalculationResults);
  const clearCalculationResults = useAnalyticsStore(state => state.clearCalculationResults);

  // The `calculate` function now accepts the dataset as an argument.
  const calculate = useCallback(async (datasetToProcess: RoadSegmentData[]): Promise<void> => {
    // The check is now against the data passed directly to the function.
    if (!datasetToProcess || datasetToProcess.length === 0) {
      const err = new Error('Full dataset not loaded or is empty');
      setError(err);
      throw err;
    }

    setIsCalculating(true);
    setError(null);
    setProgress(null);

    const params: CalculationParams = {
      thresholds,
      costs,
      selectedYear,
      localAuthorities: selectedCounties.length > 0 ? selectedCounties : undefined,
    };

    try {
      const result = await workerService.calculate(
        datasetToProcess, // Use the passed-in dataset
        params,
        (p: WorkerProgress) => setProgress(p)
      );
      
      setCalculationResults({
        segments: result.segments,
        summary: result.summary,
        timestamp: result.timestamp,
        calculationId: result.calculationId,
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Calculation failed');
      setError(error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [thresholds, costs, selectedYear, selectedCounties, setCalculationResults]);

  const abort = useCallback(() => {
    workerService.abort();
    setIsCalculating(false);
    setProgress(null);
  }, []);

  const clearCache = useCallback(() => {
    workerService.clearCache();
    clearCalculationResults();
    setError(null);
    setProgress(null);
  }, [clearCalculationResults]);

  return useMemo(() => ({
    calculate,
    abort,
    clearCache,
    isCalculating,
    error,
    progress,
    results,
  }), [calculate, abort, clearCache, isCalculating, error, progress, results]);
};