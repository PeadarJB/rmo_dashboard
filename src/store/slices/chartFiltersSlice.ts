// src/store/slices/chartFiltersSlice.ts
import { produce } from 'immer';
import type { SurveyYear } from '@/types/data';

// ============= TYPES =============

export type ChartMetric = 'percentage' | 'length' | 'cost';
export type ChartGroupBy = 'category' | 'county' | 'none';

export interface ChartFiltersState {
  // View settings
  metric: ChartMetric;
  
  // Time comparison
  primaryYear: SurveyYear;
  compareYear: SurveyYear | null;
  
  // Location filtering
  selectedCounties: string[];  // Empty = all counties
  
  // Display options
  sortBy: 'value' | 'alphabetical';
  sortOrder: 'asc' | 'desc';
  showTopN: number | null;  // null = show all
  groupBy: ChartGroupBy;
  
  // UI state
  isComparisonMode: boolean;
}

// ============= DEFAULTS =============

export const DEFAULT_CHART_FILTERS: ChartFiltersState = {
  metric: 'percentage',
  primaryYear: '2018',
  compareYear: null,
  selectedCounties: [],
  sortBy: 'value',
  sortOrder: 'desc',
  showTopN: null,
  groupBy: 'category',
  isComparisonMode: false,
};

// ============= ACTIONS =============

export interface ChartFiltersActions {
  // View actions
  setChartMetric: (metric: ChartMetric) => void;
  
  // Year actions
  setChartPrimaryYear: (year: SurveyYear) => void;
  setChartCompareYear: (year: SurveyYear | null) => void;
  toggleComparisonMode: () => void;
  
  // County actions
  setChartCounties: (counties: string[]) => void;
  addChartCounty: (county: string) => void;
  removeChartCounty: (county: string) => void;
  clearChartCounties: () => void;
  
  // Sort/display actions
  setChartSortBy: (sortBy: 'value' | 'alphabetical') => void;
  setChartSortOrder: (order: 'asc' | 'desc') => void;
  setChartTopN: (n: number | null) => void;
  setChartGroupBy: (groupBy: ChartGroupBy) => void;
  
  // Bulk actions
  resetChartFilters: () => void;
  setChartFiltersFromURL: (params: Partial<ChartFiltersState>) => void;
}

// ============= SELECTORS =============

export const chartFilterSelectors = {
  // Check if any filters are active
  hasActiveFilters: (state: ChartFiltersState): boolean => {
    return (
      state.selectedCounties.length > 0 ||
      state.compareYear !== null ||
      state.showTopN !== null ||
      state.metric !== DEFAULT_CHART_FILTERS.metric ||
      state.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear
    );
  },
  
  // Get active filter count for badge
  activeFilterCount: (state: ChartFiltersState): number => {
    let count = 0;
    if (state.selectedCounties.length > 0) count += state.selectedCounties.length;
    if (state.compareYear !== null) count++;
    if (state.showTopN !== null) count++;
    if (state.metric !== DEFAULT_CHART_FILTERS.metric) count++;
    if (state.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) count++;
    return count;
  },
  
  // Build URL query params
  toURLParams: (state: ChartFiltersState): URLSearchParams => {
    const params = new URLSearchParams();
    
    if (state.metric !== DEFAULT_CHART_FILTERS.metric) {
      params.set('metric', state.metric);
    }
    if (state.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) {
      params.set('year', state.primaryYear);
    }
    if (state.compareYear) {
      params.set('compare', state.compareYear);
    }
    if (state.selectedCounties.length > 0) {
      params.set('counties', state.selectedCounties.join(','));
    }
    if (state.sortBy !== DEFAULT_CHART_FILTERS.sortBy) {
      params.set('sort', state.sortBy);
    }
    if (state.sortOrder !== DEFAULT_CHART_FILTERS.sortOrder) {
      params.set('order', state.sortOrder);
    }
    if (state.showTopN !== null) {
      params.set('top', state.showTopN.toString());
    }
    if (state.groupBy !== DEFAULT_CHART_FILTERS.groupBy) {
      params.set('group', state.groupBy);
    }
    
    return params;
  },
  
  // Parse URL params to state
  fromURLParams: (params: URLSearchParams): Partial<ChartFiltersState> => {
    const state: Partial<ChartFiltersState> = {};
    
    const metric = params.get('metric') as ChartMetric;
    if (metric && ['percentage', 'length', 'cost'].includes(metric)) {
      state.metric = metric;
    }
    
    const year = params.get('year') as SurveyYear;
    if (year && ['2011', '2018', '2025'].includes(year)) {
      state.primaryYear = year;
    }
    
    const compare = params.get('compare') as SurveyYear;
    if (compare && ['2011', '2018', '2025'].includes(compare)) {
      state.compareYear = compare;
      state.isComparisonMode = true;
    }
    
    const counties = params.get('counties');
    if (counties) {
      state.selectedCounties = counties.split(',').filter(Boolean);
    }
    
    const sortBy = params.get('sort') as 'value' | 'alphabetical';
    if (sortBy && ['value', 'alphabetical'].includes(sortBy)) {
      state.sortBy = sortBy;
    }
    
    const sortOrder = params.get('order') as 'asc' | 'desc';
    if (sortOrder && ['asc', 'desc'].includes(sortOrder)) {
      state.sortOrder = sortOrder;
    }
    
    const topN = params.get('top');
    if (topN && !isNaN(Number(topN))) {
      state.showTopN = Number(topN);
    }
    
    const groupBy = params.get('group') as ChartGroupBy;
    if (groupBy && ['category', 'county', 'none'].includes(groupBy)) {
      state.groupBy = groupBy;
    }
    
    return state;
  },
};

