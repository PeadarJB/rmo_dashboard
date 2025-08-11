import { create } from 'zustand';
import { produce } from 'immer';
import type { RoadSegment, SummaryData, DataLoadProgress } from '@/types/data';
import {
  DEFAULT_PARAMS,
  Thresholds,
  Costs,
} from '@/types/calculations';
import type { AnalyticsState } from '@/types';

// Define the initial state with a flat structure
const initialState = {
  summaryData: null,
  fullDataset: null,
  loadProgress: { stage: 'idle', summaryLoaded: false, fullLoaded: false, progress: 0 },
  loadError: null,
  isLoading: false,
  results: {
    segments: null,
    summary: null,
    timestamp: null,
  },
  thresholds: DEFAULT_PARAMS.thresholds,
  costs: DEFAULT_PARAMS.costs,
  selectedYear: DEFAULT_PARAMS.selectedYear,
  selectedAuthorities: [],
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  ...initialState,

  // Data Actions
  setSummaryData: (data: SummaryData | null) => set({ summaryData: data }),
  setFullDataset: (data: RoadSegment[] | null) => set({ fullDataset: data }),
  setLoadProgress: (progress: DataLoadProgress) => set({ loadProgress: progress }),
  setLoadError: (error: string | null) => set({ loadError: error }),
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),
  clearData: () => set({
    summaryData: initialState.summaryData,
    fullDataset: initialState.fullDataset,
    loadError: initialState.loadError,
    loadProgress: initialState.loadProgress,
    isLoading: initialState.isLoading,
  }),

  // Calculation Actions
  setCalculationResults: (results: AnalyticsState['results']) => set({ results }),
  clearCalculationResults: () => set({ results: initialState.results }),

  // Parameter Actions
  // Using Immer for safe nested updates
  updateThresholds: (newThresholds: Partial<Thresholds>) =>
    set(produce((state: AnalyticsState) => {
      // Safely merge partial threshold updates
      for (const key of Object.keys(newThresholds) as Array<keyof Thresholds>) {
        if (state.thresholds[key] && newThresholds[key]) {
          // Use Object.assign for a shallow merge of the inner object
          Object.assign(state.thresholds[key], newThresholds[key]);
        }
      }
    })),
  updateCosts: (newCosts: Partial<Costs>) =>
    set((state: AnalyticsState) => ({ costs: { ...state.costs, ...newCosts } })),
  setSelectedYear: (year: '2011' | '2018' | 'both') => set({ selectedYear: year }),
  setSelectedAuthorities: (authorities: string[]) =>
    set({ selectedAuthorities: authorities }),
  resetParameters: () =>
    set({
      thresholds: initialState.thresholds,
      costs: initialState.costs,
      selectedYear: initialState.selectedYear,
      selectedAuthorities: initialState.selectedAuthorities,
    }),
}));
