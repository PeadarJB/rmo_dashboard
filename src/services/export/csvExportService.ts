// src/services/export/csvExportService.ts
import Papa from 'papaparse';
import { logger } from '@/utils/logger';
import type {
  ExportData,
  ExportOptions,
  ExportResult,
  ExportProgressCallback,
  CSVRow,
  ExportKPI,
  ExportCategoryData,
  ExportCountyData,
} from '@/types/export';
import type { CalculatedRoadSegment } from '@/types/calculations';
import type { SurveyYear } from '@/types/data';

/**
 * CSV-specific export options
 */
export interface CSVExportOptions extends Partial<ExportOptions> {
  delimiter?: ',' | ';' | '\t' | '|';
  includeHeaders?: boolean;
  maxRows?: number;
  encoding?: 'utf-8' | 'utf-16';
  lineEnding?: 'CRLF' | 'LF';
}

/**
 * CSV section configuration
 */
interface CSVSection {
  title: string;
  data: CSVRow[];
  includeEmptyLine?: boolean;
}

/**
 * Service for handling CSV export operations
 * Maintains all existing functionality while providing a cleaner interface
 */
export class CSVExportService {
  private readonly MAX_SEGMENTS = 10000;
  private readonly DEFAULT_DELIMITER = ',';
  
  constructor(private readonly loggerPrefix: string = 'CSVExportService') {}

  /**
   * Main entry point for CSV export
   */
  public async exportToCSV(
    data: ExportData,
    options: CSVExportOptions = {},
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    logger.info(this.loggerPrefix, 'Starting CSV export', { 
      sections: options.sections,
      recordCount: data.segments?.length 
    });

    try {
      onProgress?.({
        stage: 'preparing',
        percentage: 0,
        message: 'Preparing CSV export...',
      });

      // Generate CSV content
      const csvContent = this.generateCSV(data, options, onProgress);

      // Generate filename
      const fileName = this.generateFileName(data, options);

      onProgress?.({
        stage: 'downloading',
        percentage: 95,
        message: 'Downloading CSV file...',
      });

      // Trigger download
      const result = this.downloadCSV(csvContent, fileName);

      onProgress?.({
        stage: 'complete',
        percentage: 100,
        message: 'CSV export complete',
      });

      logger.info(this.loggerPrefix, 'CSV export completed successfully', { fileName });
      return result;

    } catch (error) {
      logger.error(this.loggerPrefix, 'CSV export failed', { error });
      return {
        success: false,
        fileName: options.fileName || 'export.csv',
        error: error instanceof Error ? error.message : 'CSV export failed',
      };
    }
  }

  /**
   * Generate CSV content from export data
   */
  public generateCSV(
    data: ExportData,
    options: CSVExportOptions = {},
    onProgress?: ExportProgressCallback
  ): string {
    const sections: CSVSection[] = [];
    const {
      delimiter = this.DEFAULT_DELIMITER,
      includeHeaders = true,
      sections: exportSections = this.getDefaultSections(),
    } = options;

    // Metadata section
    if (options.includeMetadata) {
      onProgress?.({
        stage: 'generating',
        percentage: 10,
        message: 'Adding metadata...',
      });
      
      const metadataSection = this.createMetadataSection(data);
      if (metadataSection.data.length > 0) {
        sections.push(metadataSection);
      }
    }

    // KPIs section
    if (exportSections.kpis && data.kpis.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 20,
        message: 'Processing KPIs...',
      });
      
