// src/services/export/index.ts
/**
 * Export Service Module - Phase 2 Update
 * Now includes fixed PDF export functionality
 */

import { CSVExportService } from './csvExportService';
import { PDFExportService } from './pdfExportService';
import { ChartCaptureService } from './chartCaptureService';

import { logger } from '@/utils/logger';
import type { 
  ExportData, 
  ExportOptions, 
  ExportResult, 
  ExportFormat,
  ExportProgressCallback 
} from '@/types/export';

/**
 * Main export service that orchestrates different export formats
 * Phase 2: Now includes working PDF export
 */
export class ExportService {
  private csvService: CSVExportService;
  private pdfService: PDFExportService;
  private chartCapture: ChartCaptureService;

  constructor() {
    this.csvService = new CSVExportService('ExportService.CSV');
    this.pdfService = new PDFExportService('ExportService.PDF');
    this.chartCapture = new ChartCaptureService('ExportService.ChartCapture');
  }

  /**
   * Main export method that routes to appropriate service
   */
  public async export(
    data: ExportData,
    options: ExportOptions,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    logger.info('ExportService', `Starting export`, { 
      format: options.format,
      sections: options.sections,
      hasChartImage: !!options.chartImages?.maintenanceCategory
    });

    try {
      switch (options.format) {
        case 'csv':
          return await this.csvService.exportToCSV(data, options, onProgress);
        
        case 'pdf':
          // Use new PDF service with chart capture
          const { format, ...pdfExportOptionsBase } = options; // Destructure to omit the file format
          return await this.pdfService.exportToPDF(
            data, 
            {
              ...pdfExportOptionsBase, // Pass options without the file format
              chartImage: options.chartImages?.maintenanceCategory,
            },
            onProgress
          );
        
        case 'excel':
          // Future enhancement: Excel export
          logger.warn('ExportService', 'Excel format not implemented, falling back to CSV');
          return await this.csvService.exportToCSV(
            data, 
            { ...options, fileName: options.fileName?.replace('.xlsx', '.csv') },
            onProgress
          );
        
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }
    } catch (error) {
      logger.error('ExportService', 'Export failed', { error, format: options.format });
      return {
        success: false,
        fileName: options.fileName || 'export',
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export with chart capture
   * Captures the current visible chart before exporting
   */
  public async exportWithChart(
    data: ExportData,
    options: ExportOptions,
    chartRef?: any, // ChartJS instance
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    try {
      let chartImage: string | undefined;

      // Capture chart if exporting to PDF and charts are requested
      if (options.format === 'pdf' && options.sections?.charts) {
        onProgress?.({
          stage: 'preparing',
          percentage: 5,
          message: 'Capturing chart visualization...',
        });

        if (chartRef) {
          // Use provided chart reference
          const captureResult = await this.chartCapture.captureChartJS(chartRef);
          if (captureResult.success && captureResult.dataUrl) {
            // Optimize for PDF
            chartImage = await this.chartCapture.optimizeForPDF(captureResult.dataUrl);
          }
        } else {
          // Try to find visible chart automatically
          const captureResult = await this.chartCapture.getCurrentVisibleChart();
          if (captureResult.success && captureResult.dataUrl) {
            chartImage = await this.chartCapture.optimizeForPDF(captureResult.dataUrl);
          }
        }

        if (!chartImage) {
          logger.warn('ExportService', 'Could not capture chart for PDF');
        }
      }

      // Export with captured chart
      return await this.export(
        data,
        {
          ...options,
          chartImages: {
            ...options.chartImages,
            maintenanceCategory: chartImage || options.chartImages?.maintenanceCategory,
          },
        },
        onProgress
      );
    } catch (error) {
      logger.error('ExportService', 'Export with chart failed', { error });
      return {
        success: false,
        fileName: options.fileName || 'export',
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Quick export methods for common use cases
   */
  public async quickExportCSV(data: ExportData): Promise<ExportResult> {
    return this.export(data, {
      format: 'csv',
      sections: {
        summary: true,
        parameters: false,
        kpis: true,
        categoryBreakdown: true,
        countyAnalysis: true,
        detailedSegments: true,
        charts: false,
      },
      includeMetadata: true,
      includeCharts: false,
    });
  }

  public async quickExportPDF(
    data: ExportData, 
    chartRef?: any
  ): Promise<ExportResult> {
    return this.exportWithChart(data, {
      format: 'pdf',
      sections: {
        summary: true,
        parameters: true,
        kpis: true,
        categoryBreakdown: true,
        countyAnalysis: true,
        detailedSegments: false,
        charts: true,
      },
      includeMetadata: true,
      includeCharts: true,
    }, chartRef);
  }

  /**
   * Validate export data
   */
  public validateData(
    data: ExportData,
    format: ExportFormat
  ): { valid: boolean; errors: string[] } {
    switch (format) {
      case 'csv':
        return this.csvService.validateData(data);
      case 'pdf':
        return this.pdfService.validateData(data);
      default:
        return { valid: true, errors: [] };
    }
  }

  /**
   * Get chart capture service for direct use
   */
  public getChartCaptureService(): ChartCaptureService {
    return this.chartCapture;
  }
}

// Export singleton instance
export const exportService = new ExportService();

// Re-export services for direct access if needed
export { csvExportService } from './csvExportService';
export { pdfExportService } from './pdfExportService';
export { chartCaptureService } from './chartCaptureService';

// Re-export types for convenience
export type { 
  ExportData, 
  ExportOptions, 
  ExportResult,
  ExportFormat
} from '@/types/export';
export type { PDFExportOptions } from './pdfExportService';
export type { ChartCaptureOptions, CaptureResult } from './chartCaptureService';