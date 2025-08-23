// src/services/reportService.ts
import type {
  ExportData,
  ExportOptions,
  ReportMetadata,
  ExportKPI,
  ExportCategoryData,
  ExportCountyData,
} from '@/types/export';
import type {
  CalculatedRoadSegment,
  CalculationSummary,
  MaintenanceCategory,
} from '@/types/calculations';
import type { SurveyYear, SummaryData } from '@/types/data';
import type { ChartFiltersState } from '@/store/slices/chartFiltersSlice';
import type { ParametersSlice } from '@/types/store';
import { COUNTY_NAMES } from '@/utils/countyLabels';

export interface ReportDataSources {
  calculatedSegments: CalculatedRoadSegment[] | null;
  calculationSummary: CalculationSummary | null;
  chartFilters: ChartFiltersState;
  parameters: ParametersSlice;
  summaryData: SummaryData | null;
  timestamp: number | null;
}

export interface ReportOptions {
  includeFiltered: boolean;
  maxSegments?: number;
  includeComparison: boolean;
  includeParameters: boolean;
  dateRange?: {
    start: SurveyYear;
    end: SurveyYear;
  };
}

export class ReportService {
  /**
   * Main method to gather all report data from various sources
   */
  async gatherReportData(
    sources: ReportDataSources,
    options: ReportOptions = { 
      includeFiltered: true, 
      includeComparison: true,
      includeParameters: true 
    }
  ): Promise<ExportData | null> {
    // Validate data availability
    if (!sources.calculatedSegments || !sources.calculationSummary) {
      throw new Error('No calculation results available for report generation');
    }

    // Apply filters to segments if needed
    const filteredSegments = this.applyCurrentFilters(
      sources.calculatedSegments,
      sources.chartFilters,
      options.includeFiltered
    );

    // Get the primary year for analysis
    const primaryYear = sources.chartFilters.primaryYear;
    const yearSummary = sources.calculationSummary[primaryYear];

    if (!yearSummary) {
      throw new Error(`No data available for year ${primaryYear}`);
    }

    // Generate metadata
    const metadata = this.generateMetadata(
      sources,
      filteredSegments.length,
      yearSummary
    );

    // Calculate KPIs
    const kpis = this.calculateKPIs(
      yearSummary,
      filteredSegments,
      primaryYear,
      sources.calculationSummary
    );

    // Generate category analysis
    const categoryAnalysis = this.generateCategoryAnalysis(
      yearSummary,
      sources.chartFilters
    );

    // Generate county analysis
    const countyAnalysis = this.generateCountyAnalysis(
      filteredSegments,
      primaryYear,
      sources.chartFilters
    );

    // Calculate summary statistics
    const summaryStats = this.calculateSummaryStats(
      filteredSegments,
      primaryYear,
      yearSummary
    );

    // Build the export data structure
    const exportData: ExportData = {
      metadata,
      kpis,
      summary: summaryStats,
      categoryAnalysis,
      countyAnalysis,
    };

    // Add detailed segments if within limit
    if (options.maxSegments && options.maxSegments > 0) {
      exportData.segments = filteredSegments.slice(0, options.maxSegments);
    }

    // Add comparison data if requested and available
    if (options.includeComparison && sources.chartFilters.compareYear) {
      exportData.comparisonData = this.gatherComparisonData(
        sources.calculationSummary,
        sources.chartFilters.compareYear
      );
    }

    return exportData;
  }

  /**
   * Apply current filters to the segment data
   */
  applyCurrentFilters(
    segments: CalculatedRoadSegment[],
    filters: ChartFiltersState,
    applyFilters: boolean
  ): CalculatedRoadSegment[] {
    if (!applyFilters) {
      return segments;
    }

    let filtered = [...segments];

    // Apply county filter
    if (filters.selectedCounties.length > 0) {
      filtered = filtered.filter(segment =>
        filters.selectedCounties.includes(segment.county)
      );
    }

    // Apply top N filter if set
    if (filters.showTopN !== null && filters.showTopN > 0) {
      // Sort by cost (descending) and take top N
      filtered = filtered
        .sort((a, b) => {
          const aCost = a.data[filters.primaryYear]?.cost || 0;
          const bCost = b.data[filters.primaryYear]?.cost || 0;
          return bCost - aCost;
        })
        .slice(0, filters.showTopN);
    }

    // Apply sorting
    if (filters.sortBy === 'alphabetical') {
      filtered.sort((a, b) => {
        const aName = COUNTY_NAMES[a.county] || a.county;
        const bName = COUNTY_NAMES[b.county] || b.county;
        return filters.sortOrder === 'asc' 
          ? aName.localeCompare(bName)
          : bName.localeCompare(aName);
      });
    } else {
      // Sort by value (cost)
      filtered.sort((a, b) => {
        const aCost = a.data[filters.primaryYear]?.cost || 0;
        const bCost = b.data[filters.primaryYear]?.cost || 0;
        return filters.sortOrder === 'asc' 
          ? aCost - bCost
          : bCost - aCost;
      });
    }

    return filtered;
  }