      const kpiSection = this.createKPISection(data.kpis);
      sections.push(kpiSection);
    }

    // Category breakdown
    if (exportSections.categoryBreakdown && data.categoryAnalysis.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 40,
        message: 'Processing category breakdown...',
      });
      
      const categorySection = this.createCategorySection(data.categoryAnalysis);
      sections.push(categorySection);
    }

    // County analysis
    if (exportSections.countyAnalysis && data.countyAnalysis.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 60,
        message: 'Processing county analysis...',
      });
      
      const countySection = this.createCountySection(data.countyAnalysis);
      sections.push(countySection);
    }

    // Detailed segments
    if (exportSections.detailedSegments && data.segments && data.segments.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 80,
        message: 'Processing detailed segments...',
      });
      
      const segmentSection = this.createSegmentSection(
        data.segments,
        data.summary.year,
        options.maxRows || this.MAX_SEGMENTS
      );
      sections.push(segmentSection);
    }

    // Comparison data
    if (data.comparisonData && exportSections.categoryBreakdown) {
      onProgress?.({
        stage: 'generating',
        percentage: 90,
        message: 'Adding comparison data...',
      });
      
      const comparisonSection = this.createComparisonSection(data.comparisonData);
      if (comparisonSection) {
        sections.push(comparisonSection);
      }
    }

    // Convert sections to CSV string
    return this.sectionsToCSV(sections, delimiter, includeHeaders);
  }

  /**
   * Create metadata section
   */
  private createMetadataSection(data: ExportData): CSVSection {
    const metadataRows: CSVRow[] = [
      { Key: 'Report Title', Value: data.metadata.reportTitle },
      { Key: 'Generated At', Value: data.metadata.generatedAt },
      { Key: 'Report Period', Value: data.metadata.reportPeriod },
      { Key: 'Data Source', Value: data.metadata.dataSource },
      { 
        Key: 'Total Network Length (km)', 
        Value: (data.metadata.totalNetworkLength / 1000).toFixed(2) 
      },
      { 
        Key: 'Total Cost (€)', 
        Value: data.metadata.totalCost.toFixed(2) 
      },
      { Key: 'Total Segments', Value: data.metadata.recordCount },
    ];

    // Add filter information
    if (data.metadata.filters.counties.length > 0) {
      metadataRows.push({
        Key: 'Selected Counties',
        Value: data.metadata.filters.counties.join(', '),
      });
    }

    if (data.metadata.filters.comparisonYear) {
      metadataRows.push({
        Key: 'Comparison Year',
        Value: data.metadata.filters.comparisonYear,
      });
    }

    return {
      title: 'Report Metadata',
      data: metadataRows,
      includeEmptyLine: true,
    };
  }

  /**
   * Create KPI section
   */
  private createKPISection(kpis: ExportKPI[]): CSVSection {
    const kpiRows: CSVRow[] = kpis.map((kpi) => ({
      'KPI Name': kpi.name,
      'Value': kpi.value,
      'Unit': kpi.unit,
      'Formatted': kpi.formatted,
      'Previous Year': kpi.trend ? kpi.trend.previousYear : '',
      'Change (%)': kpi.trend ? `${kpi.trend.percentage.toFixed(1)}%` : '',
    }));

    return {
      title: 'Key Performance Indicators',
      data: kpiRows,
      includeEmptyLine: true,
    };
  }

  /**
   * Create category breakdown section
   */
  private createCategorySection(categoryData: ExportCategoryData[]): CSVSection {
    const categoryRows: CSVRow[] = categoryData.map((cat) => ({
      'Maintenance Category': cat.category,
      'Segments': cat.segments,
      'Length (km)': parseFloat(cat.lengthKm.toFixed(2)),
      'Cost (€)': parseFloat(cat.cost.toFixed(2)),
      'Percentage (%)': parseFloat(cat.percentage.toFixed(1)),
    }));

    // Add totals row
    const totals = this.calculateCategoryTotals(categoryData);
    categoryRows.push({
      'Maintenance Category': 'TOTAL',
      'Segments': totals.segments,
      'Length (km)': parseFloat(totals.lengthKm.toFixed(2)),
      'Cost (€)': parseFloat(totals.cost.toFixed(2)),
      'Percentage (%)': 100.0,
    });

    return {
      title: 'Maintenance Category Breakdown',
      data: categoryRows,
      includeEmptyLine: true,
    };
  }

  /**
   * Create county analysis section
   */
  private createCountySection(countyData: ExportCountyData[]): CSVSection {
    const countyRows: CSVRow[] = countyData.map((county) => ({
      'County Code': county.code,
      'County Name': county.name,
      'Total Segments': county.totalSegments,
      'Total Length (km)': parseFloat(county.totalLengthKm.toFixed(2)),
      'Total Cost (€)': parseFloat(county.totalCost.toFixed(2)),
      'Road Reconstruction': county.byCategory['Road Reconstruction']?.cost.toFixed(2) || '0.00',
      'Structural Overlay': county.byCategory['Structural Overlay']?.cost.toFixed(2) || '0.00',
      'Surface Restoration': county.byCategory['Surface Restoration']?.cost.toFixed(2) || '0.00',
      'Restoration of Skid': county.byCategory['Restoration of Skid Resistance']?.cost.toFixed(2) || '0.00',
      'Routine Maintenance': county.byCategory['Routine Maintenance']?.cost.toFixed(2) || '0.00',
    }));

    return {
      title: 'County Analysis',
      data: countyRows,
      includeEmptyLine: true,
    };
  }

  /**
   * Create detailed segments section
   */
  private createSegmentSection(
    segments: CalculatedRoadSegment[],
    year: SurveyYear,
    maxRows: number
  ): CSVSection {
    const limitedSegments = segments.slice(0, maxRows);
    const SEGMENT_LENGTH = 100; // Fixed 100m segments as per calculation worker
    
    const segmentRows: CSVRow[] = limitedSegments.map((segment) => {
      const yearData = segment.data[year];
      // Width is stored in the year data, prefer current year's width
      const width = yearData?.width || 
                   segment.data['2018']?.width || 
                   segment.data['2011']?.width || 
                   7; // Default width
      const area = yearData?.sqm || (SEGMENT_LENGTH * width);
      
      return {
        'Segment ID': segment.id,
        'Road Number': segment.roadNumber,
        'County': segment.county,
        'Length (m)': SEGMENT_LENGTH, // Always 100m
        'Width (m)': width,
        'Area (sqm)': area,
        'Category': yearData?.category || 'N/A',
        'Cost (€)': yearData ? yearData.cost.toFixed(2) : '0.00',
        'IRI': yearData?.iri ?? 'N/A',
        'RUT': yearData?.rut ?? 'N/A',
        'PSCI': yearData?.psci ?? 'N/A',
        'CSC': yearData?.csc ?? 'N/A', // Coefficient of Skid Resistance
        'MPD': yearData?.mpd ?? 'N/A', // Mean Profile Depth
      };
    });

    // Add note if data was truncated
    if (segments.length > maxRows) {
      logger.warn(this.loggerPrefix, `Segment data truncated`, {
        total: segments.length,
        exported: maxRows,
      });
    }

    return {
      title: `Detailed Segments (${limitedSegments.length} of ${segments.length})`,
      data: segmentRows,
      includeEmptyLine: true,
    };
  }

  /**
   * Create comparison section
   */
  private createComparisonSection(
    comparisonData: ExportData['comparisonData']
  ): CSVSection | null {
    if (!comparisonData) return null;

    const comparisonRows: CSVRow[] = comparisonData.categoryAnalysis.map((cat) => ({
      'Maintenance Category': cat.category,
      [`${comparisonData.year} Segments`]: cat.segments,
      [`${comparisonData.year} Length (km)`]: parseFloat(cat.lengthKm.toFixed(2)),
      [`${comparisonData.year} Cost (€)`]: parseFloat(cat.cost.toFixed(2)),
      [`${comparisonData.year} Percentage (%)`]: parseFloat(cat.percentage.toFixed(1)),
    }));

    return {
      title: `Comparison Year: ${comparisonData.year}`,
      data: comparisonRows,
      includeEmptyLine: true,
    };
  }

  /**
   * Convert sections to CSV string
   */
  private sectionsToCSV(
    sections: CSVSection[],
    delimiter: string,
    includeHeaders: boolean
  ): string {
    const csvParts: string[] = [];

    sections.forEach((section, index) => {
      // Add section title
      csvParts.push(section.title);
      
      // Add data using Papa Parse
      if (section.data.length > 0) {
        const csv = Papa.unparse(section.data, {
          header: includeHeaders,
          delimiter,
          skipEmptyLines: true,
        });
        csvParts.push(csv);
      } else {
        csvParts.push('No data available');
      }

      // Add empty line between sections
      if (section.includeEmptyLine && index < sections.length - 1) {
        csvParts.push('');
      }
    });

    return csvParts.join('\n');
  }

  /**
   * Download CSV file
   */
  public downloadCSV(content: string, fileName: string): ExportResult {
    try {
      // Create blob with BOM for Excel compatibility
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + content], { 
        type: 'text/csv;charset=utf-8;' 
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';

      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 100);

      return {
        success: true,
        fileName,
        fileSize: blob.size,
      };
    } catch (error) {
      logger.error(this.loggerPrefix, 'CSV download failed', { error });
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Generate filename for CSV export
   */
  private generateFileName(data: ExportData, options: CSVExportOptions): string {
    if (options.fileName) {
      // Ensure .csv extension
      return options.fileName.endsWith('.csv') 
        ? options.fileName 
        : `${options.fileName}.csv`;
    }

    // Generate default filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const year = data.summary.year;
    const counties = data.metadata.filters.counties.length > 0
      ? `_${data.metadata.filters.counties.length}Counties`
      : '';
    
    return `RMO_Report_${year}${counties}_${timestamp}.csv`;
  }

  /**
   * Get default export sections configuration
   */
  private getDefaultSections(): ExportOptions['sections'] {
    return {
      summary: true,
      parameters: false, // Not typically needed in CSV
      kpis: true,
      categoryBreakdown: true,
      countyAnalysis: true,
      detailedSegments: true,
      charts: false, // Can't include charts in CSV
    };
  }

  /**
   * Calculate totals for category data
   */
  private calculateCategoryTotals(categoryData: ExportCategoryData[]): {
    segments: number;
    lengthKm: number;
    cost: number;
  } {
    return categoryData.reduce(
      (totals, cat) => ({
        segments: totals.segments + cat.segments,
        lengthKm: totals.lengthKm + cat.lengthKm,
        cost: totals.cost + cat.cost,
      }),
      { segments: 0, lengthKm: 0, cost: 0 }
    );
  }

  /**
   * Validate CSV data before export
   */
  public validateData(data: ExportData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('No export data provided');
      return { valid: false, errors };
    }

    if (!data.metadata) {
      errors.push('Missing metadata');
    }

    if (!data.summary) {
      errors.push('Missing summary data');
    }

    if (!data.kpis || data.kpis.length === 0) {
      logger.warn(this.loggerPrefix, 'No KPI data available for export');
    }

    if (!data.categoryAnalysis || data.categoryAnalysis.length === 0) {
      logger.warn(this.loggerPrefix, 'No category analysis data available');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance for convenience
export const csvExportService = new CSVExportService();