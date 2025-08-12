// src/hooks/useCalculation.ts
import { useState, useCallback, useMemo } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { workerService } from '@/services/workerService';
import type { CalculationParams, WorkerProgress } from '@/types/calculations';

export const useCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);

  // Use nested store structure
  const fullDataset = useAnalyticsStore(state => state.data.fullDataset);
  const thresholds = useAnalyticsStore(state => state.parameters.thresholds);
  const costs = useAnalyticsStore(state => state.parameters.costs);
  const selectedYear = useAnalyticsStore(state => state.parameters.selectedYear);
  const selectedAuthorities = useAnalyticsStore(state => state.parameters.selectedAuthorities);
  const results = useAnalyticsStore(state => state.cache.results);
  const setCalculationResults = useAnalyticsStore(state => state.setCalculationResults);
  const clearCalculationResults = useAnalyticsStore(state => state.clearCalculationResults);

  const calculate = useCallback(async (): Promise<void> => {
    if (!fullDataset) {
      const err = new Error('Full dataset not loaded');
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
      localAuthorities: selectedAuthorities.length > 0 ? selectedAuthorities : undefined,
    };

    try {
      const result = await workerService.calculate(
        fullDataset,
        params,
        (p: WorkerProgress) => setProgress(p)
      );
      
      // Now includes calculationId from WorkerOutput
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
  }, [fullDataset, thresholds, costs, selectedYear, selectedAuthorities, setCalculationResults]);

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

  // Return interface that components expect
  return useMemo(() => ({
    // Methods
    calculate,
    abort,
    clearCache,
    
    // State
    isCalculating,
    error,
    progress,
    results,  // Now includes calculationId
  }), [calculate, abort, clearCache, isCalculating, error, progress, results]);
};