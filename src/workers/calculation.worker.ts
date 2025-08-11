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
import type { RoadSegment, RoadConditions } from '@/types/data';

class CalculationWorker {
  private abortController: AbortController | null = null;

  /**
   * Determine maintenance category based on condition parameters
   */
  private determineCategory(
    conditions: RoadConditions,
    thresholds: CalculationParams['thresholds']
  ): MaintenanceCategory {
    // Priority 1: Road Reconstruction
    if (
      conditions.iri > thresholds.reconstruction.iri ||
      conditions.rut > thresholds.reconstruction.rut ||
      conditions.psci <= thresholds.reconstruction.psci
    ) {
      return 'Road Reconstruction';
    }

    // Priority 2: Structural Overlay
    if (
      conditions.iri >= thresholds.overlay.iri ||
      conditions.rut >= thresholds.overlay.rut ||
      conditions.psci <= thresholds.overlay.psci
    ) {
      return 'Structural Overlay';
    }

    // Priority 3: Surface Restoration
    if (
      (conditions.psci <= thresholds.restoration.psci_upper &&
        conditions.psci >= thresholds.restoration.psci_lower) ||
      (conditions.iri >= thresholds.restoration.iri && conditions.psci >= 7)
    ) {
      return 'Surface Restoration';
    }

    // Priority 4: Restoration of Skid Resistance
    if (
      (conditions.psci <= thresholds.skid.psci_upper &&
        conditions.psci >= thresholds.skid.psci_lower) ||
      (conditions.csc <= thresholds.skid.csc && conditions.psci >= 9) ||
      (conditions.mpd <= thresholds.skid.mpd && conditions.psci >= 9)
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
    category: MaintenanceCategory,
    area: number,
    costs: CalculationParams['costs']
  ): number {
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
    segment: RoadSegment,
    params: CalculationParams
  ): CalculatedRoadSegment {
    // Calculate conditions for 2011
    const category2011 = this.determineCategory(segment.conditions_2011, params.thresholds);
    const cost2011 = this.calculateCost(category2011, segment.conditions_2011.sqm, params.costs);

    // Calculate conditions for 2018
    const category2018 = this.determineCategory(segment.conditions_2018, params.thresholds);
    const cost2018 = this.calculateCost(category2018, segment.conditions_2018.sqm, params.costs);

    return {
      ...segment,
      conditions_2011: {
        ...segment.conditions_2011,
        category: category2011,
        cost: cost2011,
      } as CalculatedConditions,
      conditions_2018: {
        ...segment.conditions_2018,
        category: category2018,
        cost: cost2018,
      } as CalculatedConditions,
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
   * Aggregate results into summary
   */
  private aggregateResults(
    segments: CalculatedRoadSegment[],
    year: '2011' | '2018'
  ): YearSummary {
    const summary: YearSummary = {
      total_cost: 0,
      total_length_m: 0,
      total_segments: segments.length,
      by_category: this.initializeCategorySummary(),
      by_la: {},
    };

    for (const segment of segments) {
      const conditions = year === '2011' ? segment.conditions_2011 : segment.conditions_2018;
      const category = conditions.category;
      
      if (!category) continue;

      // Update totals
      summary.total_cost += conditions.cost;
      summary.total_length_m += segment.length_m;

      // Update category summary
      summary.by_category[category].total_cost += conditions.cost;
      summary.by_category[category].total_length_m += segment.length_m;
      summary.by_category[category].segment_count += 1;

      // Update LA summary
      if (!summary.by_la[segment.la_name]) {
        summary.by_la[segment.la_name] = {
          total_cost: 0,
          total_length_m: 0,
          segment_count: 0,
        };
      }
      summary.by_la[segment.la_name].total_cost += conditions.cost;
      summary.by_la[segment.la_name].total_length_m += segment.length_m;
      summary.by_la[segment.la_name].segment_count += 1;
    }

    // Calculate percentages
    for (const category in summary.by_category) {
      const cat = category as MaintenanceCategory;
      summary.by_category[cat].percentage = 
        (summary.by_category[cat].total_length_m / summary.total_length_m) * 100;
    }

    return summary;
  }

  /**
   * Main calculation method exposed via Comlink
   */
  async calculate(
    segments: RoadSegment[],
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

      // Filter segments if local authorities specified
      let filteredSegments = segments;
      if (params.localAuthorities && params.localAuthorities.length > 0) {
        filteredSegments = segments.filter(s => 
          params.localAuthorities!.includes(s.la_name)
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

      const summary: CalculationSummary = {
        '2011': params.selectedYear !== '2018' 
          ? this.aggregateResults(calculatedSegments, '2011')
          : this.aggregateResults([], '2011'), // Empty if not selected
        '2018': params.selectedYear !== '2011'
          ? this.aggregateResults(calculatedSegments, '2018')
          : this.aggregateResults([], '2018'), // Empty if not selected
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