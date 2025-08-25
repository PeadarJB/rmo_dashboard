// src/types/store.ts
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
import type {
  ChartFiltersState,
  ChartMetric,
  ChartGroupBy,
} from '@/store/slices/chartFiltersSlice';

// ============= NEW: USER PROFILE AND AUTH PAYLOAD TYPES =============
export interface UserProfile {
  email: string;
  name?: string;
  groups?: string[];
}

export interface LoginPayload {
  profile: UserProfile;
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

// ============= SLICE INTERFACES =============

export interface DataSlice {
  summaryData: SummaryData | null;
  fullDataset: RoadSegmentData[] | null;
}

export interface UISlice {
  loadProgress: DataLoadProgress;
  loadError: string | null;
  isLoading: boolean;
}

export interface ParametersSlice {
  thresholds: Thresholds;
  costs: Costs;
  selectedYear: SurveyYear | 'both';
  selectedCounties: string[];
}

export interface CacheSlice {
  results: CalculationResults;
}

// MODIFIED: UserSlice to handle new auth state
export interface UserSlice {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  idToken: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  preferences: {
    theme?: 'light' | 'dark';
    defaultView?: 'map' | 'table';
  };
}

// ============= NEW: CHART FILTERS SLICE =============

export interface ChartFiltersSlice {
  chartFilters: ChartFiltersState;
}

// ============= MAIN STATE INTERFACE =============

export interface AnalyticsState {
  // Nested state structure
  data: DataSlice;
  ui: UISlice;
  parameters: ParametersSlice;
  cache: CacheSlice;
  user: UserSlice;
  chartFilters: ChartFiltersState;

  // ============= DATA ACTIONS =============
  setSummaryData: (data: SummaryData | null) => void;
  setFullDataset: (data: RoadSegmentData[] | null) => void;
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
  setSelectedYear: (year: SurveyYear | 'both') => void;
  setSelectedCounties: (counties: string[]) => void;
  resetParameters: () => void;

  // ============= MODIFIED: USER ACTIONS =============
  login: (payload: LoginPayload) => void;
  logout: () => void;
  updatePreferences: (preferences: Partial<UserSlice['preferences']>) => void;

  // ============= CHART FILTER ACTIONS =============
  setChartMetric: (metric: ChartMetric) => void;
  setChartPrimaryYear: (year: SurveyYear) => void;
  setChartCompareYear: (year: SurveyYear | null) => void;
  toggleComparisonMode: () => void;
  setChartCounties: (counties: string[]) => void;
  addChartCounty: (county: string) => void;
  removeChartCounty: (county: string) => void;
  clearChartCounties: () => void;
  setChartSortBy: (sortBy: 'value' | 'alphabetical') => void;
  setChartSortOrder: (order: 'asc' | 'desc') => void;
  setChartTopN: (n: number | null) => void;
  setChartGroupBy: (groupBy: ChartGroupBy) => void;
  resetChartFilters: () => void;
  setChartFiltersFromURL: (params: Partial<ChartFiltersState>) => void;
}

// ============= (rest of the file remains the same) =============

// ============= COMPUTED SELECTORS =============

export interface AnalyticsSelectors {
  // Existing selectors
  hasData: (state: AnalyticsState) => boolean;
  isReady: (state: AnalyticsState) => boolean;
  totalSegments: (state: AnalyticsState) => number;
  totalCost2018: (state: AnalyticsState) => number | null;
  selectedCountyNames: (state: AnalyticsState) => string[];
  getSegmentById: (state: AnalyticsState, id: number) => RoadSegmentData | undefined;
  getSegmentsByCounty: (state: AnalyticsState, county: string) => RoadSegmentData[];
  getSegmentsByRoad: (state: AnalyticsState, roadNumber: string) => RoadSegmentData[];
  hasDataForYear: (state: AnalyticsState, year: SurveyYear) => boolean;
  
  // New chart filter selectors
  hasActiveChartFilters: (state: AnalyticsState) => boolean;
  activeChartFilterCount: (state: AnalyticsState) => number;
  getChartDataForYear: (state: AnalyticsState, year: SurveyYear) => CalculatedRoadSegment[];
  getFilteredChartData: (state: AnalyticsState) => {
    segments: CalculatedRoadSegment[];
    primaryYear: SurveyYear;
    compareYear: SurveyYear | null;
    metric: ChartMetric;
  } | null;
  buildChartURLParams: (state: AnalyticsState) => URLSearchParams;
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
  chartFilters: ChartFiltersState;
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
  totalLength: number;
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

// ============= CHART SPECIFIC TYPES =============

export interface ChartDataPoint {
  label: string;
  value: number;
  percentage?: number;
  color?: string;
  metadata?: {
    county?: string;
    category?: string;
    year?: SurveyYear;
    count?: number;
  };
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
}

export interface ChartConfiguration {
  type: 'bar' | 'line' | 'pie' | 'doughnut';
  datasets: ChartDataset[];
  labels: string[];
  options?: Record<string, any>;
}

// ============= FILTER CHIP TYPES =============

export interface FilterChip {
  id: string;
  type: 'metric' | 'year' | 'county' | 'comparison' | 'sort' | 'limit';
  label: string;
  value: string | number;
  removable: boolean;
  onRemove?: () => void;
}

// ============= URL SYNC TYPES =============

export interface URLSyncConfig {
  paramName: string;
  storeKey: keyof ChartFiltersState;
  transformer?: (value: string) => any;
  validator?: (value: any) => boolean;
}