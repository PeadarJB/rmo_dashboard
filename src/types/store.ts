// src/types/store.ts
import type { 
  RoadSegmentData, 
  SummaryData, 
  DataLoadProgress,
  SurveyYear 
} from './data';
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
  fullDataset: RoadSegmentData[] | null;  // Updated to use new type
}

export interface UISlice {
  loadProgress: DataLoadProgress;
  loadError: string | null;
  isLoading: boolean;
}

export interface ParametersSlice {
  thresholds: Thresholds;
  costs: Costs;
  selectedYear: SurveyYear | 'both';  // Updated to use SurveyYear type
  selectedCounties: string[];         // Renamed from selectedAuthorities
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
  setFullDataset: (data: RoadSegmentData[] | null) => void;  // Updated type
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
  setSelectedYear: (year: SurveyYear | 'both') => void;  // Updated type
  setSelectedCounties: (counties: string[]) => void;      // Renamed
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
  selectedCountyNames: (state: AnalyticsState) => string[];  // Renamed
  
  // New selectors for working with the actual data structure
  getSegmentById: (state: AnalyticsState, id: number) => RoadSegmentData | undefined;
  getSegmentsByCounty: (state: AnalyticsState, county: string) => RoadSegmentData[];
  getSegmentsByRoad: (state: AnalyticsState, roadNumber: string) => RoadSegmentData[];
  hasDataForYear: (state: AnalyticsState, year: SurveyYear) => boolean;
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

// ============= HELPER TYPES =============

// For filtering segments
export interface SegmentFilter {
  counties?: string[];
  roadNumbers?: string[];
  year?: SurveyYear;
  hasValidData?: boolean;
}

// For aggregating statistics
export interface NetworkStatistics {
  totalSegments: number;
  totalLength: number;       // meters
  segmentsByCounty: Record<string, number>;
  segmentsByRoad: Record<string, number>;
  averageConditions: {
    [year in SurveyYear]: {
      iri: number;
      rut: number;
      psci: number;
      csc: number;
      mpd: number;
    } | null;
  };
}