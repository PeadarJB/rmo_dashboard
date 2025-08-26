// src/hooks/usePdfExport.ts
import { useState, useCallback } from 'react';
import { message } from 'antd';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { pdfReportService } from '@/services/pdfReportService';
import { useComponentLogger } from '@/utils/logger';
import type { ExportResult } from '@/types/export';

export function usePdfExport() {
  const logger = useComponentLogger('usePdfExport');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const { parameters, chartFilters, data, cache } = useAnalyticsStore();

  const exportPDF = useCallback(async (chartElement: HTMLElement): Promise<ExportResult | null> => {
    setIsExporting(true);
    setExportError(null);
    logger.action('exportPDF');

    try {
      message.loading({ content: 'Generating PDF report...', key: 'pdf-export' });

      // 1. Capture Chart Image
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const chartImage = canvas.toDataURL('image/png');

      // 2. Gather Data
      const reportData = {
        kpis: data.summaryData?.kpis || [],
        parameters: parameters,
        filters: chartFilters,
        timestamp: cache.results.timestamp,
      };

      // 3. Generate PDF
      await pdfReportService.generateReport(reportData, chartImage);

      message.success({ content: 'PDF report generated successfully!', key: 'pdf-export' });
      
      logger.action('exportPDFComplete', { success: true });
      
      return { success: true, fileName: 'RMO_Report.pdf' };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'PDF export failed';
      setExportError(errorMessage);
      message.error({ content: `Export failed: ${errorMessage}`, key: 'pdf-export' });
      logger.error('exportPDF', error);
      return { success: false, fileName: '', error: errorMessage };
    } finally {
      setIsExporting(false);
    }
  }, [parameters, chartFilters, data, cache, logger]);

  const clearError = useCallback(() => {
    setExportError(null);
  }, []);

  return {
    isExporting,
    exportError,
    exportPDF,
    clearError,
  };
}