  /**
   * Calculate summary statistics for the report
   */
  calculateSummaryStats(
    segments: CalculatedRoadSegment[],
    year: SurveyYear,
    yearSummary: any
  ): ExportData['summary'] {
    // Calculate average condition based on maintenance categories
    const conditionWeights: Record<MaintenanceCategory, number> = {
      'Routine Maintenance': 100,
      'Restoration of Skid Resistance': 80,
      'Surface Restoration': 60,
      'Structural Overlay': 40,
      'Road Reconstruction': 20,
    };

    let totalConditionScore = 0;
    let validSegments = 0;

    segments.forEach(segment => {
      const yearData = segment.data[year];
      if (yearData?.category) {
        totalConditionScore += conditionWeights[yearData.category as MaintenanceCategory] || 0;
        validSegments++;
      }
    });

    const averageCondition = validSegments > 0 
      ? totalConditionScore / validSegments 
      : 0;

    return {
      year,
      totalSegments: yearSummary.total_segments,
      totalLength: yearSummary.total_length_m,
      totalCost: yearSummary.total_cost,
      averageCondition,
    };
  }

  /**
   * Generate report metadata
   */
  private generateMetadata(
    sources: ReportDataSources,
    filteredCount: number,
    yearSummary: any
  ): ReportMetadata {
    const now = new Date();
    
    return {
      generatedAt: now.toISOString(),
      generatedBy: 'RMO Dashboard User',
      reportTitle: `Regional Road Maintenance Analysis - ${sources.chartFilters.primaryYear}`,
      reportPeriod: `Survey Year ${sources.chartFilters.primaryYear}`,
      dataSource: 'Regional Road Survey Data',
      filters: {
        year: sources.parameters.selectedYear,
        counties: sources.chartFilters.selectedCounties,
        comparisonYear: sources.chartFilters.compareYear,
      },
      parameters: {
        thresholds: sources.parameters.thresholds,
        costs: sources.parameters.costs,
      },
      recordCount: filteredCount,
      totalNetworkLength: yearSummary.total_length_m,
      totalCost: yearSummary.total_cost,
    };
  }

  /**
   * Calculate KPIs for the report
   */
  private calculateKPIs(
    yearSummary: any,
    segments: CalculatedRoadSegment[],
    primaryYear: SurveyYear,
    fullSummary: CalculationSummary | null
  ): ExportKPI[] {
    const kpis: ExportKPI[] = [];

    // Total Cost KPI
    kpis.push({
      name: 'Total Maintenance Cost',
      value: yearSummary.total_cost,
      unit: '€',
      formatted: this.formatCurrency(yearSummary.total_cost),
    });

    // Network Length KPI
    const networkLengthKm = yearSummary.total_length_m / 1000;
    kpis.push({
      name: 'Network Length',
      value: networkLengthKm,
      unit: 'km',
      formatted: `${networkLengthKm.toFixed(0)} km`,
    });

    // Total Segments KPI
    kpis.push({
      name: 'Total Segments',
      value: yearSummary.total_segments,
      unit: 'segments',
      formatted: yearSummary.total_segments.toLocaleString('en-IE'),
    });

    // Average Cost per km
    const avgCostPerKm = yearSummary.total_cost / networkLengthKm;
    kpis.push({
      name: 'Average Cost per km',
      value: avgCostPerKm,
      unit: '€/km',
      formatted: this.formatCurrency(avgCostPerKm),
    });

    // Cost per segment
    const costPerSegment = yearSummary.total_cost / yearSummary.total_segments;
    kpis.push({
      name: 'Average Cost per Segment',
      value: costPerSegment,
      unit: '€/segment',
      formatted: this.formatCurrency(costPerSegment),
    });

    // Add trends if we have comparison data
    if (fullSummary) {
      const previousYear = primaryYear === '2018' ? '2011' : 
                          primaryYear === '2025' ? '2018' : null;
      
      if (previousYear && fullSummary[previousYear]) {
        const prevSummary = fullSummary[previousYear];
        
        // Add trend to cost KPI
        if (prevSummary.total_cost > 0) {
          const costChange = yearSummary.total_cost - prevSummary.total_cost;
          const costChangePercent = (costChange / prevSummary.total_cost) * 100;
          
          kpis[0].trend = {
            previousYear,
            change: costChange,
            percentage: costChangePercent,
          };
        }

        // Add trend to network length KPI
        if (prevSummary.total_length_m > 0) {
          const lengthChange = yearSummary.total_length_m - prevSummary.total_length_m;
          const lengthChangePercent = (lengthChange / prevSummary.total_length_m) * 100;
          
          kpis[1].trend = {
            previousYear,
            change: lengthChange / 1000, // Convert to km
            percentage: lengthChangePercent,
          };
        }
      }
    }

    return kpis;
  }

