// src/workers/calculation.worker.ts
import * as Comlink from 'comlink';
import { nanoid } from 'nanoid';
import type {
  CalculationParams,
  CalculatedRoadSegment,
  CalculatedConditions,
  CalculationSummary,
  WorkerOutput,
  WorkerProgress,
  MaintenanceCategory,
  YearSummary,
  CategorySummary,
} from '@/types/calculations';
import type { RoadSegmentData, RoadConditions, SurveyYear } from '@/types/data';

class CalculationWorker {
  private abortController: AbortController | null = null;
  private readonly SEGMENT_LENGTH = 100; // Fixed 100m per segment

  /**
   * Get the width for calculations - prefer 2018, fallback to 2011
   */
  private getSegmentWidth(segment: RoadSegmentData): number {
    if (segment.data["2018"]?.width) {
      return segment.data["2018"].width;
    }
    if (segment.data["2011"]?.width) {
      return segment.data["2011"].width;
    }
    return 7; // Default width if no data
  }

  /**
   * Determine maintenance category based on condition parameters
   */
  private determineCategory(
    conditions: RoadConditions | null,
    thresholds: CalculationParams['thresholds']
  ): MaintenanceCategory | null {
    // No category if no conditions data
    if (!conditions) return null;

    // Handle null values - treat as worst case for safety
    const iri = conditions.iri ?? 999;  // High value = poor condition
    const rut = conditions.rut ?? 999;
    const psci = conditions.psci ?? 0;  // Low value = poor condition
    const csc = conditions.csc ?? 0;
    const mpd = conditions.mpd ?? 0;

    // Priority 1: Road Reconstruction
    if (
      iri > thresholds.reconstruction.iri ||
      rut > thresholds.reconstruction.rut ||
      psci <= thresholds.reconstruction.psci
    ) {
      return 'Road Reconstruction';
    }

    // Priority 2: Structural Overlay
    if (
      iri >= thresholds.overlay.iri ||
      rut >= thresholds.overlay.rut ||
      psci <= thresholds.overlay.psci
    ) {
      return 'Structural Overlay';
    }

    // Priority 3: Surface Restoration
    if (
      (psci <= thresholds.restoration.psci_upper &&
        psci >= thresholds.restoration.psci_lower) ||
      (iri >= thresholds.restoration.iri && psci >= 7)
    ) {
      return 'Surface Restoration';
    }

    // Priority 4: Restoration of Skid Resistance
    if (
      (psci <= thresholds.skid.psci_upper &&
        psci >= thresholds.skid.psci_lower) ||
      (csc <= thresholds.skid.csc && psci >= 9) ||
      (mpd <= thresholds.skid.mpd && psci >= 9)
    ) {
      return 'Restoration of Skid Resistance';
    }

    // Priority 5: Routine Maintenance
    return 'Routine Maintenance';
  }

  /**
   * Calculate cost for a segment based on category and area
   */
  private calculateCost(
    category: MaintenanceCategory | null,
    area: number,
    costs: CalculationParams['costs']
  ): number {
    if (!category) return 0;

    const costMap: Record<MaintenanceCategory, number> = {
      'Road Reconstruction': costs.reconstruction,
      'Structural Overlay': costs.overlay,
      'Surface Restoration': costs.restoration,
      'Restoration of Skid Resistance': costs.skid,
      'Routine Maintenance': costs.routine,
    };
    
    return area * costMap[category];
  }

  /**
   * Process a single road segment
   */
  private processSegment(
    segment: RoadSegmentData,
    params: CalculationParams
  ): CalculatedRoadSegment {
    const width = this.getSegmentWidth(segment);
    const segmentArea = this.SEGMENT_LENGTH * width; // 100m × width

    // Process 2011 data
    let calculated2011: CalculatedConditions | null = null;
    if (segment.data["2011"]) {
      const category = this.determineCategory(segment.data["2011"], params.thresholds);
      const cost = this.calculateCost(category, segmentArea, params.costs);
      calculated2011 = {
        ...segment.data["2011"],
        category: category || 'Routine Maintenance',
        cost,
      };
    }

    // Process 2018 data
    let calculated2018: CalculatedConditions | null = null;
    if (segment.data["2018"]) {
      const category = this.determineCategory(segment.data["2018"], params.thresholds);
      const cost = this.calculateCost(category, segmentArea, params.costs);
      calculated2018 = {
        ...segment.data["2018"],
        category: category || 'Routine Maintenance',
        cost,
      };
    }

    // Process 2025 data (will be null for now)
    let calculated2025: CalculatedConditions | null = null;
    if (segment.data["2025"]) {
      const category = this.determineCategory(segment.data["2025"], params.thresholds);
      const cost = this.calculateCost(category, segmentArea, params.costs);
      calculated2025 = {
        ...segment.data["2025"],
        category: category || 'Routine Maintenance',
        cost,
      };
    }

    return {
      ...segment,
      data: {
        "2011": calculated2011,
        "2018": calculated2018,
        "2025": calculated2025,
      },
    };
  }

