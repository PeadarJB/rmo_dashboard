import { useEffect, useCallback, useState } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { dataLoader } from '@/services/dataLoader';
import { workerService } from '@/services/workerService';
import { CalculationParams } from '@/types/calculations';
import { nanoid } from 'nanoid';

/**
 * A comprehensive hook to manage the entire data loading and calculation lifecycle.
 * It orchestrates the dataLoader and workerService, updating the Zustand store.
 */
export const useCalculation = () => {
  // Select state and actions directly from the flattened store
  const {
    fullDataset,
    isLoading,
    loadProgress,
    loadError,
    results,
    parameters,
    setFullDataset,
    setSummaryData,
    setLoadProgress,
    setLoadError,
    setIsLoading,
    setCalculationResults,
  } = useAnalyticsStore();

  const [calculationId, setCalculationId] = useState<string | null>(null);

  // Action to load the initial dataset
  const loadInitialData = useCallback(async () => {
    if (isLoading || fullDataset) return;

    setIsLoading(true);
    setLoadError(null);
    try {
      const { summary, full } = await dataLoader.loadTwoStage(setLoadProgress);
      setSummaryData(summary);
      setFullDataset(full);
    } catch (error) {
      console.error('Failed to load dataset:', error);
      setLoadError(error instanceof Error ? error.message : 'Unknown data loading error');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, fullDataset, setIsLoading, setLoadError, setLoadProgress, setFullDataset, setSummaryData]);

  // Action to run a calculation
  const runCalculation = useCallback(async (params: CalculationParams) => {
    if (!fullDataset) {
      setLoadError('Full dataset not loaded. Cannot run calculation.');
      return;
    }

    workerService.abort();
    const newCalculationId = nanoid();
    setCalculationId(newCalculationId);

    try {
      const workerOutput = await workerService.calculate(fullDataset, params);
      
      // Ensure we only commit the result of the latest calculation request
      if (workerOutput.calculationId === newCalculationId) {
        setCalculationResults({
          segments: workerOutput.segments,
          summary: workerOutput.summary,
          timestamp: workerOutput.timestamp,
        });
      }
    } catch (error) {
      console.error('Calculation failed:', error);
      setLoadError(error instanceof Error ? error.message : 'Calculation worker error');
    }
  }, [fullDataset, setLoadError, setCalculationResults]);

  // Effect to trigger the initial calculation once data is loaded
  useEffect(() => {
    if (fullDataset && !results.timestamp) {
      runCalculation(parameters);
    }
  }, [fullDataset, results.timestamp, parameters, runCalculation]);

  return {
    isLoading,
    loadProgress,
    loadError,
    calculationResults: results,
    calculationParams: parameters,
    loadInitialData,
    runCalculation,
  };
};
