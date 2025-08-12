// src/types/calculations.ts
import type { RoadSegmentData, RoadConditions, SurveyYear } from './data';

export type MaintenanceCategory =
  | 'Road Reconstruction'
  | 'Structural Overlay'
  | 'Surface Restoration'
  | 'Restoration of Skid Resistance'
  | 'Routine Maintenance';

export interface Thresholds {
  reconstruction: { iri: number; rut: number; psci: number };
  overlay: { iri: number; rut: number; psci: number };
  restoration: { psci_lower: number; psci_upper: number; iri: number };
  skid: { psci_lower: number; psci_upper: number; csc: number; mpd: number };
}

export interface Costs {
  reconstruction: number; // RR in €/sqm
  overlay: number;        // SO in €/sqm
  restoration: number;    // SR in €/sqm
  skid: number;           // RS in €/sqm
  routine: number;        // RM in €/sqm
}

export interface CalculationParams {
  thresholds: Thresholds;
  costs: Costs;
  selectedYear: SurveyYear | 'both';  // Updated to use SurveyYear type
  localAuthorities?: string[];         // Filter by county codes if provided
}

// Default values derived from the 2018 report and dashboard
export const DEFAULT_THRESHOLDS: Thresholds = {
  reconstruction: { iri: 12, rut: 40, psci: 2 },
  overlay: { iri: 7, rut: 20, psci: 4 },
  restoration: { psci_lower: 5, psci_upper: 6, iri: 6 },
  skid: { psci_lower: 7, psci_upper: 8, csc: 0.35, mpd: 0.7 },
};

export const DEFAULT_COSTS: Costs = {
  reconstruction: 60,
  overlay: 40,
  restoration: 15,
  skid: 5,
  routine: 1,
};

export const DEFAULT_PARAMS: CalculationParams = {
  thresholds: DEFAULT_THRESHOLDS,
  costs: DEFAULT_COSTS,
  selectedYear: '2018',
};

// Calculated conditions - extends base conditions with calculated fields
export interface CalculatedConditions extends RoadConditions {
  category: MaintenanceCategory;  // No longer nullable after calculation
  cost: number;                    // Calculated cost for this segment/year
}

// Calculated segment - modifies the data record to have calculated conditions
export interface CalculatedRoadSegment extends Omit<RoadSegmentData, 'data'> {
  data: {
    "2011": CalculatedConditions | null;
    "2018": CalculatedConditions | null;
    "2025": CalculatedConditions | null;
  };
}

// Summary statistics for a category
export interface CategorySummary {
  total_length_m: number;  // Total length in meters (count * 100)
  total_cost: number;      // Total cost in euros
  segment_count: number;   // Number of segments
  percentage: number;      // Percentage of total network
}

// Summary for a single year
export interface YearSummary {
  total_cost: number;
  total_length_m: number;
  total_segments: number;
  by_category: Record<MaintenanceCategory, CategorySummary>;
  by_county: Record<string, {  // Changed from by_la to by_county for clarity
    total_cost: number;
    total_length_m: number;
    segment_count: number;
  }>;
}

// Complete calculation summary
export interface CalculationSummary {
  '2011': YearSummary;
  '2018': YearSummary;
  '2025': YearSummary;  // Ready for future data
}

// This is what the worker produces
export interface WorkerOutput {
  segments: CalculatedRoadSegment[];
  summary: CalculationSummary;
  calculationId: string;
  timestamp: number;
}

// This is what gets stored in the store's cache
export interface CalculationResults {
  segments: CalculatedRoadSegment[] | null;
  summary: CalculationSummary | null;
  timestamp: number | null;
  calculationId: string | null;
}

// Worker progress reporting
export interface WorkerProgress {
  current: number;
  total: number;
  percentage: number;
  stage: 'preparing' | 'calculating' | 'aggregating' | 'complete';
  message: string;
}

// Helper type for year-specific calculations
export type YearCalculation = {
  year: SurveyYear;
  conditions: RoadConditions;
  category: MaintenanceCategory;
  cost: number;
};