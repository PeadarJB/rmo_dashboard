// src/types/data.ts
export interface RoadConditions {
  year: number;
  iri: number;
  rut: number;
  psci: number;
  csc: number;
  mpd: number;
  category: string | null;
  sqm: number;
}

export interface RoadSegment {
  id: string;
  la_name: string;
  road_number: string;
  road_name: string;
  section_id: string;
  network_type: 'National' | 'Regional' | 'Local';
  length_m: number;
  width_m: number;
  conditions_2011: RoadConditions;
  conditions_2018: RoadConditions;
}

export interface DataLoadProgress {
  stage: 'idle' | 'loading-summary' | 'loading-full' | 'complete' | 'error';
  summaryLoaded: boolean;
  fullLoaded: boolean;
  progress: number;
  error?: string;
}

export interface SummaryData {
  totalSegments: number;
  totalLength: number;
  totalCost: number;
  localAuthorities: string[];
  lastUpdated: string;
}