  /**
   * Initialize category summary structure
   */
  private initializeCategorySummary(): Record<MaintenanceCategory, CategorySummary> {
    const categories: MaintenanceCategory[] = [
      'Road Reconstruction',
      'Structural Overlay',
      'Surface Restoration',
      'Restoration of Skid Resistance',
      'Routine Maintenance',
    ];

    return categories.reduce((acc, cat) => {
      acc[cat] = {
        total_length_m: 0,
        total_cost: 0,
        segment_count: 0,
        percentage: 0,
      };
      return acc;
    }, {} as Record<MaintenanceCategory, CategorySummary>);
  }

  /**
   * Aggregate results into summary for a specific year
   */
  private aggregateResults(
    segments: CalculatedRoadSegment[],
    year: SurveyYear
  ): YearSummary {
    const summary: YearSummary = {
      total_cost: 0,
      total_length_m: 0,
      total_segments: 0,
      by_category: this.initializeCategorySummary(),
      by_county: {},
    };

    for (const segment of segments) {
      const conditions = segment.data[year];
      
      // Skip segments with no data for this year
      if (!conditions || !conditions.category) continue;

      const category = conditions.category;
      const segmentLength = this.SEGMENT_LENGTH;

      // Update totals
      summary.total_cost += conditions.cost;
      summary.total_length_m += segmentLength;
      summary.total_segments += 1;

      // Update category summary
      summary.by_category[category].total_cost += conditions.cost;
      summary.by_category[category].total_length_m += segmentLength;
      summary.by_category[category].segment_count += 1;

      // Update county summary
      if (!summary.by_county[segment.county]) {
        summary.by_county[segment.county] = {
          total_cost: 0,
          total_length_m: 0,
          segment_count: 0,
        };
      }
      summary.by_county[segment.county].total_cost += conditions.cost;
      summary.by_county[segment.county].total_length_m += segmentLength;
      summary.by_county[segment.county].segment_count += 1;
    }

    // Calculate percentages
    if (summary.total_length_m > 0) {
      for (const category in summary.by_category) {
        const cat = category as MaintenanceCategory;
        summary.by_category[cat].percentage = 
          (summary.by_category[cat].total_length_m / summary.total_length_m) * 100;
      }
    }

    return summary;
  }

  /**
   * Main calculation method exposed via Comlink
   */
  async calculate(
    segments: RoadSegmentData[],
    params: CalculationParams,
    progressCallback?: (progress: WorkerProgress) => void
  ): Promise<WorkerOutput> {
    this.abortController = new AbortController();
    const calculationId = nanoid();
    const startTime = Date.now();
    
    try {
      // Report initial progress
      progressCallback?.({
        current: 0,
        total: segments.length,
        percentage: 0,
        stage: 'preparing',
        message: 'Preparing calculation...',
      });

      // Filter segments if counties specified
      let filteredSegments = segments;
      if (params.localAuthorities && params.localAuthorities.length > 0) {
        // Note: localAuthorities in params actually contains county codes
        filteredSegments = segments.filter(s => 
          params.localAuthorities!.includes(s.county)
        );
      }

      const totalSegments = filteredSegments.length;
      const calculatedSegments: CalculatedRoadSegment[] = [];
      const chunkSize = 1000; // Process in chunks for progress reporting

      // Process segments in chunks
      for (let i = 0; i < totalSegments; i += chunkSize) {
        if (this.abortController.signal.aborted) {
          throw new Error('Calculation aborted');
        }

        const chunk = filteredSegments.slice(i, Math.min(i + chunkSize, totalSegments));
        
        for (const segment of chunk) {
          calculatedSegments.push(this.processSegment(segment, params));
        }

        // Report progress
        const processed = Math.min(i + chunkSize, totalSegments);
        progressCallback?.({
          current: processed,
          total: totalSegments,
          percentage: (processed / totalSegments) * 100,
          stage: 'calculating',
          message: `Processing segments: ${processed}/${totalSegments}`,
        });
      }

      // Aggregate results
      progressCallback?.({
        current: totalSegments,
        total: totalSegments,
        percentage: 95,
        stage: 'aggregating',
        message: 'Aggregating results...',
      });

      // Create summaries based on selected year(s)
      const summary: CalculationSummary = {
        '2011': this.aggregateResults(calculatedSegments, '2011'),
        '2018': this.aggregateResults(calculatedSegments, '2018'),
        '2025': this.aggregateResults([], '2025'), // Remains empty as there is no 2025 data
      };

      const durationMs = Date.now() - startTime;

      // Complete
      progressCallback?.({
        current: totalSegments,
        total: totalSegments,
        percentage: 100,
        stage: 'complete',
        message: `Calculation complete in ${(durationMs / 1000).toFixed(2)}s`,
      });

      return {
        segments: calculatedSegments,
        summary,
        calculationId,
        timestamp: startTime,
      };
    } catch (error) {
      console.error('Calculation error:', error);
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Abort ongoing calculation
   */
  abort(): void {
    this.abortController?.abort();
  }

  /**
   * Health check for worker
   */
  ping(): string {
    return 'pong';
  }
}

// Expose the worker class via Comlink
Comlink.expose(new CalculationWorker());