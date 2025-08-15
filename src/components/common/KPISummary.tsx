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
  const summaryData = useAnalyticsStore(state => state.data.summaryData);
  const fullDataset = useAnalyticsStore(state => state.data.fullDataset);
  const calculationResults = useAnalyticsStore(state => state.cache.results);
  const isLoading = useAnalyticsStore(state => state.ui.isLoading);
  
  // Calculate KPIs
  const kpis = useMemo(() => {
    logger.action('calculateKPIs', { 
      hasSummary: !!summaryData,
      hasResults: !!calculationResults.summary 
    });

    // Total Cost (from calculation if available, otherwise from summary)
    const totalCost = calculationResults.summary?.['2018']?.total_cost || 
                   summaryData?.totalCost || 
                   0;

    // Network Length (in km)
    const networkLength = summaryData?.totalLength 
      ? summaryData.totalLength / 1000 
      : 0;

    // Network Condition Score (simplified calculation)
    let conditionScore = 0;
    if (calculationResults.summary?.['2018']) {
      const summary2018 = calculationResults.summary['2018'];
      // Weight categories: RM=100, RS=80, SR=60, SO=40, RR=20
      const weights = {
        'Routine Maintenance': 100,
        'Restoration of Skid Resistance': 80,
        'Surface Restoration': 60,
        'Structural Overlay': 40,
        'Road Reconstruction': 20,
      };
      
      let totalWeighted = 0;
      let totalLength = 0;
      
      Object.entries(summary2018.by_category).forEach(([category, data]) => {
        const weight = weights[category as keyof typeof weights] || 0;
        totalWeighted += weight * data.total_length_m;
        totalLength += data.total_length_m;
      });
      
      conditionScore = totalLength > 0 ? totalWeighted / totalLength : 0;
    }

    // Segments processed
    const segmentsProcessed = calculationResults.segments?.length || 0;
    const totalSegments = fullDataset?.length || summaryData?.totalSegments || 0;

    return {
      totalCost,
      networkLength,
      conditionScore,
      segmentsProcessed,
      totalSegments,
    };
  }, [summaryData, fullDataset, calculationResults]);

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