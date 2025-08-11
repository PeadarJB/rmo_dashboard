// src/types/calculations.ts
import { RoadSegment } from './data';

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
  selectedYear: '2011' | '2018' | 'both';
  localAuthorities?: string[]; // Filter by LA if provided
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

// Calculated types
export interface CalculatedConditions {
  year: number;
  iri: number;
  rut: number;
  psci: number;
  csc: number;
  mpd: number;
  category: MaintenanceCategory | null;
  sqm: number;
  cost: number;
}

export interface CalculatedRoadSegment extends Omit<RoadSegment, 'conditions_2011' | 'conditions_2018'> {
  conditions_2011: CalculatedConditions;
  conditions_2018: CalculatedConditions;
}

export interface CategorySummary {
  total_length_m: number;
  total_cost: number;
  segment_count: number;
  percentage: number;
}

export interface YearSummary {
  total_cost: number;
  total_length_m: number;
  total_segments: number;
  by_category: Record<MaintenanceCategory, CategorySummary>;
  by_la: Record<string, {
    total_cost: number;
    total_length_m: number;
    segment_count: number;
  }>;
}

export interface CalculationSummary {
  '2011': YearSummary;
  '2018': YearSummary;
}

export interface WorkerOutput {
  segments: CalculatedRoadSegment[];
  summary: CalculationSummary;
  calculationId: string;
  timestamp: number;
}

export interface WorkerProgress {
  current: number;
  total: number;
  percentage: number;
  stage: 'preparing' | 'calculating' | 'aggregating' | 'complete';
  message: string;
}