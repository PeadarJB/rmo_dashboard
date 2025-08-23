// src/utils/exportHelpers.ts
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import type {
  ExportData,
  ExportOptions,
  ExportResult,
  ExportProgressCallback,
  ReportMetadata,
  ExportCategoryData,
  ExportCountyData,
  CSVRow,
} from '@/types/export';
import type {
  CalculatedRoadSegment,
  MaintenanceCategory
} from '@/types/calculations';
import type { SurveyYear } from '@/types/data';
import type { AnalyticsState } from '@/types/store';
import { COUNTY_NAMES } from '@/utils/countyLabels';

// Constants
const PDF_MARGINS = { top: 20, left: 20, right: 20, bottom: 30 };
const PDF_COLORS = {
  primary: '#1890ff',
  secondary: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  text: '#262626',
  lightGray: '#f0f0f0',
};

/**
 * Prepare export data from current store state
 */
export function prepareExportData(
  state: Pick<AnalyticsState, 'cache' | 'parameters' | 'chartFilters' | 'data'>,
  options: ExportOptions
): ExportData | null {
  const { cache, parameters, chartFilters } = state;

  if (!cache.results.segments || !cache.results.summary) {
    console.error('No calculation results available for export');
    return null;
  }

  const primaryYear = chartFilters.primaryYear;
  const yearSummary = cache.results.summary[primaryYear];

  if (!yearSummary) {
    console.error(`No data available for year ${primaryYear}`);
    return null;
  }

  // Build metadata
  const metadata: ReportMetadata = {
    generatedAt: new Date().toISOString(),
    generatedBy: 'RMO Dashboard User',
    reportTitle: `Regional Road Maintenance Analysis - ${primaryYear}`,
    reportPeriod: `Survey Year ${primaryYear}`,
    dataSource: 'Regional Road Survey Data',
    filters: {
      year: parameters.selectedYear,
      counties: chartFilters.selectedCounties,
      comparisonYear: chartFilters.compareYear,
    },
    parameters: {
      thresholds: parameters.thresholds,
      costs: parameters.costs,
    },
    recordCount: yearSummary.total_segments,
    totalNetworkLength: yearSummary.total_length_m,
    totalCost: yearSummary.total_cost,
  };

  // Build KPIs
  const kpis = [
    {
      name: 'Total Maintenance Cost',
      value: yearSummary.total_cost,
      unit: '€',
      formatted: formatCurrency(yearSummary.total_cost),
    },
    {
      name: 'Network Length',
      value: yearSummary.total_length_m / 1000,
      unit: 'km',
      formatted: `${(yearSummary.total_length_m / 1000).toFixed(0)} km`,
    },
    {
      name: 'Total Segments',
      value: yearSummary.total_segments,
      unit: 'segments',
      formatted: yearSummary.total_segments.toLocaleString(),
    },
    {
      name: 'Average Cost per km',
      value: yearSummary.total_cost / (yearSummary.total_length_m / 1000),
      unit: '€/km',
      formatted: formatCurrency(yearSummary.total_cost / (yearSummary.total_length_m / 1000)),
    },
  ];

  // Build category analysis
  const categoryAnalysis: ExportCategoryData[] = Object.entries(yearSummary.by_category)
    .map(([category, data]) => ({
      category: category as MaintenanceCategory,
      segments: data.segment_count,
      lengthKm: data.total_length_m / 1000,
      cost: data.total_cost,
      percentage: data.percentage,
    }))
    .sort((a, b) => b.cost - a.cost);

  // Build county analysis
  const countyAnalysis: ExportCountyData[] = [];

  // Filter segments by selected counties if needed
  let exportSegments = cache.results.segments;
  if (chartFilters.selectedCounties.length > 0) {
    exportSegments = exportSegments.filter(s =>
      chartFilters.selectedCounties.includes(s.county)
    );
  }

  // Aggregate by county
  const countyMap = new Map<string, ExportCountyData>();

  for (const segment of exportSegments) {
    const yearData = segment.data[primaryYear];
    if (!yearData) continue;

    if (!countyMap.has(segment.county)) {
      countyMap.set(segment.county, {
        code: segment.county,
        name: COUNTY_NAMES[segment.county] || segment.county,
        totalSegments: 0,
        totalLengthKm: 0,
        totalCost: 0,
        byCategory: {} as any,
      });
    }

    const county = countyMap.get(segment.county)!;
    county.totalSegments++;
    county.totalLengthKm += 0.1; // 100m segments
    county.totalCost += yearData.cost;

    // Initialize category if needed
    if (!county.byCategory[yearData.category]) {
      county.byCategory[yearData.category] = {
        segments: 0,
        lengthKm: 0,
        cost: 0,
      };
    }

    county.byCategory[yearData.category].segments++;
    county.byCategory[yearData.category].lengthKm += 0.1;
    county.byCategory[yearData.category].cost += yearData.cost;
  }

  countyAnalysis.push(...Array.from(countyMap.values()));
  countyAnalysis.sort((a, b) => b.totalCost - a.totalCost);

  // Build final export data
  const exportData: ExportData = {
    metadata,
    kpis,
    summary: {
      year: primaryYear,
      totalSegments: yearSummary.total_segments,
      totalLength: yearSummary.total_length_m,
      totalCost: yearSummary.total_cost,
      averageCondition: calculateAverageCondition(exportSegments, primaryYear),
    },
    categoryAnalysis,
    countyAnalysis,
  };

  // Add detailed segments if requested
  if (options.sections.detailedSegments) {
    exportData.segments = exportSegments;
  }

  // Add comparison data if available
  if (chartFilters.compareYear && cache.results.summary[chartFilters.compareYear]) {
    const compareYear = chartFilters.compareYear;
    const compareSummary = cache.results.summary[compareYear];

    exportData.comparisonData = {
      year: compareYear,
      summary: compareSummary as any, // FIX: Type definition expects CalculationSummary but provides YearSummary
      categoryAnalysis: Object.entries(compareSummary.by_category)
        .map(([category, data]) => ({
          category: category as MaintenanceCategory,
          segments: data.segment_count,
          lengthKm: data.total_length_m / 1000,
          cost: data.total_cost,
          percentage: data.percentage,
        })),
    };
  }

  return exportData;
}

