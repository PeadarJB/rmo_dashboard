// src/services/export/migrationHelper.ts
/**
 * Migration helper to safely transition from old exportHelpers to new export services
 * This ensures backward compatibility while gradually moving to the new architecture
 */

import { exportService } from './index';
import type { 
  ExportData, 
  ExportOptions, 
  ExportResult, 
  ExportProgressCallback 
} from '@/types/export';

/**
 * Compatibility wrapper that mimics the old exportReport function
 * This allows existing code to work while we migrate
 */
export async function exportReport(
  exportData: ExportData,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  console.log('[Migration] Using new export service via compatibility wrapper');
  return exportService.export(exportData, options, onProgress);
}

/**
 * Updated exportHelpers.ts file (temporary compatibility layer)
 * Replace the existing src/utils/exportHelpers.ts with this during migration
 */
export const updatedExportHelpers = `
// src/utils/exportHelpers.ts
// MIGRATION IN PROGRESS: This file now delegates to the new export services

import { exportService } from '@/services/export';
import { jsPDF } from 'jspdf'; // Keep for backward compatibility
import type {
  ExportData,
  ExportOptions,
  ExportResult,
  ExportProgressCallback,
} from '@/types/export';

/**
 * @deprecated Use exportService.export() instead
 * This function is maintained for backward compatibility
 */
export async function exportReport(
  exportData: ExportData,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  console.warn('exportReport is deprecated. Please use exportService.export() instead');
  return exportService.export(exportData, options, onProgress);
}

/**
 * @deprecated Use CSVExportService.generateCSV() instead
 */
export function generateCSV(
  data: ExportData,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): string {
  console.warn('generateCSV is deprecated. Please use CSVExportService directly');
  const { CSVExportService } = require('@/services/export/csvExportService');
  const csvService = new CSVExportService();
  return csvService.generateCSV(data, options, onProgress);
}

/**
 * @deprecated Will be replaced in Phase 2
 */
export function generatePDF(
  data: ExportData,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): jsPDF {
  // Keep existing PDF generation for now (Phase 2 will replace this)
  // ... existing PDF code ...
  const doc = new jsPDF();
  // Temporary implementation
  return doc;
}

/**
 * @deprecated Use CSVExportService.downloadCSV() instead
 */
export function downloadFile(
  content: string | Blob | jsPDF,
  fileName: string,
  mimeType?: string
): ExportResult {
  if (content instanceof jsPDF) {
    content.save(fileName);
    return { success: true, fileName };
  }
  
  const { CSVExportService } = require('@/services/export/csvExportService');
  const csvService = new CSVExportService();
  
  if (typeof content === 'string') {
    return csvService.downloadCSV(content, fileName);
  }
  
  // Handle blob
  const url = URL.createObjectURL(content);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  
  return { success: true, fileName };
}
`;

/**
 * Step-by-step migration plan
 */
export const MIGRATION_STEPS = `
PHASE 1 MIGRATION STEPS:
=======================

1. Install the new export service structure:
   - Create src/services/export/ directory
   - Add csvExportService.ts (from artifact)
   - Add index.ts (from artifact)
   - Add this migrationHelper.ts

2. Update package.json if needed:
   - Ensure "papaparse" is installed (should already be there)
   - No new dependencies needed for Phase 1

3. Test CSV exports are still working:
   - Run: npm run dev
   - Test CSV export from Header component
   - Test CSV export from ChartToolbar
   - Verify file downloads correctly
   - Verify content is unchanged

4. Gradual component migration (optional, can wait):
   
   a. Update Header.tsx:
      OLD:
      import { useExport } from '@/hooks';
      
      NEW: 
      No change needed - hook handles it internally
   
   b. Update useExport.ts hook:
      Replace the import at the top:
      OLD: import { exportReport } from '@/utils/exportHelpers';
      NEW: import { exportService } from '@/services/export';
      
      Update the exportCSV function:
      OLD: const result = await exportReport(exportData, options, onProgress);
      NEW: const result = await exportService.export(exportData, options, onProgress);

5. Verify backwards compatibility:
   - Old code should still work via compatibility layer
   - Check console for deprecation warnings
   - No functional changes should be visible to users

6. Monitor for issues:
   - Check browser console for errors
   - Verify CSV content is identical to before
   - Test with different filter combinations
   - Test with large datasets (10k+ segments)

ROLLBACK PLAN:
=============
If issues occur, simply:
1. Keep the original exportHelpers.ts file
2. Remove the new /services/export directory
3. Revert any component changes

VALIDATION CHECKLIST:
====================
□ CSV export works from Header quick export button
□ CSV export works from ChartToolbar
□ File names are generated correctly
□ All sections appear in CSV (KPIs, Categories, Counties, etc.)
□ Metadata section is included when requested
□ Large datasets (>10k rows) are handled with truncation warning
□ Progress callbacks work (loading indicators)
□ Error handling works (try exporting with no data)
□ Downloaded files open correctly in Excel
□ Special characters in data are handled correctly

NEXT PHASES:
===========
Phase 2: Rebuild PDF export service (pdfExportService.ts)
Phase 3: Add chart capture service (chartCaptureService.ts)
Phase 4: Create export modal for configuration
Phase 5: Add Excel native format support
`;

/**
 * Test helper to verify CSV output matches between old and new implementation
 */
export async function verifyCSVMigration(
  testData: ExportData,
  options: ExportOptions
): Promise<{ 
  matches: boolean; 
  oldContent?: string; 
  newContent?: string;
  differences?: string[];
}> {
  try {
    // Get old implementation output
    const { generateCSV: oldGenerateCSV } = await import('@/utils/exportHelpers');
    const oldContent = oldGenerateCSV(testData, options);
    
    // Get new implementation output  
    const { CSVExportService } = await import('./csvExportService');
    const csvService = new CSVExportService();
    const newContent = csvService.generateCSV(testData, options);
    
    // Compare outputs
    if (oldContent === newContent) {
      return { matches: true, oldContent, newContent };
    }
    
    // Find differences
    const oldLines = oldContent.split('\n');
    const newLines = newContent.split('\n');
    const differences: string[] = [];
    
    const maxLines = Math.max(oldLines.length, newLines.length);
    for (let i = 0; i < maxLines; i++) {
      if (oldLines[i] !== newLines[i]) {
        differences.push(`Line ${i + 1}: "${oldLines[i]}" !== "${newLines[i]}"`);
      }
    }
    
    return { 
      matches: false, 
      oldContent, 
      newContent, 
      differences 
    };
  } catch (error) {
    console.error('Migration verification failed:', error);
    return { 
      matches: false, 
      differences: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`] 
    };
  }
}

// Development helper: Log all export calls for debugging
if (process.env.NODE_ENV === 'development') {
  const originalExport = exportService.export.bind(exportService);
  exportService.export = async (data, options, onProgress) => {
    console.group('🔄 Export Service Call');
    console.log('Format:', options.format);
    console.log('Sections:', options.sections);
    console.log('Records:', data.segments?.length || 0);
    console.time('Export Duration');
    
    const result = await originalExport(data, options, onProgress);
    
    console.timeEnd('Export Duration');
    console.log('Result:', result);
    console.groupEnd();
    
    return result;
  };
}