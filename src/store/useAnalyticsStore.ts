// src/store/useAnalyticsStore.ts
import { create } from 'zustand';
import { produce } from 'immer';
import type { 
  AnalyticsState, 
  InitialStateValues,
  SetCalculationResultsPayload 
} from '@/types/store';
import type { SurveyYear } from '@/types/data';
import { DEFAULT_THRESHOLDS, DEFAULT_COSTS } from '@/types/calculations';

// Define the initial nested state structure
const initialState: InitialStateValues = {
  data: {
    summaryData: null,
    fullDataset: null,
  },
  ui: {
    loadProgress: { 
      stage: 'idle' as const,  // Enforce literal type
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
    selectedYear: '2018' as SurveyYear,  // Using SurveyYear type
    selectedCounties: [],  // Renamed from selectedAuthorities
  },
  cache: {
    results: {
      segments: null,
      summary: null,
      timestamp: null,
      calculationId: null,
    },
  },
  user: {
    isAuthenticated: false,
    preferences: {},
  },
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  // ============= STATE =============
  ...initialState,

  // ============= DATA ACTIONS =============
  setSummaryData: (data) =>
    set(produce((state: AnalyticsState) => {
      state.data.summaryData = data;
    })),

  setFullDataset: (data) =>
    set(produce((state: AnalyticsState) => {
      state.data.fullDataset = data;
    })),

  clearData: () =>
    set(produce((state: AnalyticsState) => {
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
    })),

  // ============= UI ACTIONS =============
  setLoadProgress: (progress) =>
    set(produce((state: AnalyticsState) => {
      state.ui.loadProgress = progress;
    })),

  setLoadError: (error) =>
    set(produce((state: AnalyticsState) => {
      state.ui.loadError = error;
    })),

  setIsLoading: (loading) =>
    set(produce((state: AnalyticsState) => {
      state.ui.isLoading = loading;
    })),

  // ============= CALCULATION ACTIONS =============
  setCalculationResults: (payload: SetCalculationResultsPayload) =>
    set(produce((state: AnalyticsState) => {
      state.cache.results = {
        segments: payload.segments,
        summary: payload.summary,
        timestamp: payload.timestamp,
        calculationId: payload.calculationId,
      };
    })),

  clearCalculationResults: () =>
    set(produce((state: AnalyticsState) => {
      state.cache.results = {
        segments: null,
        summary: null,
        timestamp: null,
        calculationId: null,
      };
    })),

  // ============= PARAMETER ACTIONS =============
  updateThresholds: (newThresholds) =>
    set(produce((state: AnalyticsState) => {
      // Deep merge each threshold category
      Object.keys(newThresholds).forEach((key) => {
        const thresholdKey = key as keyof typeof newThresholds;
        if (newThresholds[thresholdKey]) {
          Object.assign(
            state.parameters.thresholds[thresholdKey],
            newThresholds[thresholdKey]
          );
        }
      });
    })),

  updateCosts: (newCosts) =>
    set(produce((state: AnalyticsState) => {
      Object.assign(state.parameters.costs, newCosts);
    })),

  setSelectedYear: (year) =>
    set(produce((state: AnalyticsState) => {
      state.parameters.selectedYear = year;
    })),

  setSelectedCounties: (counties) =>  // Renamed from setSelectedAuthorities
    set(produce((state: AnalyticsState) => {
      state.parameters.selectedCounties = counties;
    })),

  resetParameters: () =>
    set(produce((state: AnalyticsState) => {
      state.parameters = {
        thresholds: DEFAULT_THRESHOLDS,
        costs: DEFAULT_COSTS,
        selectedYear: '2018' as SurveyYear,
        selectedCounties: [],
      };
    })),

  // ============= USER ACTIONS (placeholder) =============
  setAuthenticated: (authenticated) =>
    set(produce((state: AnalyticsState) => {
      state.user.isAuthenticated = authenticated;
    })),

  updatePreferences: (preferences) =>
    set(produce((state: AnalyticsState) => {
      Object.assign(state.user.preferences, preferences);
    })),
}));

// ============= SELECTORS (optional, for complex derived state) =============
export const selectors = {
  hasData: (state: AnalyticsState) => 
    !!(state.data.summaryData || state.data.fullDataset),
  
  isReady: (state: AnalyticsState) => 
    !!state.data.fullDataset && !state.ui.isLoading,
  
  totalSegments: (state: AnalyticsState) => 
    state.data.fullDataset?.length ?? 0,
  
  totalCost2018: (state: AnalyticsState) => 
    state.cache.results.summary?.['2018']?.total_cost ?? null,
  
  // New selectors for the actual data structure
  getSegmentById: (state: AnalyticsState, id: number) =>
    state.data.fullDataset?.find(seg => seg.id === id),
  
  getSegmentsByCounty: (state: AnalyticsState, county: string) =>
    state.data.fullDataset?.filter(seg => seg.county === county) ?? [],
  
  getSegmentsByRoad: (state: AnalyticsState, roadNumber: string) =>
    state.data.fullDataset?.filter(seg => seg.roadNumber === roadNumber) ?? [],
};