/**
 * Generate CSV from export data
 */
export function generateCSV(
  data: ExportData,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): string {
  onProgress?.({
    stage: 'generating',
    percentage: 0,
    message: 'Generating CSV file...',
  });

  const csvSections: CSVRow[][] = [];

  // Metadata section
  if (options.includeMetadata) {
    csvSections.push([
      { 'Report Title': data.metadata.reportTitle },
      { 'Generated At': data.metadata.generatedAt },
      { 'Data Period': data.metadata.reportPeriod },
      { 'Total Network Length (km)': data.metadata.totalNetworkLength / 1000 },
      { 'Total Cost (€)': data.metadata.totalCost },
      {},
    ]);
  }

  // KPIs section
  if (options.sections.kpis) {
    const kpiRows: CSVRow[] = data.kpis.map(kpi => ({
      'KPI': kpi.name,
      'Value': kpi.value,
      'Unit': kpi.unit,
      'Formatted': kpi.formatted,
    }));
    csvSections.push(kpiRows);
    csvSections.push([{}]); // Empty row for separation
  }

  // Category breakdown
  if (options.sections.categoryBreakdown) {
    const categoryRows: CSVRow[] = data.categoryAnalysis.map(cat => ({
      'Maintenance Category': cat.category,
      'Segments': cat.segments,
      'Length (km)': cat.lengthKm.toFixed(2),
      'Cost (€)': cat.cost.toFixed(2),
      'Percentage': `${cat.percentage.toFixed(1)}%`,
    }));
    csvSections.push(categoryRows);
    csvSections.push([{}]);
  }

  // County analysis
  if (options.sections.countyAnalysis) {
    const countyRows: CSVRow[] = data.countyAnalysis.map(county => ({
      'County Code': county.code,
      'County Name': county.name,
      'Total Segments': county.totalSegments,
      'Total Length (km)': county.totalLengthKm.toFixed(2),
      'Total Cost (€)': county.totalCost.toFixed(2),
    }));
    csvSections.push(countyRows);
    csvSections.push([{}]);
  }

  // Detailed segments
  if (options.sections.detailedSegments && data.segments) {
    const segmentRows: CSVRow[] = data.segments.slice(0, 10000).map(segment => {
      const yearData = segment.data[data.summary.year];
      return {
        'Segment ID': segment.id,
        'Road Number': segment.roadNumber,
        'County': segment.county,
        'Category': yearData?.category || 'N/A',
        'Cost (€)': yearData?.cost.toFixed(2) || '0.00',
        'IRI': yearData?.iri || 'N/A',
        'RUT': yearData?.rut || 'N/A',
        'PSCI': yearData?.psci || 'N/A',
      };
    });
    csvSections.push(segmentRows);
  }

  onProgress?.({
    stage: 'generating',
    percentage: 80,
    message: 'Formatting CSV data...',
  });

  // Flatten all sections into single array
  const allRows = csvSections.flat();

  // Generate CSV string
  const csv = Papa.unparse(allRows, {
    header: true,
    skipEmptyLines: true,
  });

  onProgress?.({
    stage: 'complete',
    percentage: 100,
    message: 'CSV generation complete',
  });

  return csv;
}

/**
 * Generate PDF report from export data
 */
