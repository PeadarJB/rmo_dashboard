// src/hooks/useExport.ts
import { useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { reportService, type ReportOptions } from '@/services/reportService';
import { exportReport } from '@/utils/exportHelpers';
import { useComponentLogger } from '@/utils/logger';
import type { ExportFormat, ExportSections, ExportResult, ExportOptions } from '@/types/export';

export interface UseExportOptions {
  showNotifications?: boolean;
  autoDownload?: boolean;
  maxSegments?: number;
}

export interface ExportConfig {
  format: ExportFormat;
  sections?: Partial<ExportSections>;
  fileName?: string;
  includeCharts?: boolean;
}

export function useExport(options: UseExportOptions = {}) {
  const logger = useComponentLogger('useExport');
  const {
    showNotifications = true,
    maxSegments = 10000,
  } = options;

  // State
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  // Store selectors - get all needed data in one go
  const storeData = useAnalyticsStore(state => ({
    cache: state.cache,
    parameters: state.parameters,
    chartFilters: state.chartFilters,
    data: state.data,
  }));

  // Check if export is available
  const canExport = useMemo(() => {
    return !!(
      storeData.cache.results.segments &&
      storeData.cache.results.summary &&
      !isExporting
    );
  }, [storeData.cache.results, isExporting]);

  // Validate export data
  const validateData = useCallback(() => {
    const validation = reportService.validateExportData({
      calculatedSegments: storeData.cache.results.segments,
      calculationSummary: storeData.cache.results.summary,
      chartFilters: storeData.chartFilters,
      parameters: storeData.parameters,
      summaryData: storeData.data.summaryData,
      timestamp: storeData.cache.results.timestamp,
    });

    if (!validation.valid) {
      const errorMessage = validation.errors.join(', ');
      setExportError(errorMessage);
      if (showNotifications) {
        message.error(`Cannot export: ${errorMessage}`);
      }
      return false;
    }

    return true;
  }, [storeData, showNotifications]);

  // Export as PDF
  const exportPDF = useCallback(async (config?: Partial<ExportConfig>): Promise<ExportResult | null> => {
    if (!validateData()) return null;

    setIsExporting(true);
    setExportError(null);
    setExportProgress(0);

    logger.action('exportPDF', { config });

    try {
      // Show loading notification
      if (showNotifications) {
        message.loading({ content: 'Generating PDF report...', key: 'export' });
      }

      // Gather report data
      const reportData = await reportService.gatherReportData(
        {
          calculatedSegments: storeData.cache.results.segments!,
          calculationSummary: storeData.cache.results.summary!,
          chartFilters: storeData.chartFilters,
          parameters: storeData.parameters,
          summaryData: storeData.data.summaryData,
          timestamp: storeData.cache.results.timestamp,
        },
        {
          includeFiltered: true,
          maxSegments: config?.sections?.detailedSegments ? maxSegments : 0,
          includeComparison: true,
          includeParameters: true,
        } as ReportOptions
      );

      if (!reportData) {
        throw new Error('Failed to prepare report data');
      }

      // Set up export options
      const exportOptions: ExportOptions = {
        format: 'pdf',
        sections: {
          summary: true,
          parameters: true,
          kpis: true,
          categoryBreakdown: true,
          countyAnalysis: true,
          detailedSegments: false,
          charts: config?.includeCharts || false,
          ...config?.sections,
        },
        includeMetadata: true,
        includeCharts: config?.includeCharts || false,
        fileName: config?.fileName || reportService.generateFileName('pdf', storeData.chartFilters),
      };

      // Execute export
      const result = await exportReport(
        storeData,
        exportOptions,
        (progress) => {
          setExportProgress(progress.percentage);
          if (showNotifications && progress.stage === 'complete') {
            message.success({
              content: 'PDF report generated successfully',
              key: 'export'
            });
          }
        }
      );

      logger.action('exportPDFComplete', { success: result.success });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF export failed';
      setExportError(errorMessage);


      if (showNotifications) {
        message.error({
          content: `Export failed: ${errorMessage}`,
          key: 'export'
        });
      }

      return {
        success: false,
        fileName: '',
        error: errorMessage,
      };
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [validateData, storeData, maxSegments, showNotifications, logger]);

  // Export as CSV
  const exportCSV = useCallback(async (config?: Partial<ExportConfig>): Promise<ExportResult | null> => {
    if (!validateData()) return null;

    setIsExporting(true);
    setExportError(null);
    setExportProgress(0);

    logger.action('exportCSV', { config });

    try {
      // Show loading notification
      if (showNotifications) {
        message.loading({ content: 'Generating CSV file...', key: 'export' });
      }

      // Gather report data
      const reportData = await reportService.gatherReportData(
        {
          calculatedSegments: storeData.cache.results.segments!,
          calculationSummary: storeData.cache.results.summary!,
          chartFilters: storeData.chartFilters,
          parameters: storeData.parameters,
          summaryData: storeData.data.summaryData,
          timestamp: storeData.cache.results.timestamp,
        },
        {
          includeFiltered: true,
          maxSegments,
          includeComparison: true,
          includeParameters: true,
        } as ReportOptions
      );

      if (!reportData) {
        throw new Error('Failed to prepare report data');
      }

      // Set up export options
      const exportOptions: ExportOptions = {
        format: 'csv',
        sections: {
          summary: true,
          parameters: true,
          kpis: true,
          categoryBreakdown: true,
          countyAnalysis: true,
          detailedSegments: true,
          charts: false,
          ...config?.sections,
        },
        includeMetadata: true,
        includeCharts: false,
        fileName: config?.fileName || reportService.generateFileName('csv', storeData.chartFilters),
      };

      // Execute export
      const result = await exportReport(
        storeData,
        exportOptions,
        (progress) => {
          setExportProgress(progress.percentage);
          if (showNotifications && progress.stage === 'complete') {
            message.success({
              content: 'CSV file generated successfully',
              key: 'export'
            });
          }
        }
      );

      logger.action('exportCSVComplete', { success: result.success });
      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'CSV export failed';
      setExportError(errorMessage);


      if (showNotifications) {
        message.error({
          content: `Export failed: ${errorMessage}`,
          key: 'export'
        });
      }

      return {
        success: false,
        fileName: '',
        error: errorMessage,
      };
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [validateData, storeData, maxSegments, showNotifications, logger]);

  // Export current chart as image
  const exportChartImage = useCallback(async (
    chartElement: HTMLElement,
    fileName?: string
  ): Promise<ExportResult | null> => {
    setIsExporting(true);
    setExportError(null);

    logger.action('exportChartImage', { fileName });

    try {
      // Dynamically import html2canvas to reduce bundle size
      const html2canvas = (await import('html2canvas')).default;

      if (showNotifications) {
        message.loading({ content: 'Capturing chart...', key: 'export' });
      }

      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2, // Higher resolution
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Failed to capture chart');
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `chart_${Date.now()}.png`;
        link.click();
        URL.revokeObjectURL(url);

        if (showNotifications) {
          message.success({
            content: 'Chart exported successfully',
            key: 'export'
          });
        }
      }, 'image/png');

      return {
        success: true,
        fileName: fileName || `chart_${Date.now()}.png`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Chart export failed';
      setExportError(errorMessage);

      if (showNotifications) {
        message.error({
          content: `Export failed: ${errorMessage}`,
          key: 'export'
        });
      }

      return {
        success: false,
        fileName: '',
        error: errorMessage,
      };
    } finally {
      setIsExporting(false);
    }
  }, [showNotifications, logger]);

  // Quick export with default settings
  const quickExportPDF = useCallback(() => {
    return exportPDF({
      sections: {
        summary: true,
        parameters: true,
        kpis: true,
        categoryBreakdown: true,
        countyAnalysis: true,
        detailedSegments: false,
        charts: false,
      },
    });
  }, [exportPDF]);

  const quickExportCSV = useCallback(() => {
    return exportCSV({
      sections: {
        summary: true,
        parameters: false,
        kpis: true,
        categoryBreakdown: true,
        countyAnalysis: true,
        detailedSegments: true,
        charts: false,
      },
    });
  }, [exportCSV]);

  // Reset error state
  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    // Methods
    exportPDF,
    exportCSV,
    exportChartImage,
    quickExportPDF,
    quickExportCSV,
    clearError,

    // State
    isExporting,
    exportError,
    exportProgress,
    canExport,
  };
}