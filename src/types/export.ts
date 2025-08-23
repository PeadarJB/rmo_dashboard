// src/types/export.ts
import type { 
  CalculatedRoadSegment, 
  CalculationSummary, 
  MaintenanceCategory,
} from './calculations';
import type { SurveyYear } from './data';
import type { ParametersSlice } from './store';

// Export format options
export type ExportFormat = 'pdf' | 'csv' | 'excel';

// Sections that can be included in exports
export interface ExportSections {
  summary: boolean;
  parameters: boolean;
  kpis: boolean;
  categoryBreakdown: boolean;
  countyAnalysis: boolean;
  detailedSegments: boolean;
  charts: boolean;
}

// Configuration for export operations
export interface ExportOptions {
  format: ExportFormat;
  sections: ExportSections;
  includeMetadata: boolean;
  includeCharts: boolean;
  fileName?: string;
  chartImages?: {
    maintenanceCategory?: string; // base64 image
    categoryBreakdown?: string;
  };
}

// Metadata about the export
export interface ReportMetadata {
  generatedAt: string;
  generatedBy: string;
  reportTitle: string;
  reportPeriod: string;
  dataSource: string;
  filters: {
    year: SurveyYear | 'both';
    counties: string[];
    comparisonYear?: SurveyYear | null;
  };
  parameters: {
    thresholds: ParametersSlice['thresholds'];
    costs: ParametersSlice['costs'];
  };
  recordCount: number;
  totalNetworkLength: number;
  totalCost: number;
}

// KPI data structure for export
export interface ExportKPI {
  name: string;
  value: number;
  unit: string;
  formatted: string;
  trend?: {
    previousYear: SurveyYear;
    change: number;
    percentage: number;
  };
}

// Category breakdown for export
export interface ExportCategoryData {
  category: MaintenanceCategory;
  segments: number;
  lengthKm: number;
  cost: number;
  percentage: number;
}

// County analysis for export
export interface ExportCountyData {
  code: string;
  name: string;
  totalSegments: number;
  totalLengthKm: number;
  totalCost: number;
  byCategory: Record<MaintenanceCategory, {
    segments: number;
    lengthKm: number;
    cost: number;
  }>;
}

// Main export data structure
export interface ExportData {
  metadata: ReportMetadata;
  kpis: ExportKPI[];
  summary: {
    year: SurveyYear;
    totalSegments: number;
    totalLength: number;
    totalCost: number;
    averageCondition: number;
  };
  categoryAnalysis: ExportCategoryData[];
  countyAnalysis: ExportCountyData[];
  segments?: CalculatedRoadSegment[]; // Optional detailed segment data
  comparisonData?: {
    year: SurveyYear;
    summary: CalculationSummary;
    categoryAnalysis: ExportCategoryData[];
  };
}

// CSV specific types
export interface CSVRow {
  [key: string]: string | number | null;
}

export interface CSVExportConfig {
  headers: string[];
  rows: CSVRow[];
  fileName: string;
}

// PDF specific types
export interface PDFSection {
  title: string;
  content: any; // Can be text, table, or chart
  pageBreak?: boolean;
}

export interface PDFExportConfig {
  title: string;
  sections: PDFSection[];
  metadata: ReportMetadata;
  includePageNumbers: boolean;
  includeTOC: boolean;
  logoPath?: string;
}

// Export result types
export interface ExportResult {
  success: boolean;
  fileName: string;
  fileSize?: number;
  error?: string;
}

// Progress callback for large exports
export type ExportProgressCallback = (progress: {
  stage: 'preparing' | 'generating' | 'downloading' | 'complete';
  percentage: number;
  message: string;
}) => void;