export function generatePDF(
  data: ExportData,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): jsPDF {
  onProgress?.({
    stage: 'generating',
    percentage: 0,
    message: 'Creating PDF document...',
  });

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let currentY = PDF_MARGINS.top;

  // Add logo if available
  if (options.chartImages?.maintenanceCategory) {
    // Logo would go here if we had access to it
    // doc.addImage(logo, 'PNG', PDF_MARGINS.left, currentY, 40, 15);
  }

  // Title Page
  doc.setFontSize(24);
  doc.setTextColor(PDF_COLORS.primary);
  doc.text(data.metadata.reportTitle, doc.internal.pageSize.width / 2, currentY + 20, {
    align: 'center',
  });

  currentY += 35;

  doc.setFontSize(14);
  doc.setTextColor(PDF_COLORS.text);
  doc.text(data.metadata.reportPeriod, doc.internal.pageSize.width / 2, currentY, {
    align: 'center',
  });

  currentY += 15;

  doc.setFontSize(10);
  doc.setTextColor(PDF_COLORS.text);
  doc.text(
    `Generated: ${new Date(data.metadata.generatedAt).toLocaleString('en-IE')}`,
    doc.internal.pageSize.width / 2,
    currentY,
    { align: 'center' }
  );

  // Executive Summary
  if (options.sections.summary) {
    doc.addPage();
    currentY = PDF_MARGINS.top;

    addSectionTitle(doc, 'Executive Summary', currentY);
    currentY += 15;

    // Summary box
    doc.setFillColor(PDF_COLORS.lightGray);
    doc.rect(PDF_MARGINS.left, currentY, doc.internal.pageSize.width - 40, 40, 'F');

    doc.setFontSize(10);
    doc.setTextColor(PDF_COLORS.text);

    const summaryText = [
      `Total Network: ${(data.summary.totalLength / 1000).toFixed(0)} km`,
      `Total Segments: ${data.summary.totalSegments.toLocaleString()}`,
      `Total Maintenance Cost: ${formatCurrency(data.summary.totalCost)}`,
      `Average Condition Score: ${data.summary.averageCondition.toFixed(1)}/100`,
    ];

    summaryText.forEach((text, index) => {
      doc.text(text, PDF_MARGINS.left + 5, currentY + 10 + (index * 8));
    });

    currentY += 50;
  }

  onProgress?.({
    stage: 'generating',
    percentage: 30,
    message: 'Adding KPIs...',
  });

  // KPIs Table
  if (options.sections.kpis) {
    addSectionTitle(doc, 'Key Performance Indicators', currentY);
    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      head: [['Indicator', 'Value', 'Unit']],
      body: data.kpis.map(kpi => [kpi.name, kpi.formatted, kpi.unit]),
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.primary },
      margin: { left: PDF_MARGINS.left, right: PDF_MARGINS.right },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  onProgress?.({
    stage: 'generating',
    percentage: 50,
    message: 'Adding category breakdown...',
  });

  // Category Breakdown
  if (options.sections.categoryBreakdown) {
    if (currentY > 200) {
      doc.addPage();
      currentY = PDF_MARGINS.top;
    }

    addSectionTitle(doc, 'Maintenance Category Breakdown', currentY);
    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      head: [['Category', 'Segments', 'Length (km)', 'Cost (€)', '%']],
      body: data.categoryAnalysis.map(cat => [
        cat.category,
        cat.segments.toLocaleString(),
        cat.lengthKm.toFixed(2),
        formatCurrency(cat.cost),
        `${cat.percentage.toFixed(1)}%`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.primary },
      margin: { left: PDF_MARGINS.left, right: PDF_MARGINS.right },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  onProgress?.({
    stage: 'generating',
    percentage: 70,
    message: 'Adding county analysis...',
  });

  // County Analysis (Top 10)
  if (options.sections.countyAnalysis && data.countyAnalysis.length > 0) {
    if (currentY > 180) {
      doc.addPage();
      currentY = PDF_MARGINS.top;
    }

    addSectionTitle(doc, 'County Analysis (Top 10)', currentY);
    currentY += 10;

    autoTable(doc, {
      startY: currentY,
      head: [['County', 'Segments', 'Length (km)', 'Cost (€)']],
      body: data.countyAnalysis.slice(0, 10).map(county => [
        county.name,
        county.totalSegments.toLocaleString(),
        county.totalLengthKm.toFixed(2),
        formatCurrency(county.totalCost),
      ]),
      theme: 'striped',
      headStyles: { fillColor: PDF_COLORS.primary },
      margin: { left: PDF_MARGINS.left, right: PDF_MARGINS.right },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    currentY = (doc as any).lastAutoTable.finalY + 10;
  }

  // Parameters Used
  if (options.sections.parameters) {
    doc.addPage();
    currentY = PDF_MARGINS.top;

    addSectionTitle(doc, 'Parameters Used', currentY);
    currentY += 10;

    // Thresholds
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Maintenance Thresholds:', PDF_MARGINS.left, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const thresholds = data.metadata.parameters.thresholds;
    const thresholdText = [
      `Reconstruction: IRI > ${thresholds.reconstruction.iri}, RUT > ${thresholds.reconstruction.rut}, PSCI ≤ ${thresholds.reconstruction.psci}`,
      `Overlay: IRI ≥ ${thresholds.overlay.iri}, RUT ≥ ${thresholds.overlay.rut}, PSCI ≤ ${thresholds.overlay.psci}`,
      `Restoration: PSCI ${thresholds.restoration.psci_lower}-${thresholds.restoration.psci_upper}, IRI ≥ ${thresholds.restoration.iri}`,
    ];

    thresholdText.forEach(text => {
      doc.text(text, PDF_MARGINS.left + 5, currentY);
      currentY += 6;
    });

    currentY += 5;

    // Costs
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Maintenance Costs (€/m²):', PDF_MARGINS.left, currentY);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    const costs = data.metadata.parameters.costs;
    const costText = [
      `Road Reconstruction: €${costs.reconstruction}/m²`,
      `Structural Overlay: €${costs.overlay}/m²`,
      `Surface Restoration: €${costs.restoration}/m²`,
      `Restoration of Skid Resistance: €${costs.skid}/m²`,
      `Routine Maintenance: €${costs.routine}/m²`,
    ];

    costText.forEach(text => {
      doc.text(text, PDF_MARGINS.left + 5, currentY);
      currentY += 6;
    });
  }

  // Add page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  onProgress?.({
    stage: 'complete',
    percentage: 100,
    message: 'PDF generation complete',
  });

  return doc;
}

/**
 * Trigger file download in browser
 */
export function downloadFile(
  content: string | Blob | jsPDF,
  fileName: string,
  mimeType?: string
): ExportResult {
  try {
    if (content instanceof jsPDF) {
      // Handle PDF download
      content.save(fileName);
      return {
        success: true,
        fileName,
      };
    }

    // Handle string/blob download
    const blob = content instanceof Blob
      ? content
      : new Blob([content], { type: mimeType || 'text/plain' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    return {
      success: true,
      fileName,
      fileSize: blob.size,
    };
  } catch (error) {
    console.error('Download failed:', error);
    return {
      success: false,
      fileName,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

// Helper Functions

function formatCurrency(value: number): string {
  if (value >= 1e9) return `€${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `€${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `€${(value / 1e3).toFixed(2)}K`;
  return `€${value.toFixed(2)}`;
}

function calculateAverageCondition(
  segments: CalculatedRoadSegment[],
  year: SurveyYear
): number {
  const weights = {
    'Routine Maintenance': 100,
    'Restoration of Skid Resistance': 80,
    'Surface Restoration': 60,
    'Structural Overlay': 40,
    'Road Reconstruction': 20,
  };

  let totalScore = 0;
  let totalCount = 0;

  for (const segment of segments) {
    const yearData = segment.data[year];
    if (yearData && yearData.category) {
      totalScore += weights[yearData.category] || 0;
      totalCount++;
    }
  }

  return totalCount > 0 ? totalScore / totalCount : 0;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): void {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(PDF_COLORS.primary);
  doc.text(title, PDF_MARGINS.left, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(PDF_COLORS.text);
}

// Main export function that combines everything
export async function exportReport(
  state: Pick<AnalyticsState, 'cache' | 'parameters' | 'chartFilters' | 'data'>,
  options: ExportOptions,
  onProgress?: ExportProgressCallback
): Promise<ExportResult> {
  try {
    onProgress?.({
      stage: 'preparing',
      percentage: 0,
      message: 'Preparing export data...',
    });

    // Prepare the data
    const exportData = prepareExportData(state, options);
    if (!exportData) {
      throw new Error('Failed to prepare export data');
    }

    // Generate file name if not provided
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const defaultFileName = `RMO_Report_${exportData.summary.year}_${timestamp}`;
    const fileName = options.fileName || defaultFileName;

    // Generate the appropriate format
    let result: ExportResult;

    switch (options.format) {
      case 'csv': {
        const csv = generateCSV(exportData, options, onProgress);
        result = downloadFile(csv, `${fileName}.csv`, 'text/csv');
        break;
      }

      case 'pdf': {
        const pdf = generatePDF(exportData, options, onProgress);
        result = downloadFile(pdf, `${fileName}.pdf`);
        break;
      }

      case 'excel': {
        // Excel export would require additional library (e.g., exceljs)
        // For now, fallback to CSV
        const csv = generateCSV(exportData, options, onProgress);
        result = downloadFile(csv, `${fileName}.csv`, 'text/csv');
        break;
      }

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    return result;
  } catch (error) {
    console.error('Export failed:', error);
    return {
      success: false,
      fileName: options.fileName || 'export',
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}