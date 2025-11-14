// src/types/data.ts

// Survey year keys as they appear in the JSON
export type SurveyYear = "2011" | "2018" | "2025";

// Road conditions for a specific year - all fields nullable to match actual data
export interface RoadConditions {
  iri: number | null;
  rut: number | null;
  psci: number | null;
  csc: number | null;
  mpd: number | null;
  width: number;
  category: string | null;  // Always null in source, but ready for calculations
  sqm: number;
}

// Main segment structure - exactly matches JSON
export interface RoadSegmentData {
  id: number;
  roadNumber: string;  // e.g., "R101"
  county: string;      // e.g., "DCC", "STHDUB"
  joinKey: string;     // e.g., "R101_1" - unique identifier for joins
  isDublin: number;    // 1 if Dublin, 0 otherwise
  isCityTown: number;  // 1 if city/town, 0 otherwise
  isPeat: number;      // 1 if peat area, 0 otherwise
  isFormerNa: number;  // 1 if former national road, 0 otherwise
  isNew: number;       // 1 if new road, 0 otherwise
  data: {
    "2011"?: RoadConditions | null;  // Optional: may be missing from JSON
    "2018"?: RoadConditions | null;  // Optional: may be missing from JSON
    "2025"?: RoadConditions | null;  // Optional: may be missing from JSON
  };
}

// Data load progress tracking
export interface DataLoadProgress {
  stage: 'idle' | 'loading-summary' | 'loading-full' | 'complete' | 'error';
  summaryLoaded: boolean;
  fullLoaded: boolean;
  progress: number;
  error?: string;
}

// Summary file metadata structure
export interface SummaryMetadata {
  localAuthorities: string[];
  surveyYears: string[];
  defaultParameters: {
    reconstruction_iri: number;
    reconstruction_rut: number;
    reconstruction_psci: number;
    overlay_iri: number;
    overlay_rut: number;
    overlay_psci: number;
    restoration_psci_lower: number;
    restoration_psci_upper: number;
    restoration_iri: number;
    skid_psci_lower: number;
    skid_psci_upper: number;
    skid_csc: number;
    skid_mpd: number;
  };
  defaultCosts: {
    rr: number;  // Road Reconstruction
    so: number;  // Structural Overlay
    sr: number;  // Surface Restoration
    rs: number;  // Restoration of Skid Resistance
    rm: number;  // Routine Maintenance
  };
}

// Category breakdown in summary
export interface CategoryBreakdown {
  length: number;       // Total length in units of 100m
  cost: number;        // Total cost in euros
  count: number;       // Number of segments
}

// Summary data by county and year
export interface CountySummary {
  [year: string]: {
    [category: string]: CategoryBreakdown;
  };
}

// Complete summary file structure
export interface SummaryFileData {
  metadata: SummaryMetadata;
  summary: {
    [county: string]: CountySummary;
  };
}

// Simplified summary for UI display
export interface SummaryData {
  totalSegments: number;
  totalLength: number;      // in meters
  totalCost: number;        // in euros
  localAuthorities: string[];
  lastUpdated: string;
  // Additional rich data from file
  metadata?: SummaryMetadata;
  countyBreakdown?: { [county: string]: CountySummary };
}

// Helper type for getting current conditions (most recent available year)
export type CurrentConditions = RoadConditions | null;

// Utility function type to extract latest year data
export interface SegmentUtils {
  getCurrentConditions: (segment: RoadSegmentData) => CurrentConditions;
  getSegmentArea: (segment: RoadSegmentData) => number;
  hasValidData: (segment: RoadSegmentData) => boolean;
}