// src/services/pdfReportService.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COUNTY_NAMES } from '@/utils/countyLabels';
import type { ParametersSlice } from '@/types/store';
import type { ChartFiltersState } from '@/store/slices/chartFiltersSlice';
import type { KPI } from '@/types/data';

interface ReportData {
  kpis: KPI[];
  parameters: ParametersSlice;
  filters: ChartFiltersState;
  timestamp: number | null;
}

class PdfReportService {
  public async generateReport(data: ReportData, chartImage: string): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 15;
    let yPosition = margin;

    // 1. Add Header
    this.addHeader(pdf, pageWidth, yPosition, data.filters.primaryYear);
    yPosition += 20;

    // 2. Add KPIs
    yPosition = this.addKpis(pdf, data.kpis, margin, yPosition);
    yPosition += 10;

    // 3. Add Parameters and Filters in a two-column layout
    yPosition = this.addParametersAndFilters(pdf, data.parameters, data.filters, margin, yPosition, pageWidth);
    yPosition += 15;

    // 4. Add Chart
    yPosition = this.addChart(pdf, chartImage, margin, yPosition, pageWidth);

    // 5. Add Footer
    this.addFooter(pdf, pageWidth);

    // 6. Save PDF
    pdf.save(`RMO_Report_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  private addHeader(pdf: jsPDF, pageWidth: number, yPosition: number, year: string): void {
    pdf.setFontSize(20);
    pdf.setTextColor(40, 40, 40);
    pdf.text('RMO Dashboard Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 8;
    pdf.setFontSize(12);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Survey Year: ${year}`, pageWidth / 2, yPosition, { align: 'center' });
  }

  private addKpis(pdf: jsPDF, kpis: KPI[], margin: number, yPosition: number): number {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Key Performance Indicators', margin, yPosition);
    yPosition += 7;

    autoTable(pdf, {
      startY: yPosition,
      head: [['Metric', 'Value']],
      body: kpis.map(kpi => [kpi.name, kpi.formatted]),
      theme: 'striped',
      headStyles: { fillColor: [22, 119, 255] },
    });

    return (pdf as any).lastAutoTable.finalY;
  }
  
  private addParametersAndFilters(pdf: jsPDF, parameters: ParametersSlice, filters: ChartFiltersState, margin: number, yPosition: number, pageWidth: number): number {
      const colWidth = (pageWidth - 3 * margin) / 2;

      // Column 1: Parameters
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Parameters', margin, yPosition);
      yPosition += 7;

      const paramData = [
          ...Object.entries(parameters.thresholds).map(([key, value]) => [key, value]),
          ...Object.entries(parameters.costs).map(([key, value]) => [key, `€${value}`])
      ];

      autoTable(pdf, {
          startY: yPosition,
          head: [['Parameter', 'Value']],
          body: paramData,
          theme: 'grid',
          margin: { left: margin, right: pageWidth - margin - colWidth },
      });

      const paramsY = (pdf as any).lastAutoTable.finalY;

      // Column 2: Filters
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Filters', margin + colWidth + margin, yPosition - 7);
      
      const filterData = [
          ['Primary Year', filters.primaryYear],
          ['Comparison Year', filters.compareYear || 'N/A'],
          ['Counties', filters.selectedCounties.length > 0 ? filters.selectedCounties.map(c => COUNTY_NAMES[c] || c).join(', ') : 'All Counties'],
          ['Sort By', filters.sortBy],
          ['Sort Order', filters.sortOrder],
          ['Top N', filters.showTopN ? `Top ${filters.showTopN}` : 'Not set']
      ];
      
      autoTable(pdf, {
          startY: yPosition,
          head: [['Filter', 'Setting']],
          body: filterData,
          theme: 'grid',
          margin: { left: margin + colWidth + margin, right: margin },
      });
      
      const filtersY = (pdf as any).lastAutoTable.finalY;

      return Math.max(paramsY, filtersY);
  }


  private addChart(pdf: jsPDF, chartImage: string, margin: number, yPosition: number, pageWidth: number): number {
    if (yPosition + 80 > pdf.internal.pageSize.getHeight()) {
        pdf.addPage();
        yPosition = margin;
    }
  
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Chart Analysis', margin, yPosition);
    yPosition += 7;
    
    const contentWidth = pageWidth - (margin * 2);
    const chartHeight = contentWidth * 0.6; // Maintain aspect ratio
    pdf.addImage(chartImage, 'PNG', margin, yPosition, contentWidth, chartHeight);
    
    return yPosition + chartHeight;
  }

  private addFooter(pdf: jsPDF, pageWidth: number): void {
    const pageCount = pdf.internal.pages.length;
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
    }
  }
}

export const pdfReportService = new PdfReportService();