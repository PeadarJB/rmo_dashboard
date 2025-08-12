// src/components/CalculationTest.tsx
import React from 'react';
import { Button, Progress, Alert, Card, Space, Statistic, Row, Col } from 'antd';
import { CalculatorOutlined, StopOutlined, ClearOutlined } from '@ant-design/icons';
import { useCalculation } from '@/hooks/useCalculation';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';

export const CalculationTest: React.FC = () => {
  const { calculate, abort, isCalculating, progress, error, results, clearCache } = useCalculation();
  
  // Use nested store structure
  const fullDataset = useAnalyticsStore(state => state.data.fullDataset);
  const hasData = !!fullDataset;
  const segmentCount = fullDataset?.length || 0;

  const handleCalculate = async () => {
    try {
      await calculate();
    } catch (err) {
      // Error is already handled by the hook
      console.error('Calculation failed:', err);
    }
  };

  return (
    <Card title="Calculation Engine Test" style={{ maxWidth: 800, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Status */}
        {!hasData && (
          <Alert
            type="warning"
            message="No data loaded"
            description="Please load the dataset first"
          />
        )}
        
        {error && (
          <Alert
            type="error"
            message="Calculation Error"
            description={error.message}
            closable
          />
        )}

        {/* Progress */}
        {isCalculating && progress && (
          <div>
            <Progress
              percent={Math.round(progress.percentage)}
              status="active"
              strokeColor={{ from: '#108ee9', to: '#87d068' }}
            />
            <p style={{ marginTop: 8, color: '#666' }}>
              {progress.message} ({progress.stage})
            </p>
          </div>
        )}

        {/* Results - with proper null checks */}
        {results && results.segments && results.summary && (
          <Card size="small" title="Calculation Results">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="Segments Processed"
                  value={results.segments.length}
                  suffix={`/ ${segmentCount}`}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Total Cost 2018"
                  value={results.summary['2018'].total_cost}
                  prefix="€"
                  precision={0}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="Calculation ID"
                  value={results.calculationId ? results.calculationId.slice(0, 8) : 'N/A'}
                />
              </Col>
            </Row>
            
            <div style={{ marginTop: 16 }}>
              <h4>2018 Category Breakdown:</h4>
              {Object.entries(results.summary['2018'].by_category).map(([category, data]) => (
                <div key={category} style={{ marginBottom: 8 }}>
                  <span style={{ display: 'inline-block', width: 250 }}>{category}:</span>
                  <span>{data.segment_count} segments</span>
                  <span style={{ marginLeft: 16 }}>({data.percentage.toFixed(1)}%)</span>
                  <span style={{ marginLeft: 16 }}>€{(data.total_cost / 1e6).toFixed(2)}M</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions */}
        <Space>
          <Button
            type="primary"
            icon={<CalculatorOutlined />}
            onClick={handleCalculate}
            disabled={!hasData || isCalculating}
            loading={isCalculating}
          >
            {isCalculating ? 'Calculating...' : 'Run Calculation'}
          </Button>
          
          {isCalculating && (
            <Button
              danger
              icon={<StopOutlined />}
              onClick={abort}
            >
              Abort
            </Button>
          )}
          
          <Button
            icon={<ClearOutlined />}
            onClick={clearCache}
            disabled={isCalculating}
          >
            Clear Cache
          </Button>
        </Space>
      </Space>
    </Card>
  );
};