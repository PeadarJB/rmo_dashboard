// src/components/DataLoaderTest.tsx
import React, { useState } from 'react';
import { Button, Progress, Alert, Card, Space, Statistic, Row, Col } from 'antd';
import { CloudDownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { dataLoader } from '@/services/dataLoader';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import type { DataLoadProgress } from '@/types/data';

export const DataLoaderTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<DataLoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Use nested store structure with individual selectors
  const summaryData = useAnalyticsStore(state => state.data.summaryData);
  const fullDataset = useAnalyticsStore(state => state.data.fullDataset);
  const setSummaryData = useAnalyticsStore(state => state.setSummaryData);
  const setFullDataset = useAnalyticsStore(state => state.setFullDataset);
  const setLoadProgress = useAnalyticsStore(state => state.setLoadProgress);
  const setLoadError = useAnalyticsStore(state => state.setLoadError);
  const setIsLoading = useAnalyticsStore(state => state.setIsLoading);
  const clearData = useAnalyticsStore(state => state.clearData);

  const handleLoadData = async () => {
    setLoading(true);
    setError(null);
    setIsLoading(true);

    try {
      const result = await dataLoader.loadTwoStage((progress) => {
        setProgress(progress);
        setLoadProgress(progress);
      });

      setSummaryData(result.summary);
      setFullDataset(result.full);
      
      console.log('Data loaded successfully:', {
        summary: result.summary,
        segments: result.full.length,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load data';
      setError(errorMsg);
      setLoadError(errorMsg);
    } finally {
      setLoading(false);
      setIsLoading(false);
    }
  };

  const handleClearData = () => {
    clearData();
    dataLoader.clearCache();
    setProgress(null);
    setError(null);
  };

  return (
    <Card title="Data Loader Test" style={{ maxWidth: 800, margin: '20px auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Status */}
        {error && (
          <Alert
            type="error"
            message="Load Error"
            description={error}
            closable
            onClose={() => setError(null)}
          />
        )}

        {/* Progress */}
        {loading && progress && (
          <div>
            <Progress
              percent={Math.round(progress.progress)}
              status="active"
              format={(percent) => `${percent}% - ${progress.stage}`}
            />
            {progress.stage === 'loading-summary' && (
              <p style={{ marginTop: 8, color: '#666' }}>Loading summary data...</p>
            )}
            {progress.stage === 'loading-full' && (
              <p style={{ marginTop: 8, color: '#666' }}>Loading full dataset (41MB)...</p>
            )}
          </div>
        )}

        {/* Data Stats */}
        {summaryData && (
          <Card size="small" title="Loaded Data Statistics">
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="Total Segments"
                  value={summaryData.totalSegments}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Total Length"
                  value={(summaryData.totalLength / 1000).toFixed(0)}
                  suffix="km"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Local Authorities"
                  value={summaryData.localAuthorities.length}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="Full Dataset"
                  value={fullDataset ? 'Loaded' : 'Pending'}
                  valueStyle={{ color: fullDataset ? '#52c41a' : '#faad14' }}
                />
              </Col>
            </Row>
          </Card>
        )}

        {/* Actions */}
        <Space>
          <Button
            type="primary"
            icon={<CloudDownloadOutlined />}
            onClick={handleLoadData}
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load Data'}
          </Button>
          
          <Button
            icon={<ReloadOutlined />}
            onClick={handleClearData}
            disabled={loading}
          >
            Clear Data
          </Button>
        </Space>
      </Space>
    </Card>
  );
};