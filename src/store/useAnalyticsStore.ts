import { RoadSegment, SummaryData, DataLoadProgress } from '@/types/data';
import { create } from 'zustand';
import { 
  CalculatedRoadSegment, 
  CalculationSummary,
  CalculationParams,
  DEFAULT_PARAMS 
} from '@/types/calculations';

interface DataState {
  summaryData: SummaryData | null;
  fullDataset: RoadSegment[] | null;
  loadProgress: DataLoadProgress;
  loadError: string | null;
  isLoading: boolean;
}

interface CalculationState {
  results: {
    segments: CalculatedRoadSegment[] | null;
    summary: CalculationSummary | null;
    timestamp: number | null;
  };
}

interface ParameterState {
  thresholds: CalculationParams['thresholds'];
  costs: CalculationParams['costs'];
  selectedYear: '2011' | '2018' | 'both';
  selectedAuthorities: string[];
}

interface AnalyticsState {
  data: DataState;
  calculation: CalculationState;
  parameters: ParameterState;
  
  // Data Actions
  setSummaryData: (data: SummaryData) => void;
  setFullDataset: (data: RoadSegment[]) => void;
  setLoadProgress: (progress: DataLoadProgress) => void;
  setLoadError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  clearData: () => void;
  
  // Calculation Actions
  setCalculationResults: (results: {
    segments: CalculatedRoadSegment[];
    summary: CalculationSummary;
    timestamp: number;
  }) => void;
  clearCalculationResults: () => void;
  
  // Parameter Actions
  updateThresholds: (thresholds: Partial<CalculationParams['thresholds']>) => void;
  updateCosts: (costs: Partial<CalculationParams['costs']>) => void;
  setSelectedYear: (year: '2011' | '2018' | 'both') => void;
  setSelectedAuthorities: (authorities: string[]) => void;
  resetParameters: () => void;
}

const initialDataState: DataState = {
  summaryData: null,
  fullDataset: null,
  loadProgress: { stage: 'idle', summaryLoaded: false, fullLoaded: false, progress: 0 },
  loadError: null,
  isLoading: false,
};

const initialCalculationState: CalculationState = {
  results: {
    segments: null,
    summary: null,
    timestamp: null,
  },
};

const initialParameterState: ParameterState = {
  thresholds: DEFAULT_PARAMS.thresholds,
  costs: DEFAULT_PARAMS.costs,
  selectedYear: DEFAULT_PARAMS.selectedYear,
  selectedAuthorities: [],
};

export const useAnalyticsStore = create<AnalyticsState>((set) => ({
  data: initialDataState,
  calculation: initialCalculationState,
  parameters: initialParameterState,

  // Data Actions
  setSummaryData: (data) => set((state) => ({ data: { ...state.data, summaryData: data } })),
  setFullDataset: (data) => set((state) => ({ data: { ...state.data, fullDataset: data } })),
  setLoadProgress: (progress) => set((state) => ({ data: { ...state.data, loadProgress: progress } })),
  setLoadError: (error) => set((state) => ({ data: { ...state.data, loadError: error } })),
  setIsLoading: (loading) => set((state) => ({ data: { ...state.data, isLoading: loading } })),
  clearData: () => set({ data: initialDataState }),

  // Calculation Actions
  setCalculationResults: (results) => set((state) => ({ calculation: { ...state.calculation, results } })),
  clearCalculationResults: () => set({ calculation: initialCalculationState }),

  // Parameter Actions
  updateThresholds: (thresholds) =>
    set((state) => ({
      parameters: { ...state.parameters, thresholds: { ...state.parameters.thresholds, ...thresholds } },
    })),
  updateCosts: (costs) =>
    set((state) => ({
      parameters: { ...state.parameters, costs: { ...state.parameters.costs, ...costs } },
    })),
  setSelectedYear: (year) => set((state) => ({ parameters: { ...state.parameters, selectedYear: year } })),
  setSelectedAuthorities: (authorities) => set((state) => ({ parameters: { ...state.parameters, selectedAuthorities: authorities } })),
  resetParameters: () => set({ parameters: initialParameterState }),
}));
