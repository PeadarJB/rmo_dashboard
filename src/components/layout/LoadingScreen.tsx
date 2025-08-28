// src/components/layout/LoadingScreen.tsx
import React from 'react';
import { Skeleton, Card, Space, Spin, Typography } from 'antd';
import { useComponentLogger } from '@/utils/logger';
import styles from './LoadingScreen.module.css';

const { Text } = Typography;

interface LoadingScreenProps {
  variant?: 'full' | 'chart' | 'table' | 'kpi' | 'controls';
  count?: number;
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  variant = 'full',
  count = 1,
  message = 'Loading...',
}) => {
  const logger = useComponentLogger('LoadingScreen');

  React.useEffect(() => {
    logger.mount({ variant, count });
    return () => logger.unmount();
  }, [variant, count]);

  // If a message is provided for the full screen loader, show it
  if (variant === 'full' && message) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '20px',
        }}
      >
        <Spin size="large" />
        <Text type="secondary">{message}</Text>
      </div>
    );
  }

  // KPI Card Skeleton
  const KPISkeleton = () => (
    <Card className={styles.kpiCard}>
      <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
      <Skeleton.Input active style={{ width: 150, height: 32 }} />
      <div className={styles.kpiTrend}>
        <Skeleton.Input active size="small" style={{ width: 60 }} />
      </div>
    </Card>
  );

  // Chart Skeleton
  const ChartSkeleton = () => (
    <Card className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <Skeleton.Input active style={{ width: 200 }} />
        <Space size="small">
          <Skeleton.Button active size="small" />
          <Skeleton.Button active size="small" />
        </Space>
      </div>
      <Skeleton.Image active className={styles.chartBody} />
    </Card>
  );

  // Table Skeleton
  const TableSkeleton = () => (
    <Card className={styles.tableCard}>
      <Skeleton.Input active style={{ width: '100%', marginBottom: 16 }} />
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {[...Array(5)].map((_, i) => (
          <Skeleton.Input key={i} active style={{ width: '100%' }} />
        ))}
      </Space>
    </Card>
  );

  // Controls Skeleton
  const ControlsSkeleton = () => (
    <Card className={styles.controlsCard}>
      <Skeleton.Input active style={{ width: 150, marginBottom: 16 }} />
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <Skeleton.Input active size="small" style={{ width: 100, marginBottom: 8 }} />
            <Skeleton.Input active style={{ width: '100%' }} />
          </div>
        ))}
      </Space>
    </Card>
  );

  // Full Dashboard Skeleton
  const FullDashboardSkeleton = () => (
    <div className={styles.dashboardGrid}>
      {/* KPI Section */}
      <div className={styles.kpiSection}>
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
      </div>

      {/* Controls Section */}
      <div className={styles.controlsSection}>
        <ControlsSkeleton />
        <Card className={styles.filterCard}>
          <Skeleton.Input active style={{ width: 150, marginBottom: 16 }} />
          <Skeleton.Input active style={{ width: '100%' }} />
        </Card>
      </div>

      {/* Main Visualization Section */}
      <div className={styles.mainSection}>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* Table Section */}
      <div className={styles.tableSection}>
        <TableSkeleton />
      </div>
    </div>
  );

  // Render based on variant
  switch (variant) {
    case 'kpi':
      return (
        <div className={styles.kpiGroup}>
          {[...Array(count)].map((_, i) => (
            <KPISkeleton key={i} />
          ))}
        </div>
      );

    case 'chart':
      return (
        <div className={styles.chartGroup}>
          {[...Array(count)].map((_, i) => (
            <ChartSkeleton key={i} />
          ))}
        </div>
      );

    case 'table':
      return <TableSkeleton />;

    case 'controls':
      return <ControlsSkeleton />;

    case 'full':
    default:
      return <FullDashboardSkeleton />;
  }
};

// Mobile-specific loading screen
export const MobileLoadingScreen: React.FC = () => {
  return (
    <div className={styles.mobileLoading}>
      <Card className={styles.mobileCard}>
        <Skeleton.Input active style={{ width: '100%', marginBottom: 16 }} />
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Skeleton.Input active style={{ width: '100%', height: 60 }} />
          <Skeleton.Input active style={{ width: '100%', height: 60 }} />
          <Skeleton.Input active style={{ width: '100%', height: 60 }} />
        </Space>
      </Card>
      <Card className={styles.mobileCard}>
        <Skeleton.Image active style={{ width: '100%', height: 200 }} />
      </Card>
    </div>
  );
};