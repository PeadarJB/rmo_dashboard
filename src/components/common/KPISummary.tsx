// src/components/common/KPISummary.tsx
import React, { useMemo } from 'react';
import { Row, Col } from 'antd';
import { KPICard } from './KPICard';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger } from '@/utils/logger';
import styles from './KPISummary.module.css';

export const KPISummary: React.FC = () => {
  const logger = useComponentLogger('KPISummary');
  
  // Get data from store
  const fullDataset = useAnalyticsStore(state => state.data.fullDataset);
  const { results: calculationResults } = useAnalyticsStore(state => state.cache);
  const { isLoading } = useAnalyticsStore(state => state.ui);
  const { chartFilters } = useAnalyticsStore();
  
  // Calculate KPIs
  const kpis = useMemo(() => {
  logger.action('calculateKPIs', {
    hasResults: !!calculationResults?.segments,
    filterCount: chartFilters.selectedCounties.length,
  });

  // Use the primary year selected in the chart filters.
  const yearToDisplay = chartFilters.primaryYear;

  // Guard against missing data.
  if (!calculationResults?.segments) {
    return { totalCost: 0, networkLength: 0, conditionScore: 0, segmentsProcessed: 0, totalSegments: 0 };
  }

  // Filter segments based on the chartFilters state.
  const relevantSegments =
    chartFilters.selectedCounties.length > 0
      ? calculationResults.segments.filter(s => chartFilters.selectedCounties.includes(s.county))
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

  // Aggregate data from the filtered segments.
  for (const segment of relevantSegments) {
    const yearData = segment.data[yearToDisplay];
    if (yearData) {
      totalCost += yearData.cost;
      totalLength += 100; // Each segment is 100m

      const weight = weights[yearData.category as keyof typeof weights] || 0;
      totalWeightedScore += weight * 100; // Multiply by segment length
    }
  }

  const conditionScore = totalLength > 0 ? totalWeightedScore / totalLength : 0;
  const segmentsProcessed = relevantSegments.length;
  const totalSegments = chartFilters.selectedCounties.length > 0 
    ? relevantSegments.length // Show count of filtered segments
    : fullDataset?.length || 0; // Show total network count

  return {
    totalCost,
    networkLength: totalLength / 1000, // Convert to km
    conditionScore,
    segmentsProcessed,
    totalSegments,
  };
}, [calculationResults, chartFilters, fullDataset, logger]);

  React.useEffect(() => {
    logger.mount({ kpis });
    return () => logger.unmount();
  }, []);

  return (
    <div className={styles.kpiContainer}>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Total Cost"
            value={kpis.totalCost}
            prefix="€"
            precision={0}
            loading={isLoading}
            description="Estimated total maintenance cost for 2018 network"
            formatter={(value) => {
              const num = Number(value);
              if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
              if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
              if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
              return num.toString();
            }}
            color={kpis.totalCost > 1e9 ? 'warning' : 'default'}
          />
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Network Length"
            value={kpis.networkLength}
            suffix="km"
            precision={0}
            loading={isLoading}
            description="Total Regional road network length"
            trend={kpis.networkLength > 0 ? {
              value: 2.3,
              isPositive: true
            } : undefined}
          />
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Condition Score"
            value={kpis.conditionScore}
            suffix="/100"
            precision={1}
            loading={isLoading}
            description="Overall network condition (100 = excellent)"
            color={
              kpis.conditionScore >= 80 ? 'success' :
              kpis.conditionScore >= 60 ? 'warning' :
              'error'
            }
          />
        </Col>
        
        <Col xs={24} sm={12} lg={6}>
          <KPICard
            title="Analysis Progress"
            value={kpis.segmentsProcessed}
            suffix={`/ ${kpis.totalSegments.toLocaleString()}`}
            loading={isLoading}
            description="Segments analyzed in current calculation"
            color={kpis.segmentsProcessed === kpis.totalSegments ? 'success' : 'default'}
          />
        </Col>
      </Row>
    </div>
  );
};