  /**
   * Generate category analysis data
   */
  private generateCategoryAnalysis(
    yearSummary: any,
    filters: ChartFiltersState
  ): ExportCategoryData[] {
    const categories = Object.entries(yearSummary.by_category)
      .map(([category, data]: [string, any]) => ({
        category: category as MaintenanceCategory,
        segments: data.segment_count,
        lengthKm: data.total_length_m / 1000,
        cost: data.total_cost,
        percentage: data.percentage,
      }));

    // Apply sorting based on filters
    if (filters.sortBy === 'alphabetical') {
      categories.sort((a, b) => {
        const comparison = a.category.localeCompare(b.category);
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      categories.sort((a, b) => {
        const comparison = a.cost - b.cost;
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return categories;
  }

  /**
   * Generate county analysis data
   */
  private generateCountyAnalysis(
    segments: CalculatedRoadSegment[],
    year: SurveyYear,
    filters: ChartFiltersState
  ): ExportCountyData[] {
    const countyMap = new Map<string, ExportCountyData>();

    // Aggregate data by county
    segments.forEach(segment => {
      const yearData = segment.data[year];
      if (!yearData) return;

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
      county.totalLengthKm += 0.1; // Each segment is 100m = 0.1km
      county.totalCost += yearData.cost;

      // Initialize category if needed
      const category = yearData.category as MaintenanceCategory;
      if (!county.byCategory[category]) {
        county.byCategory[category] = {
          segments: 0,
          lengthKm: 0,
          cost: 0,
        };
      }

      county.byCategory[category].segments++;
      county.byCategory[category].lengthKm += 0.1;
      county.byCategory[category].cost += yearData.cost;
    });

    const countyAnalysis = Array.from(countyMap.values());

    // Apply sorting
    if (filters.sortBy === 'alphabetical') {
      countyAnalysis.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      countyAnalysis.sort((a, b) => {
        const comparison = a.totalCost - b.totalCost;
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    // Apply top N if set
    if (filters.showTopN !== null && filters.showTopN > 0) {
      return countyAnalysis.slice(0, filters.showTopN);
    }

    return countyAnalysis;
  }

  /**
   * Gather comparison data for a specific year
   */
  private gatherComparisonData(
    summary: CalculationSummary,
    compareYear: SurveyYear
  ): ExportData['comparisonData'] | undefined {
    const yearSummary = summary[compareYear];
    if (!yearSummary) return undefined;

    const categoryAnalysis = Object.entries(yearSummary.by_category)
      .map(([category, data]: [string, any]) => ({
        category: category as MaintenanceCategory,
        segments: data.segment_count,
        lengthKm: data.total_length_m / 1000,
        cost: data.total_cost,
        percentage: data.percentage,
      }))
      .sort((a, b) => b.cost - a.cost);

    return {
      year: compareYear,
      summary: yearSummary,
      categoryAnalysis,
    };
  }

  /**
   * Utility: Format currency values
   */
  private formatCurrency(value: number): string {
    if (value >= 1e9) return `€${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `€${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `€${(value / 1e3).toFixed(0)}K`;
    return `€${value.toFixed(2)}`;
  }

  /**
   * Get export filename based on current state
   */
  generateFileName(
    format: 'pdf' | 'csv' | 'excel',
    filters: ChartFiltersState,
    includeTimestamp: boolean = true
  ): string {
    const parts = ['RMO'];
    
    // Add report type
    parts.push('Report');
    
    // Add year
    parts.push(filters.primaryYear);
    
    // Add filter indicator
    if (filters.selectedCounties.length > 0) {
      if (filters.selectedCounties.length === 1) {
        parts.push(filters.selectedCounties[0]);
      } else {
        parts.push(`${filters.selectedCounties.length}Counties`);
      }
    }
    
    // Add comparison indicator
    if (filters.compareYear) {
      parts.push(`vs${filters.compareYear}`);
    }
    
    // Add timestamp
    if (includeTimestamp) {
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .slice(0, -5);
      parts.push(timestamp);
    }
    
    return `${parts.join('_')}.${format}`;
  }

  /**
   * Validate that sufficient data exists for export
   */
  validateExportData(sources: ReportDataSources): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!sources.calculatedSegments || sources.calculatedSegments.length === 0) {
      errors.push('No calculated segments available');
    }

    if (!sources.calculationSummary) {
      errors.push('No calculation summary available');
    }

    if (!sources.chartFilters.primaryYear) {
      errors.push('No primary year selected');
    }

    if (sources.chartFilters.primaryYear && sources.calculationSummary) {
      const yearData = sources.calculationSummary[sources.chartFilters.primaryYear];
      if (!yearData) {
        errors.push(`No data available for year ${sources.chartFilters.primaryYear}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance
export const reportService = new ReportService();