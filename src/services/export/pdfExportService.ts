// src/services/export/pdfExportService.ts
import { jsPDF } from 'jspdf';
import autoTable, { UserOptions, RowInput } from 'jspdf-autotable';
import { logger } from '@/utils/logger';
import type {
  ExportData,
  ExportOptions,
  ExportResult,
  ExportProgressCallback,
  ExportKPI,
  ExportCategoryData,
  ExportCountyData,
} from '@/types/export';
import type { MaintenanceCategory } from '@/types/calculations';
import { COUNTY_NAMES } from '@/utils/countyLabels';

/**
 * PDF-specific export options
 */
export interface PDFExportOptions extends Omit<Partial<ExportOptions>, 'format'> {
  orientation?: 'portrait' | 'landscape';
  format?: 'a4' | 'letter' | 'a3';
  compress?: boolean;
  includePageNumbers?: boolean;
  includeTOC?: boolean;
  maxCountiesInTable?: number;
  chartImage?: string; // Base64 encoded chart image
  logoImage?: string; // Base64 encoded logo
}

/**
 * PDF Theme Configuration
 */
interface PDFTheme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    text: string;
    textSecondary: string;
    border: string;
    background: string;
  };
  fonts: {
    title: number;
    heading1: number;
    heading2: number;
    body: number;
    small: number;
  };
  spacing: {
    margin: number;
    padding: number;
    lineHeight: number;
  };
}

/**
 * Service for handling PDF export operations
 * Completely rebuilt to fix file corruption issues
 */
export class PDFExportService {
  private readonly theme: PDFTheme = {
    colors: {
      primary: '#1890ff',
      secondary: '#52c41a',
      success: '#52c41a',
      warning: '#faad14',
      danger: '#ff4d4f',
      text: '#262626',
      textSecondary: '#8c8c8c',
      border: '#d9d9d9',
      background: '#f0f0f0',
    },
    fonts: {
      title: 24,
      heading1: 18,
      heading2: 14,
      body: 11,
      small: 9,
    },
    spacing: {
      margin: 20,
      padding: 10,
      lineHeight: 7,
    },
  };

  private readonly MAINTENANCE_COLORS: Record<MaintenanceCategory, [number, number, number]> = {
    'Road Reconstruction': [255, 77, 79],
    'Structural Overlay': [250, 140, 22],
    'Surface Restoration': [250, 219, 20],
    'Restoration of Skid Resistance': [82, 196, 26],
    'Routine Maintenance': [24, 144, 255],
  };

  constructor(private readonly loggerPrefix: string = 'PDFExportService') {}

  /**
   * Main entry point for PDF export
   * FIXED: Returns blob instead of direct download
   */
  public async exportToPDF(
    data: ExportData,
    options: PDFExportOptions = {},
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult> {
    logger.info(this.loggerPrefix, 'Starting PDF export', {
      sections: options.sections,
      hasChartImage: !!options.chartImage,
    });

    try {
      onProgress?.({
        stage: 'preparing',
        percentage: 0,
        message: 'Preparing PDF export...',
      });

      // Generate PDF document
      const pdfBlob = await this.generatePDF(data, options, onProgress);

      // Generate filename
      const fileName = this.generateFileName(data, options);

      onProgress?.({
        stage: 'downloading',
        percentage: 95,
        message: 'Downloading PDF file...',
      });

      // Download the PDF
      const result = this.downloadPDF(pdfBlob, fileName);

      onProgress?.({
        stage: 'complete',
        percentage: 100,
        message: 'PDF export complete',
      });

      logger.info(this.loggerPrefix, 'PDF export completed successfully', { fileName });
      return result;

    } catch (error) {
      logger.error(this.loggerPrefix, 'PDF export failed', { error });
      return {
        success: false,
        fileName: options.fileName || 'export.pdf',
        error: error instanceof Error ? error.message : 'PDF export failed',
      };
    }
  }

  /**
   * Generate PDF document
   * FIXED: Properly generates blob with all content
   */
  public async generatePDF(
    data: ExportData,
    options: PDFExportOptions = {},
    onProgress?: ExportProgressCallback
  ): Promise<Blob> {
    const {
      orientation = 'portrait',
      format = 'a4',
      compress = true,
      includePageNumbers = true,
      sections = this.getDefaultSections(),
    } = options;

    // Initialize PDF with proper settings
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
      compress,
      putOnlyUsedFonts: true,
      floatPrecision: 2,
    });

