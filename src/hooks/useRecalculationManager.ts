// src/hooks/useRecalculationManager.ts
import { useEffect } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useCalculation } from './useCalculation';
import { logger } from '@/utils/logger';

export const useRecalculationManager = () => {
  const { calculate, isCalculating } = useCalculation();
  const fullDataset = useAnalyticsStore((state) => state.data.fullDataset);
  const thresholds = useAnalyticsStore((state) => state.parameters.thresholds);
  const costs = useAnalyticsStore((state) => state.parameters.costs);
  const setIsLoading = useAnalyticsStore((state) => state.setIsLoading);

  useEffect(() => {
    setIsLoading(isCalculating);
  }, [isCalculating, setIsLoading]);

  useEffect(() => {
    if (fullDataset && fullDataset.length > 0) {
      logger.info('RecalculationManager', 'Parameters changed, triggering recalculation.');
      calculate(fullDataset);
    }
  }, [thresholds, costs, fullDataset, calculate]);
};