// src/hooks/useCsvExport.ts
import { useState, useCallback, useMemo } from 'react';
import { message } from 'antd';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { reportService, type ReportOptions } from '@/services/reportService';
import { exportReport } from '@/utils/exportHelpers';
import { useComponentLogger } from '@/utils/logger';
import type { ExportFormat, ExportSections, ExportResult, ExportConfig } from '@/types/export';

export interface UseCsvExportOptions {
  showNotifications?: boolean;
  maxSegments?: number;
}

export function useCsvExport(options: UseCsvExportOptions = {}) {
  const logger = useComponentLogger('useCsvExport');
  const {
    showNotifications = true,
    maxSegments = 10000,
  } = options;

  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportProgress, setExportProgress] = useState(0);

  const cache = useAnalyticsStore(state => state.cache);
  const parameters = useAnalyticsStore(state => state.parameters);
  const chartFilters = useAnalyticsStore(state => state.chartFilters);
  const data = useAnalyticsStore(state => state.data);

  const storeData = useMemo(() => ({
    cache, parameters, chartFilters, data
  }), [cache, parameters, chartFilters, data]);

  const canExport = useMemo(() => {
    return !!(
      storeData.cache.results.segments &&
      storeData.cache.results.summary &&
      !isExporting
    );
  }, [storeData.cache.results, isExporting]);

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

  const exportCSV = useCallback(async (config?: Partial<ExportConfig>): Promise<ExportResult | null> => {
    if (!validateData()) return null;

    setIsExporting(true);
    setExportError(null);
    setExportProgress(0);

    logger.action('exportCSV', { config });

    try {
      if (showNotifications) {
        message.loading({ content: 'Generating CSV file...', key: 'export' });
      }

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

      const exportOptions: ExportConfig = {
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
        fileName: config?.fileName || reportService.generateFileName('csv', storeData.chartFilters),
      };

      const result = await exportReport(
        reportData,
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

  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    exportCSV,
    quickExportCSV,
    clearError,
    isExporting,
    exportError,
    exportProgress,
    canExport,
  };
}