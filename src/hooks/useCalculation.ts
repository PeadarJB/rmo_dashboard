// src/hooks/useCalculation.ts
import { useState, useCallback, useMemo } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { workerService } from '@/services/workerService';
import type { CalculationParams, WorkerProgress, WorkerOutput } from '@/types/calculations';

export const useCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);

  const {
    data: { fullDataset },
    thresholds,
    costs,
    selectedYear,
    selectedAuthorities,
    results,
    setCalculationResults,
    clearCalculationResults,
  } = useAnalyticsStore();

  const calculate = useCallback(async (): Promise<void> => {
    if (!fullDataset) {
      throw new Error('Full dataset not loaded');
    }

    setIsCalculating(true);
    setError(null);
    setProgress(null);

    const params: CalculationParams = {
      thresholds,
      costs,
      selectedYear,
      localAuthorities: selectedAuthorities.length > 0 ? selectedAuthorities : undefined,
    };

    try {
      const result = await workerService.calculate(
        fullDataset,
        params,
        (p: WorkerProgress) => setProgress(p)
      );
      
      setCalculationResults({
        segments: result.segments,
        summary: result.summary,
        timestamp: result.timestamp,
      });
    } catch (e) {
      const error = e instanceof Error ? e : new Error('Calculation failed');
      setError(error);
      throw error;
    } finally {
      setIsCalculating(false);
    }
  }, [fullDataset, thresholds, costs, selectedYear, selectedAuthorities, setCalculationResults]);

  const abort = useCallback(() => {
    workerService.abort();
    setIsCalculating(false);
  }, []);

  const clearCache = useCallback(() => {
    workerService.clearCache();
    clearCalculationResults();
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