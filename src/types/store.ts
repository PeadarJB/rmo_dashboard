import type { RoadSegment, SummaryData, DataLoadProgress } from './data';
import type { WorkerOutput, Thresholds, Costs } from './calculations';

/**
 * Defines the complete shape of the Zustand store, including both the
 * state properties and the action functions that operate on that state.
 * This central type provides type safety across the application wherever
 * the store is used.
 */
export interface AnalyticsState {
  // Data state
  summaryData: SummaryData | null;
  fullDataset: RoadSegment[] | null;
  loadProgress: DataLoadProgress;
  loadError: string | null;
  isLoading: boolean;

  // Calculation results
  results: {
    segments: WorkerOutput['segments'] | null;
    summary: WorkerOutput['summary'] | null;
    timestamp: number | null;
  };

  // Calculation parameters
  thresholds: Thresholds;
  costs: Costs;
  selectedYear: '2011' | '2018' | 'both';
  selectedAuthorities: string[];

  // Actions
  setSummaryData: (data: SummaryData | null) => void;
  setFullDataset: (data: RoadSegment[] | null) => void;
  setLoadProgress: (progress: DataLoadProgress) => void;
  setLoadError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  clearData: () => void;

  setCalculationResults: (results: AnalyticsState['results']) => void;
  clearCalculationResults: () => void;

  updateThresholds: (newThresholds: Partial<Thresholds>) => void;
  updateCosts: (newCosts: Partial<Costs>) => void;
  setSelectedYear: (year: '2011' | '2018' | 'both') => void;
  setSelectedAuthorities: (authorities: string[]) => void;
  resetParameters: () => void;
}