// ============= CREATE ACTIONS =============

export const createChartFiltersActions = (set: any): ChartFiltersActions => ({
  // View actions
  setChartMetric: (metric) =>
    set(produce((state: any) => {
      state.chartFilters.metric = metric;
    })),
  
  // Year actions
  setChartPrimaryYear: (year) =>
    set(produce((state: any) => {
      state.chartFilters.primaryYear = year;
      // Clear comparison if same year
      if (state.chartFilters.compareYear === year) {
        state.chartFilters.compareYear = null;
        state.chartFilters.isComparisonMode = false;
      }
    })),
  
  setChartCompareYear: (year) =>
    set(produce((state: any) => {
      state.chartFilters.compareYear = year;
      state.chartFilters.isComparisonMode = year !== null;
    })),
  
  toggleComparisonMode: () =>
    set(produce((state: any) => {
      state.chartFilters.isComparisonMode = !state.chartFilters.isComparisonMode;
      if (!state.chartFilters.isComparisonMode) {
        state.chartFilters.compareYear = null;
      }
    })),
  
  // County actions
  setChartCounties: (counties) =>
    set(produce((state: any) => {
      state.chartFilters.selectedCounties = counties;
    })),
  
  addChartCounty: (county) =>
    set(produce((state: any) => {
      if (!state.chartFilters.selectedCounties.includes(county)) {
        state.chartFilters.selectedCounties.push(county);
      }
    })),
  
  removeChartCounty: (county) =>
    set(produce((state: any) => {
      state.chartFilters.selectedCounties = state.chartFilters.selectedCounties.filter(
        (c: string) => c !== county
      );
    })),
  
  clearChartCounties: () =>
    set(produce((state: any) => {
      state.chartFilters.selectedCounties = [];
    })),
  
  // Sort/display actions
  setChartSortBy: (sortBy) =>
    set(produce((state: any) => {
      state.chartFilters.sortBy = sortBy;
    })),
  
  setChartSortOrder: (order) =>
    set(produce((state: any) => {
      state.chartFilters.sortOrder = order;
    })),
  
  setChartTopN: (n) =>
    set(produce((state: any) => {
      state.chartFilters.showTopN = n;
    })),
  
  setChartGroupBy: (groupBy) =>
    set(produce((state: any) => {
      state.chartFilters.groupBy = groupBy;
    })),
  
  // Bulk actions
  resetChartFilters: () =>
    set(produce((state: any) => {
      state.chartFilters = { ...DEFAULT_CHART_FILTERS };
    })),
  
  setChartFiltersFromURL: (params) =>
    set(produce((state: any) => {
      Object.assign(state.chartFilters, params);
    })),
});

// ============= QUICK PRESETS =============

export const CHART_FILTER_PRESETS = {
  dublinRegion: {
    name: 'Dublin Region',
    counties: ['DCC', 'DLR', 'FL', 'SD'], // DCC stays, DLRD→DLR, FIN→FL, STHDUB→SD
  },
  cities: {
    name: 'Cities Only',  
    counties: ['CC', 'DCC', 'GC'], // CORKCITY→CC, DCC stays, GALCITY→GC
  },
  western: {
    name: 'Western Counties',
    counties: ['GY', 'MO', 'RN', 'SO', 'LM', 'DL'], // GAL→GY, MAY→MO, ROS→RN, SLI→SO, LEI→LM, DON→DL
  },
  topPopulated: {
    name: 'Top 5 by Population',
    counties: ['DCC', 'CK', 'GY', 'LK', 'KE'], // DCC stays, COR→CK, GAL→GY, LIM→LK, KIL→KE
  },
};