// src/store/useAnalyticsStore.ts
import { create } from 'zustand';
import { produce } from 'immer';
import type { 
  AnalyticsState, 
  InitialStateValues,
  SetCalculationResultsPayload,
  LoginPayload 
} from '@/types/store';
import type { SurveyYear } from '@/types/data';
import { DEFAULT_THRESHOLDS, DEFAULT_COSTS } from '@/types/calculations';
import { 
  ChartFiltersState, 
  ChartFiltersActions,
  DEFAULT_CHART_FILTERS,
  createChartFiltersActions 
} from './slices/chartFiltersSlice';

// ============= EXTENDED STATE INTERFACE =============
export interface ExtendedAnalyticsState extends AnalyticsState, ChartFiltersActions {
  chartFilters: ChartFiltersState;
}

// Define the initial nested state structure
const initialState: InitialStateValues & { chartFilters: ChartFiltersState } = {
  data: {
    summaryData: null,
    fullDataset: null,
  },
  ui: {
    loadProgress: { 
      stage: 'idle' as const,
      summaryLoaded: false, 
      fullLoaded: false, 
      progress: 0 
    },
    loadError: null,
    isLoading: false,
  },
  parameters: {
    thresholds: DEFAULT_THRESHOLDS,
    costs: DEFAULT_COSTS,
    selectedYear: '2018' as SurveyYear,
    selectedCounties: [],
  },
  cache: {
    results: {
      segments: null,
      summary: null,
      timestamp: null,
      calculationId: null,
    },
  },
  // MODIFIED: User slice for new auth flow
  user: {
    isAuthenticated: false,
    profile: null,
    idToken: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    preferences: {},
  },
  chartFilters: DEFAULT_CHART_FILTERS,
};

export const useAnalyticsStore = create<ExtendedAnalyticsState>((set) => ({
  // ============= STATE =============
  ...initialState,

  // ============= DATA ACTIONS =============
  setSummaryData: (data) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.data.summaryData = data;
      }),
    ),

  setFullDataset: (data) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.data.fullDataset = data;
      }),
    ),

  clearData: () =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.data.summaryData = null;
        state.data.fullDataset = null;
        state.ui.loadError = null;
        state.ui.loadProgress = {
          stage: 'idle' as const,
          summaryLoaded: false,
          fullLoaded: false,
          progress: 0,
        };
        state.ui.isLoading = false;
      }),
    ),

  // ============= UI ACTIONS =============
  setLoadProgress: (progress) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.ui.loadProgress = progress;
      }),
    ),

  setLoadError: (error) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.ui.loadError = error;
      }),
    ),

  setIsLoading: (loading) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.ui.isLoading = loading;
      }),
    ),

  // ============= CALCULATION ACTIONS =============
  setCalculationResults: (payload: SetCalculationResultsPayload) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.cache.results = {
          segments: payload.segments,
          summary: payload.summary,
          timestamp: payload.timestamp,
          calculationId: payload.calculationId,
        };
      }),
    ),

  clearCalculationResults: () =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.cache.results = {
          segments: null,
          summary: null,
          timestamp: null,
          calculationId: null,
        };
      }),
    ),

  // ============= PARAMETER ACTIONS =============
  updateThresholds: (newThresholds) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        Object.keys(newThresholds).forEach((key) => {
          const thresholdKey = key as keyof typeof newThresholds;
          if (newThresholds[thresholdKey]) {
            Object.assign(
              state.parameters.thresholds[thresholdKey],
              newThresholds[thresholdKey],
            );
          }
        });
      }),
    ),

  updateCosts: (newCosts) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        Object.assign(state.parameters.costs, newCosts);
      }),
    ),

  setSelectedYear: (year) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.parameters.selectedYear = year;
      }),
    ),

  setSelectedCounties: (counties) =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.parameters.selectedCounties = counties;
      }),
    ),

  resetParameters: () =>
    set(
      produce((state: ExtendedAnalyticsState) => {
        state.parameters = {
          thresholds: DEFAULT_THRESHOLDS,
          costs: DEFAULT_COSTS,
          selectedYear: '2018' as SurveyYear,
          selectedCounties: [],
        };
      }),
    ),

  // ============= USER ACTIONS (REWRITTEN) =============
  login: (payload: LoginPayload) =>
    set(produce((state: ExtendedAnalyticsState) => {
      state.user.isAuthenticated = true;
      state.user.profile = payload.profile;
      state.user.idToken = payload.idToken;
      state.user.accessToken = payload.accessToken;
      state.user.refreshToken = payload.refreshToken;
      state.user.expiresAt = payload.expiresAt;
    })),

  logout: () =>
    set(produce((state: ExtendedAnalyticsState) => {
      state.user.isAuthenticated = false;
      state.user.profile = null;
      state.user.idToken = null;
      state.user.accessToken = null;
      state.user.refreshToken = null;
      state.user.expiresAt = null;
    })),
  
  updatePreferences: (preferences) =>
    set(produce((state: ExtendedAnalyticsState) => {
      Object.assign(state.user.preferences, preferences);
    })),

  // ============= CHART FILTER ACTIONS =============
  ...createChartFiltersActions(set),
}));

