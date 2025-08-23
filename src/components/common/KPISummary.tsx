// src/components/common/KPISummary.tsx
import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { KPICard } from './KPICard';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger } from '@/utils/logger';
import styles from './KPISummary.module.css';
import type { SurveyYear } from '@/types/data';
import type { TrendComparison } from '@/types/ui';

export const KPISummary: React.FC = () => {
  const logger = useComponentLogger('KPISummary');

  // Get data from store
  const fullDataset = useAnalyticsStore((state) => state.data.fullDataset);
  const { results: calculationResults } = useAnalyticsStore(
    (state) => state.cache
  );
  const { isLoading } = useAnalyticsStore((state) => state.ui);
  const { chartFilters } = useAnalyticsStore();

  // Calculate KPIs
  const { primaryKPIs, trendComparisons } = useMemo(() => {
    logger.action('calculateKPIs', {
      hasResults: !!calculationResults?.segments,
      filterCount: chartFilters.selectedCounties.length,
    });

    const years: SurveyYear[] = ['2011', '2018', '2025'];
    const kpisByYear: Record<
      SurveyYear,
      {
        totalCost: number;
        networkLength: number;
        conditionScore: number;
        segmentsProcessed: number;
        totalSegments: number;
      }
    > = { '2011': {} as any, '2018': {} as any, '2025': {} as any };

    // 1. Calculate KPIs for each year individually
    years.forEach((year) => {
      if (!calculationResults?.segments) {
        kpisByYear[year] = {
          totalCost: 0,
          networkLength: 0,
          conditionScore: 0,
          segmentsProcessed: 0,
          totalSegments: 0,
        };
        return;
      }

      const relevantSegments =
        chartFilters.selectedCounties.length > 0
          ? calculationResults.segments.filter((s) =>
              chartFilters.selectedCounties.includes(s.county)
            )
          : calculationResults.segments;

      let totalCost = 0;
      let totalLength = 0;
      let totalWeightedScore = 0;

      const weights = {
        'Routine Maintenance': 100,
        'Restoration of Skid Resistance': 80,
        'Surface Restoration': 60,
        'Structural Overlay': 40,
        'Road Reconstruction': 20,
      };

      for (const segment of relevantSegments) {
        const yearData = segment.data[year];
        if (yearData) {
          totalCost += yearData.cost;
          totalLength += 100; // Each segment is 100m
          const weight = weights[yearData.category as keyof typeof weights] || 0;
          totalWeightedScore += weight * 100;
        }
      }

      const conditionScore = totalLength > 0 ? totalWeightedScore / totalLength : 0;
      const segmentsProcessed = relevantSegments.filter(
        (s) => s.data[year]
      ).length;
      const totalSegments =
        chartFilters.selectedCounties.length > 0
          ? relevantSegments.length
          : fullDataset?.length || 0;

      kpisByYear[year] = {
        totalCost,
        networkLength: totalLength / 1000, // Convert to km
        conditionScore,
        segmentsProcessed,
        totalSegments,
      };
    });

    const primaryYear = chartFilters.primaryYear;
    const primaryKPIs = kpisByYear[primaryYear];

    // 2. Calculate trend comparisons against the primary year
    const trendComparisons: Record<string, TrendComparison[]> = {
      totalCost: [],
      networkLength: [],
      conditionScore: [],
      segmentsProcessed: [],
    };

    const comparisonYears = years.filter((y) => y !== primaryYear);

    // Loop through each KPI type to generate its trend data
    Object.keys(trendComparisons).forEach((key) => {
      trendComparisons[key] = comparisonYears
        .map((year): TrendComparison => {
          const prevValue =
            kpisByYear[year][key as keyof typeof primaryKPIs];
          const currValue =
            primaryKPIs[key as keyof typeof primaryKPIs];

          let percentChange = 0;
          if (prevValue !== 0) {
            percentChange = ((currValue - prevValue) / prevValue) * 100;
          } else if (currValue > 0) {
            percentChange = 100; // Default to 100% if previous value was 0
          }

          return {
            year,
            percentChange,
            direction:
              percentChange > 0.05
                ? 'up'
                : percentChange < -0.05
                ? 'down'
                : 'neutral',
          };
        })
        .filter(
          (t) =>
            kpisByYear[t.year][key as keyof typeof primaryKPIs] > 0
        ); // Only show trends for years with data
    });

    return { primaryKPIs, trendComparisons };
  }, [calculationResults, chartFilters, fullDataset, logger]);

  React.useEffect(() => {
    logger.mount({ kpis: primaryKPIs });
    return () => logger.unmount();
  }, [primaryKPIs, logger]);

  return (
    <div className={styles.kpiContainer}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Total Cost"
            primaryYear={chartFilters.primaryYear}
            value={primaryKPIs.totalCost}
            prefix="€"
            precision={0}
            loading={isLoading}
            description={`Estimated total maintenance cost for the ${chartFilters.primaryYear} network`}
            formatter={(value) => {
              const num = Number(value);
              if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
              if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
              if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
              return num.toString();
            }}
            color={primaryKPIs.totalCost > 1e9 ? 'warning' : 'default'}
            trends={trendComparisons.totalCost}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Network Length"
            primaryYear={chartFilters.primaryYear}
            value={primaryKPIs.networkLength}
            suffix="km"
            precision={0}
            loading={isLoading}
            description="Total Regional road network length under the selected filters"
            trends={trendComparisons.networkLength}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Condition Score"
            primaryYear={chartFilters.primaryYear}
            value={primaryKPIs.conditionScore}
            suffix="/100"
            precision={1}
            loading={isLoading}
            description="Overall network condition (100 = excellent)"
            color={
              primaryKPIs.conditionScore >= 80
                ? 'success'
                : primaryKPIs.conditionScore >= 60
                ? 'warning'
                : 'error'
            }
            trends={trendComparisons.conditionScore}
          />
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Segments in Analysis"
            primaryYear={chartFilters.primaryYear}
            value={primaryKPIs.segmentsProcessed}
            suffix={`/ ${primaryKPIs.totalSegments.toLocaleString()}`}
            loading={isLoading}
            description="Segments analyzed in current calculation vs. total available"
            color={
              primaryKPIs.segmentsProcessed === primaryKPIs.totalSegments
                ? 'success'
                : 'default'
            }
            trends={trendComparisons.segmentsProcessed}
          />
        </Col>
      </Row>
    </div>
  );
};