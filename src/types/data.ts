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
  roadNumber: string;  // e.g., "R115"
  county: string;      // e.g., "DCC", "STHDUB"
  data: Record<SurveyYear, RoadConditions | null>;
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
    roadReconstruction_iri: number;
    roadReconstruction_rut: number;
    roadReconstruction_psci: number;
    structuralOverlay_iri: number;
    structuralOverlay_rut: number;
    structuralOverlay_psci: number;
    surfaceRestoration_psci_a: number;
    surfaceRestoration_psci_b: number;
    surfaceRestoration_iri: number;
    surfaceRestoration_psci_c: number;
    restorationOfSkidResistance_psci_a: number;
    restorationOfSkidResistance_psci_b: number;
    restorationOfSkidResistance_csc: number;
    restorationOfSkidResistance_psci_c: number;
    restorationOfSkidResistance_mpd: number;
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