// ============= SELECTORS =============
export const selectors = {
  // Existing selectors
  hasData: (state: ExtendedAnalyticsState) => 
    !!(state.data.summaryData || state.data.fullDataset),
  
  isReady: (state: ExtendedAnalyticsState) => 
    !!state.data.fullDataset && !state.ui.isLoading,
  
  totalSegments: (state: ExtendedAnalyticsState) => 
    state.data.fullDataset?.length ?? 0,
  
  totalCost2018: (state: ExtendedAnalyticsState) => 
    state.cache.results.summary?.['2018']?.total_cost ?? null,
  
  getSegmentById: (state: ExtendedAnalyticsState, id: number) =>
    state.data.fullDataset?.find(seg => seg.id === id),
  
  getSegmentsByCounty: (state: ExtendedAnalyticsState, county: string) =>
    state.data.fullDataset?.filter(seg => seg.county === county) ?? [],
  
  getSegmentsByRoad: (state: ExtendedAnalyticsState, roadNumber: string) =>
    state.data.fullDataset?.filter(seg => seg.roadNumber === roadNumber) ?? [],
  
  // New chart filter selectors
  hasActiveChartFilters: (state: ExtendedAnalyticsState) => {
    const filters = state.chartFilters;
    return (
      filters.selectedCounties.length > 0 ||
      filters.compareYear !== null ||
      filters.showTopN !== null ||
      filters.metric !== DEFAULT_CHART_FILTERS.metric ||
      filters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear
    );
  },
  
  activeChartFilterCount: (state: ExtendedAnalyticsState) => {
    const filters = state.chartFilters;
    let count = 0;
    if (filters.selectedCounties.length > 0) count += filters.selectedCounties.length;
    if (filters.compareYear !== null) count++;
    if (filters.showTopN !== null) count++;
    if (filters.metric !== DEFAULT_CHART_FILTERS.metric) count++;
    if (filters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) count++;
    return count;
  },
  
  // Combined selector for chart data fetching
  getChartData: (state: ExtendedAnalyticsState) => {
    const { chartFilters, cache } = state;
    
    // Return filtered/sorted data based on chartFilters
    if (!cache.results.segments) return null;
    
    let segments = [...cache.results.segments];
    
    // Filter by counties if specified
    if (chartFilters.selectedCounties.length > 0) {
      segments = segments.filter(s => 
        chartFilters.selectedCounties.includes(s.county)
      );
    }
    
    // Return data for the selected year(s)
    return {
      segments,
      primaryYear: chartFilters.primaryYear,
      compareYear: chartFilters.compareYear,
      metric: chartFilters.metric,
    };
  },
};