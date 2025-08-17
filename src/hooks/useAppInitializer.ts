import { useState, useEffect } from 'react';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { dataLoader } from '@/services/dataLoader';
import { useCalculation } from './useCalculation';
import { logger } from '@/utils/logger';

/**
 * This hook manages the initial data loading and calculation process
 * that runs once after a user is authenticated.
 */
export const useAppInitializer = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('Initializing application...');

  const isAuthenticated = useAnalyticsStore((state) => state.user.isAuthenticated);
  const hasData = useAnalyticsStore((state) => !!state.data.fullDataset);
  const setSummaryData = useAnalyticsStore((state) => state.setSummaryData);
  const setFullDataset = useAnalyticsStore((state) => state.setFullDataset);
  const { calculate } = useCalculation();

  useEffect(() => {
    const initialize = async () => {
      if (!isAuthenticated || hasData) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        setProgressMessage('Loading network data...');
        logger.info('Initializer', 'Starting two-stage data load.');
        const { summary, full } = await dataLoader.loadTwoStage((progress) => {
          setProgressMessage(`Loading data: ${Math.round(progress.progress)}%`);
        });
        setSummaryData(summary);
        setFullDataset(full);
        logger.info('Initializer', 'Data loading complete.');

        setProgressMessage('Analyzing network conditions...');
        logger.info('Initializer', 'Starting initial calculation.');
        
        // Pass the freshly loaded 'full' dataset directly to the calculate function.
        await calculate(full); 
        
        logger.info('Initializer', 'Initial calculation complete.');

        setProgressMessage('Ready');
        setIsLoading(false);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during initialization.';
        logger.error('Initializer', 'Initialization failed', { error: errorMessage });
        setError(errorMessage);
        setIsLoading(false);
      }
    };

    initialize();
  }, [isAuthenticated, hasData, setSummaryData, setFullDataset, calculate]);

  return { isLoading, error, progressMessage };
};