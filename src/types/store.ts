// src/types/store.ts
import type { RoadSegment, SummaryData, DataLoadProgress } from './data';
import type { 
  Thresholds, 
  Costs, 
  CalculationResults,
  CalculatedRoadSegment,
  CalculationSummary 
} from './calculations';

// ============= SLICE INTERFACES =============

export interface DataSlice {
  summaryData: SummaryData | null;
  fullDataset: RoadSegment[] | null;
}

export interface UISlice {
  loadProgress: DataLoadProgress;
  loadError: string | null;
  isLoading: boolean;
}

export interface ParametersSlice {
  thresholds: Thresholds;
  costs: Costs;
  selectedYear: '2011' | '2018' | 'both';
  selectedAuthorities: string[];
}

export interface CacheSlice {
  results: CalculationResults;
}

export interface UserSlice {
  isAuthenticated: boolean;
  preferences: {
    theme?: 'light' | 'dark';
    defaultView?: 'map' | 'table';
  };
}

// ============= MAIN STATE INTERFACE =============

export interface AnalyticsState {
  // Nested state structure
  data: DataSlice;
  ui: UISlice;
  parameters: ParametersSlice;
  cache: CacheSlice;
  user: UserSlice;

  // ============= DATA ACTIONS =============
  setSummaryData: (data: SummaryData | null) => void;
  setFullDataset: (data: RoadSegment[] | null) => void;
  clearData: () => void;

  // ============= UI ACTIONS =============
  setLoadProgress: (progress: DataLoadProgress) => void;
  setLoadError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;

  // ============= CALCULATION ACTIONS =============
  setCalculationResults: (results: {
    segments: CalculatedRoadSegment[];
    summary: CalculationSummary;
    timestamp: number;
    calculationId: string;
  }) => void;
  clearCalculationResults: () => void;

  // ============= PARAMETER ACTIONS =============
  updateThresholds: (thresholds: Partial<Thresholds>) => void;
  updateCosts: (costs: Partial<Costs>) => void;
  setSelectedYear: (year: '2011' | '2018' | 'both') => void;
  setSelectedAuthorities: (authorities: string[]) => void;
  resetParameters: () => void;

  // ============= USER ACTIONS (placeholder) =============
  setAuthenticated: (authenticated: boolean) => void;
  updatePreferences: (preferences: Partial<UserSlice['preferences']>) => void;
}

// ============= COMPUTED SELECTORS (for future use) =============

export interface AnalyticsSelectors {
  // Derived state selectors
  hasData: (state: AnalyticsState) => boolean;
  isReady: (state: AnalyticsState) => boolean;
  totalSegments: (state: AnalyticsState) => number;
  totalCost2018: (state: AnalyticsState) => number | null;
  selectedAuthorityNames: (state: AnalyticsState) => string[];
}

// ============= ACTION PAYLOAD TYPES =============

export type SetCalculationResultsPayload = {
  segments: CalculatedRoadSegment[];
  summary: CalculationSummary;
  timestamp: number;
  calculationId: string;
};

// ============= INITIAL STATE HELPER TYPE =============

export interface InitialStateValues {
  data: DataSlice;
  ui: UISlice;
  parameters: ParametersSlice;
  cache: CacheSlice;
  user: UserSlice;
}