    // Set document properties
    pdf.setProperties({
      title: data.metadata.reportTitle,
      subject: 'Road Maintenance Optimization Analysis',
      author: data.metadata.generatedBy || 'RMO Dashboard',
      keywords: 'road maintenance, infrastructure, analysis',
      creator: 'RMO Dashboard Export Service',
    });

    // Track current Y position
    let currentY = this.theme.spacing.margin;

    // Page 1: Title and Overview
    onProgress?.({
      stage: 'generating',
      percentage: 10,
      message: 'Adding title page...',
    });
    currentY = this.addTitlePage(pdf, data, options.logoImage);

    // Page 2: Executive Summary (if requested)
    if (sections.summary) {
      onProgress?.({
        stage: 'generating',
        percentage: 20,
        message: 'Adding executive summary...',
      });
      pdf.addPage();
      currentY = this.theme.spacing.margin;
      currentY = this.addExecutiveSummary(pdf, data, currentY);
    }

    // Page 3: Chart Visualization (if available)
    if (options.chartImage && sections.charts) {
      onProgress?.({
        stage: 'generating',
        percentage: 30,
        message: 'Adding chart visualization...',
      });
      pdf.addPage();
      currentY = this.theme.spacing.margin;
      currentY = this.addChartVisualization(pdf, options.chartImage, data, currentY);
    }

