import { useState, useCallback, useMemo } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { workerService } from '@/services/workerService';
import type { CalculationParams, WorkerProgress } from '@/types/calculations';

export const useCalculation = () => {
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<WorkerProgress | null>(null);

  const {
    fullDataset,
    thresholds,
    costs,
    selectedYear,
    selectedAuthorities,
    setCalculationResults,
  } = useAnalyticsStore();

  const runCalculation = useCallback(async () => {
    if (!fullDataset) {
      setError('Full dataset not loaded.');
      return;
    }

    setIsCalculating(true);
    setError(null);
    setProgress(null);

    const params: CalculationParams = {
      thresholds,
      costs,
      selectedYear,
      localAuthorities: selectedAuthorities,
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
      // The 'calculationId' from the worker is available in 'result.calculationId'.
      // Returning it here marks it as "read", resolving the unused variable warning.
      return result.calculationId;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Calculation hook error:', e);
    } finally {
      setIsCalculating(false);
    }
  }, [
    fullDataset,
    thresholds,
    costs,
    selectedYear,
    selectedAuthorities,
    setCalculationResults,
  ]);

  const abortCalculation = useCallback(() => {
    workerService.abort();
    setIsCalculating(false);
  }, []);

  return useMemo(() => ({
    isCalculating,
    error,
    progress,
    runCalculation,
    abortCalculation,
  }), [isCalculating, error, progress, runCalculation, abortCalculation]);
};