    // Page 4: KPIs
    if (sections.kpis && data.kpis.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 40,
        message: 'Adding key performance indicators...',
      });
      pdf.addPage();
      currentY = this.theme.spacing.margin;
      currentY = this.addKPIsSection(pdf, data.kpis, currentY);
    }

    // Page 5: Parameters & Thresholds
    if (sections.parameters) {
      onProgress?.({
        stage: 'generating',
        percentage: 50,
        message: 'Adding parameters and thresholds...',
      });
      if (currentY > 200) {
        pdf.addPage();
        currentY = this.theme.spacing.margin;
      }
      currentY = this.addParametersSection(pdf, data.metadata.parameters, currentY);
    }

    // Page 6: Category Breakdown
    if (sections.categoryBreakdown && data.categoryAnalysis.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 60,
        message: 'Adding category breakdown...',
      });
      pdf.addPage();
      currentY = this.theme.spacing.margin;
      currentY = this.addCategoryBreakdown(pdf, data.categoryAnalysis, currentY);
    }

    // Page 7: County Analysis (top N)
    if (sections.countyAnalysis && data.countyAnalysis.length > 0) {
      onProgress?.({
        stage: 'generating',
        percentage: 70,
        message: 'Adding county analysis...',
      });
      pdf.addPage();
      currentY = this.theme.spacing.margin;
      currentY = this.addCountyAnalysis(
        pdf, 
        data.countyAnalysis, 
        currentY, 
        options.maxCountiesInTable || 10
      );
    }

    // Page 8: Applied Filters
    if (data.metadata.filters.counties.length > 0 || data.metadata.filters.comparisonYear) {
      onProgress?.({
        stage: 'generating',
        percentage: 80,
        message: 'Adding filter information...',
      });
      if (currentY > 200) {
        pdf.addPage();
        currentY = this.theme.spacing.margin;
      }
      currentY = this.addFiltersSection(pdf, data.metadata.filters, currentY);
    }

    // Add page numbers and footers
    if (includePageNumbers) {
      onProgress?.({
        stage: 'generating',
        percentage: 90,
        message: 'Adding page numbers...',
      });
      this.addPageNumbers(pdf, data.metadata.reportTitle);
    }

    // CRITICAL FIX: Return blob instead of jsPDF instance
    return pdf.output('blob');
  }

  /**
   * Add title page to PDF
   */
  private addTitlePage(pdf: jsPDF, data: ExportData, logoImage?: string): number {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const centerX = pageWidth / 2;
    let y = 40;

    // Add logo if provided
    if (logoImage) {
      try {
        pdf.addImage(logoImage, 'PNG', centerX - 30, y, 60, 20);
        y += 30;
      } catch (error) {
        logger.warn(this.loggerPrefix, 'Failed to add logo', { error });
      }
    }

    // Main title
    pdf.setFontSize(this.theme.fonts.title);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.primary));
    pdf.text('Road Maintenance Optimization', centerX, y, { align: 'center' });
    y += 12;

    pdf.setFontSize(this.theme.fonts.heading1);
    pdf.text('Analysis Report', centerX, y, { align: 'center' });
    y += 20;

    // Report period
    pdf.setFontSize(this.theme.fonts.heading2);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.text));
    pdf.text(data.metadata.reportPeriod, centerX, y, { align: 'center' });
    y += 15;

    // Generation info box
    const boxWidth = 120;
    const boxHeight = 30;
    const boxX = centerX - boxWidth / 2;
    
    pdf.setFillColor(...this.hexToRgb(this.theme.colors.background));
    pdf.setDrawColor(...this.hexToRgb(this.theme.colors.border));
    pdf.rect(boxX, y, boxWidth, boxHeight, 'FD');

    pdf.setFontSize(this.theme.fonts.small);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.textSecondary));
    pdf.text('Generated on', centerX, y + 8, { align: 'center' });
    
    pdf.setFontSize(this.theme.fonts.body);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.text));
    const generatedDate = new Date(data.metadata.generatedAt).toLocaleString('en-IE');
    pdf.text(generatedDate, centerX, y + 16, { align: 'center' });
    
    pdf.setFontSize(this.theme.fonts.small);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.textSecondary));
    pdf.text(`by ${data.metadata.generatedBy || 'System'}`, centerX, y + 23, { align: 'center' });

    return y + boxHeight + 20;
  }

  /**
   * Add executive summary section
   */
  private addExecutiveSummary(pdf: jsPDF, data: ExportData, startY: number): number {
    let y = startY;

    // Section title
    this.addSectionTitle(pdf, 'Executive Summary', y);
    y += 12;

    // Summary box
    const pageWidth = pdf.internal.pageSize.getWidth();
    const boxWidth = pageWidth - (this.theme.spacing.margin * 2);
    const boxHeight = 50;
    
    pdf.setFillColor(...this.hexToRgb(this.theme.colors.background));
    pdf.setDrawColor(...this.hexToRgb(this.theme.colors.border));
    pdf.rect(this.theme.spacing.margin, y, boxWidth, boxHeight, 'FD');

    // Summary content
    pdf.setFontSize(this.theme.fonts.body);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.text));
    
    const summaryItems = [
      `Total Network Length: ${(data.summary.totalLength / 1000).toFixed(0)} km`,
      `Total Segments Analyzed: ${data.summary.totalSegments.toLocaleString()}`,
      `Total Maintenance Cost: €${(data.summary.totalCost / 1e6).toFixed(1)}M`,
      `Average Network Condition: ${data.summary.averageCondition.toFixed(1)}/100`,
      `Analysis Year: ${data.summary.year}`,
    ];

    summaryItems.forEach((item, index) => {
      pdf.text(item, this.theme.spacing.margin + 5, y + 10 + (index * 8));
    });

    y += boxHeight + 10;

    // Key findings
    this.addSubsectionTitle(pdf, 'Key Findings', y);
    y += 8;

    pdf.setFontSize(this.theme.fonts.small);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.textSecondary));

    // Identify highest cost category
    const highestCostCategory = data.categoryAnalysis.reduce((prev, curr) => 
      curr.cost > prev.cost ? curr : prev
    );

    const findings = [
      `• ${highestCostCategory.category} represents the highest cost at €${(highestCostCategory.cost / 1e6).toFixed(1)}M (${highestCostCategory.percentage.toFixed(1)}%)`,
      `• ${data.countyAnalysis.length} counties analyzed with varying maintenance needs`,
      data.metadata.filters.comparisonYear 
        ? `• Year-over-year comparison with ${data.metadata.filters.comparisonYear} included`
        : '• Single year analysis performed',
    ];

    findings.forEach((finding, index) => {
      pdf.text(finding, this.theme.spacing.margin, y + (index * 6));
    });

    return y + (findings.length * 6) + 10;
  }

  /**
   * Add chart visualization section
   */
  private addChartVisualization(
    pdf: jsPDF, 
    chartImage: string, 
    data: ExportData,
    startY: number
  ): number {
    let y = startY;

    // Section title
    this.addSectionTitle(pdf, 'Maintenance Category Distribution', y);
    y += 12;

    // Add chart image
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imageWidth = pageWidth - (this.theme.spacing.margin * 2);
    const imageHeight = imageWidth * 0.6; // 16:10 aspect ratio

    try {
      // Add border around image
      pdf.setDrawColor(...this.hexToRgb(this.theme.colors.border));
      pdf.setLineWidth(0.5);
      pdf.rect(
        this.theme.spacing.margin - 1, 
        y - 1, 
        imageWidth + 2, 
        imageHeight + 2
      );

      // Add the chart image
      pdf.addImage(
        chartImage,
        'PNG',
        this.theme.spacing.margin,
        y,
        imageWidth,
        imageHeight
      );

      y += imageHeight + 5;

      // Add chart caption
      pdf.setFontSize(this.theme.fonts.small);
      pdf.setTextColor(...this.hexToRgb(this.theme.colors.textSecondary));
      pdf.text(
        `Figure 1: Maintenance categories for ${data.summary.year} showing cost distribution across ${data.categoryAnalysis.length} categories`,
        pageWidth / 2,
        y,
        { align: 'center' }
      );

      y += 10;
    } catch (error) {
      logger.error(this.loggerPrefix, 'Failed to add chart image', { error });
      
      // Add placeholder text if image fails
      pdf.setFontSize(this.theme.fonts.body);
      pdf.setTextColor(...this.hexToRgb(this.theme.colors.danger));
      pdf.text('[Chart visualization could not be loaded]', pageWidth / 2, y, { align: 'center' });
      y += 10;
    }

    return y;
  }

  /**
   * Add KPIs section with formatted table
   */
  private addKPIsSection(pdf: jsPDF, kpis: ExportKPI[], startY: number): number {
    let y = startY;

    this.addSectionTitle(pdf, 'Key Performance Indicators', y);
    y += 12;

    // Prepare table data
    const tableHead: RowInput[] = [['Indicator', 'Value', 'Trend', 'Change']];
    const tableBody: RowInput[] = kpis.map(kpi => [
      kpi.name,
      kpi.formatted,
      kpi.trend ? `vs ${kpi.trend.previousYear}` : 'N/A',
      kpi.trend 
        ? `${kpi.trend.percentage > 0 ? '+' : ''}${kpi.trend.percentage.toFixed(1)}%`
        : '-',
    ]);

    // Add table with styling
    autoTable(pdf, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'grid',
      headStyles: {
        fillColor: this.hexToRgb(this.theme.colors.primary),
        textColor: [255, 255, 255],
        fontSize: this.theme.fonts.body,
        fontStyle: 'bold',
      },
      bodyStyles: {
        fontSize: this.theme.fonts.small,
        textColor: this.hexToRgb(this.theme.colors.text),
      },
      columnStyles: {
        '0': { cellWidth: 60 },
        '1': { cellWidth: 40, halign: 'right' },
        '2': { cellWidth: 30, halign: 'center' },
        '3': {
          cellWidth: 30, 
          halign: 'right',
        },
      },
      didParseCell: (data: any) => {
        if (data.section === 'body' && data.column.index === 3 && data.row.index < kpis.length) {
          const kpi = kpis[data.row.index];
          if (kpi?.trend) {
            data.cell.styles.textColor = kpi.trend.percentage > 0
              ? this.hexToRgb(this.theme.colors.danger)
              : this.hexToRgb(this.theme.colors.success);
          }
        }
      },
      margin: { left: this.theme.spacing.margin, right: this.theme.spacing.margin },
    } as UserOptions);

    return (pdf as any).lastAutoTable.finalY + 10;
  }

  /**
   * Add parameters and thresholds section
   */
  private addParametersSection(pdf: jsPDF, parameters: any, startY: number): number {
    let y = startY;

    this.addSectionTitle(pdf, 'Analysis Parameters', y);
    y += 12;

    // Thresholds subsection
    this.addSubsectionTitle(pdf, 'Maintenance Thresholds', y);
    y += 8;

    pdf.setFontSize(this.theme.fonts.small);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.text));

    const thresholds = parameters.thresholds;
    const thresholdText = [
      `• Road Reconstruction: IRI > ${thresholds.reconstruction.iri}, RUT > ${thresholds.reconstruction.rut}, PSCI ≤ ${thresholds.reconstruction.psci}`,
      `• Structural Overlay: IRI ≥ ${thresholds.overlay.iri}, RUT ≥ ${thresholds.overlay.rut}, PSCI ≤ ${thresholds.overlay.psci}`,
      `• Surface Restoration: PSCI ${thresholds.restoration.psci_lower}-${thresholds.restoration.psci_upper}, IRI ≥ ${thresholds.restoration.iri}`,
      `• Skid Resistance: Coefficient < ${thresholds.skid.value}`,
    ];

    thresholdText.forEach((text, index) => {
      pdf.text(text, this.theme.spacing.margin + 2, y + (index * 6));
    });

    y += (thresholdText.length * 6) + 10;

    // Costs subsection
    this.addSubsectionTitle(pdf, 'Unit Costs (€/m²)', y);
    y += 8;

    const costs = parameters.costs;
    const costData: RowInput[] = [
      ['Road Reconstruction', `€${costs.reconstruction}`],
      ['Structural Overlay', `€${costs.overlay}`],
      ['Surface Restoration', `€${costs.restoration}`],
      ['Restoration of Skid Resistance', `€${costs.skid}`],
      ['Routine Maintenance', `€${costs.routine}`],
    ];

    autoTable(pdf, {
      startY: y,
      body: costData,
      theme: 'plain',
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 30, halign: 'right', fontStyle: 'bold' },
      },
      bodyStyles: {
        fontSize: this.theme.fonts.small,
      },
      margin: { left: this.theme.spacing.margin + 2 },
    } as UserOptions);

    return (pdf as any).lastAutoTable.finalY + 10;
  }

  /**
   * Add category breakdown section
   */
  private addCategoryBreakdown(
    pdf: jsPDF, 
    categories: ExportCategoryData[], 
    startY: number
  ): number {
    let y = startY;

    this.addSectionTitle(pdf, 'Maintenance Category Breakdown', y);
    y += 12;

    // Prepare table with color coding
    const tableHead: RowInput[] = [['Category', 'Segments', 'Length (km)', 'Cost (€M)', '%']];
    const tableBody: RowInput[] = categories.map(cat => [
      cat.category,
      cat.segments.toLocaleString(),
      cat.lengthKm.toFixed(1),
      (cat.cost / 1e6).toFixed(2),
      `${cat.percentage.toFixed(1)}%`,
    ]);

    // Add totals row
    const totals = categories.reduce(
      (acc, cat) => ({
        segments: acc.segments + cat.segments,
        lengthKm: acc.lengthKm + cat.lengthKm,
        cost: acc.cost + cat.cost,
      }),
      { segments: 0, lengthKm: 0, cost: 0 }
    );

    tableBody.push([
      { content: 'TOTAL', styles: { fontStyle: 'bold' } },
      { content: totals.segments.toLocaleString(), styles: { fontStyle: 'bold' } },
      { content: totals.lengthKm.toFixed(1), styles: { fontStyle: 'bold' } },
      { content: (totals.cost / 1e6).toFixed(2), styles: { fontStyle: 'bold' } },
      { content: '100.0%', styles: { fontStyle: 'bold' } },
    ]);

    autoTable(pdf, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: this.hexToRgb(this.theme.colors.primary),
        textColor: [255, 255, 255],
        fontSize: this.theme.fonts.body,
      },
      bodyStyles: {
        fontSize: this.theme.fonts.small,
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
      willDrawCell: (data: any) => {
        // Add color indicator for categories
        if (data.section === 'body' && data.column.index === 0 && data.row.index < categories.length) {
          const category = categories[data.row.index].category as MaintenanceCategory;
          const color = this.MAINTENANCE_COLORS[category];
          if (color) {
            pdf.setFillColor(...color);
            pdf.rect(data.cell.x - 3, data.cell.y + 2, 2, data.cell.height - 4, 'F');
          }
        }
      },
      margin: { left: this.theme.spacing.margin, right: this.theme.spacing.margin },
    } as UserOptions);

    return (pdf as any).lastAutoTable.finalY + 10;
  }

  /**
   * Add county analysis section
   */
  private addCountyAnalysis(
    pdf: jsPDF,
    counties: ExportCountyData[],
    startY: number,
    maxCounties: number
  ): number {
    let y = startY;

    this.addSectionTitle(pdf, `County Analysis (Top ${maxCounties} by Cost)`, y);
    y += 12;

    // Sort and limit counties
    const topCounties = [...counties]
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, maxCounties);

    const tableHead: RowInput[] = [['County', 'Segments', 'Length (km)', 'Cost (€M)', 'Top Category']];
    const tableBody: RowInput[] = topCounties.map(county => {
      // Find the highest cost category for this county
      const topCategory = Object.entries(county.byCategory)
        .reduce((prev, [cat, data]) => 
          data.cost > prev.cost ? { category: cat, cost: data.cost } : prev,
        { category: 'Unknown', cost: 0 });

      return [
        COUNTY_NAMES[county.code] || county.name,
        county.totalSegments.toLocaleString(),
        county.totalLengthKm.toFixed(1),
        (county.totalCost / 1e6).toFixed(2),
        topCategory.category.replace('Restoration of Skid Resistance', 'Skid Restoration'),
      ];
    });

    autoTable(pdf, {
      startY: y,
      head: tableHead,
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: this.hexToRgb(this.theme.colors.primary),
        textColor: [255, 255, 255],
        fontSize: this.theme.fonts.body,
      },
      bodyStyles: {
        fontSize: this.theme.fonts.small,
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { cellWidth: 40 },
      },
      margin: { left: this.theme.spacing.margin, right: this.theme.spacing.margin },
    } as UserOptions);

    const finalY = (pdf as any).lastAutoTable.finalY + 5;

    // Add note if data was limited
    if (counties.length > maxCounties) {
      pdf.setFontSize(this.theme.fonts.small);
      pdf.setTextColor(...this.hexToRgb(this.theme.colors.textSecondary));
      pdf.text(
        `Note: Showing top ${maxCounties} of ${counties.length} counties by total cost`,
        this.theme.spacing.margin,
        finalY
      );
      return finalY + 8;
    }

    return finalY;
  }

  /**
   * Add filters section
   */
  private addFiltersSection(pdf: jsPDF, filters: any, startY: number): number {
    let y = startY;

    this.addSectionTitle(pdf, 'Applied Filters', y);
    y += 10;

    pdf.setFontSize(this.theme.fonts.small);
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.text));

    const filterItems: string[] = [];

    if (filters.year) {
      filterItems.push(`Primary Year: ${filters.year}`);
    }

    if (filters.comparisonYear) {
      filterItems.push(`Comparison Year: ${filters.comparisonYear}`);
    }

    if (filters.counties && filters.counties.length > 0) {
      const countyNames = filters.counties
        .map((code: string) => COUNTY_NAMES[code] || code)
        .join(', ');
      filterItems.push(`Selected Counties: ${countyNames}`);
    }

    if (filterItems.length === 0) {
      filterItems.push('No filters applied - showing all data');
    }

    filterItems.forEach((item, index) => {
      pdf.text(`• ${item}`, this.theme.spacing.margin + 2, y + (index * 6));
    });

    return y + (filterItems.length * 6) + 10;
  }

  /**
   * Add section title with consistent styling
   */
  private addSectionTitle(pdf: jsPDF, title: string, y: number): void {
    pdf.setFontSize(this.theme.fonts.heading1);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.primary));
    pdf.text(title, this.theme.spacing.margin, y);
    pdf.setFont('helvetica', 'normal');
  }

  /**
   * Add subsection title
   */
  private addSubsectionTitle(pdf: jsPDF, title: string, y: number): void {
    pdf.setFontSize(this.theme.fonts.heading2);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...this.hexToRgb(this.theme.colors.text));
    pdf.text(title, this.theme.spacing.margin, y);
    pdf.setFont('helvetica', 'normal');
  }

  /**
   * Add page numbers to all pages
   */
  private addPageNumbers(pdf: jsPDF, reportTitle: string): void {
    const pageCount = (pdf as any).internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Footer text
      pdf.setFontSize(this.theme.fonts.small);
      pdf.setTextColor(...this.hexToRgb(this.theme.colors.textSecondary));
      
      // Page number
      pdf.text(
        `Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 10,
        { align: 'center' }
      );
      
      // Report title in footer
      pdf.setFontSize(8);
      pdf.text(
        reportTitle,
        this.theme.spacing.margin,
        pageHeight - 10
      );
      
      // Timestamp
      pdf.text(
        new Date().toLocaleDateString('en-IE'),
        pageWidth - this.theme.spacing.margin,
        pageHeight - 10,
        { align: 'right' }
      );
    }
  }

  /**
   * Download PDF file
   * CRITICAL FIX: Properly handles blob download
   */
  public downloadPDF(blob: Blob, fileName: string): ExportResult {
    try {
      // Create object URL from blob
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 100);
      
      return {
        success: true,
        fileName,
        fileSize: blob.size,
      };
    } catch (error) {
      logger.error(this.loggerPrefix, 'PDF download failed', { error });
      return {
        success: false,
        fileName,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  /**
   * Generate filename for PDF
   */
  private generateFileName(data: ExportData, options: PDFExportOptions): string {
    if (options.fileName) {
      return options.fileName.endsWith('.pdf') 
        ? options.fileName 
        : `${options.fileName}.pdf`;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const year = data.summary.year;
    const counties = data.metadata.filters.counties.length > 0
      ? `_${data.metadata.filters.counties.length}Counties`
      : '';
    
    return `RMO_Report_${year}${counties}_${timestamp}.pdf`;
  }

  /**
   * Get default sections for PDF export
   */
  private getDefaultSections(): ExportOptions['sections'] {
    return {
      summary: true,
      parameters: true,
      kpis: true,
      categoryBreakdown: true,
      countyAnalysis: true,
      detailedSegments: false, // Too much data for PDF
      charts: true,
    };
  }

  /**
   * Convert hex color to RGB array for jsPDF
   */
  private hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  }

  /**
   * Validate PDF can be generated
   */
  public validateData(data: ExportData): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data) {
      errors.push('No export data provided');
      return { valid: false, errors };
    }

    if (!data.metadata) {
      errors.push('Missing metadata for PDF generation');
    }

    if (!data.summary) {
      errors.push('Missing summary data for PDF generation');
    }

    // PDFs should have at least some content
    if (!data.kpis?.length && !data.categoryAnalysis?.length) {
      errors.push('No data available to generate PDF report');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const pdfExportService = new PDFExportService();