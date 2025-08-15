// src/components/charts/MaintenanceCategoryChart.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, Button, Space, Empty, Spin, Segmented, Tooltip as AntTooltip } from 'antd';
import {
  BarChartOutlined,
  PercentageOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger, usePerformanceTimer } from '@/utils/logger';
import type { MaintenanceCategory } from '@/types/calculations';
import styles from './MaintenanceCategoryChart.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MaintenanceCategoryChartProps {
  height?: number;
  onCategoryClick?: (category: MaintenanceCategory) => void;
  showComparison?: boolean;
}

export const MaintenanceCategoryChart: React.FC<MaintenanceCategoryChartProps> = ({
  height = 400,
  onCategoryClick,
  showComparison = false,
}) => {
  const logger = useComponentLogger('MaintenanceCategoryChart');
  const perfTimer = usePerformanceTimer('ChartRender');
  const chartRef = useRef<ChartJS<'bar'>>(null);
  
  // Store state
  const calculationResults = useAnalyticsStore(state => state.cache.results);
  const selectedYear = useAnalyticsStore(state => state.parameters.selectedYear);
  const isLoading = useAnalyticsStore(state => state.ui.isLoading);
  
  // Local state
  const [viewMode, setViewMode] = useState<'length' | 'cost' | 'percentage'>('percentage');
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    logger.mount({ showComparison, selectedYear });
    return () => logger.unmount();
  }, []);

  // Process chart data
  const chartData = useMemo((): ChartData<'bar'> | null => {
    perfTimer.start();
    
    if (!calculationResults.summary) {
      perfTimer.end();
      return null;
    }

    const categories: MaintenanceCategory[] = [
      'Road Reconstruction',
      'Structural Overlay',
      'Surface Restoration',
      'Restoration of Skid Resistance',
      'Routine Maintenance',
    ];

    const colors = {
      'Road Reconstruction': '#ff4d4f',
      'Structural Overlay': '#fa8c16',
      'Surface Restoration': '#fadb14',
      'Restoration of Skid Resistance': '#52c41a',
      'Routine Maintenance': '#1890ff',
    };

    const datasets = [];

    // Add 2018 data
    if (selectedYear === '2018' || selectedYear === 'both') {
      const summary2018 = calculationResults.summary['2018'];
      const data2018 = categories.map(cat => {
        const categoryData = summary2018?.by_category[cat];
        if (!categoryData) return 0;

        switch (viewMode) {
          case 'length':
            return categoryData.total_length_m / 1000; // Convert to km
          case 'cost':
            return categoryData.total_cost / 1e6; // Convert to millions
          case 'percentage':
            return categoryData.percentage;
          default:
            return 0;
        }
      });

      datasets.push({
        label: '2018',
        data: data2018,
        backgroundColor: categories.map(cat => colors[cat]),
        borderColor: categories.map(cat => colors[cat]),
        borderWidth: 1,
      });
    }

    // Add 2011 data for comparison
    if ((selectedYear === '2011' || selectedYear === 'both') && showComparison) {
      const summary2011 = calculationResults.summary['2011'];
      const data2011 = categories.map(cat => {
        const categoryData = summary2011?.by_category[cat];
        if (!categoryData) return 0;

        switch (viewMode) {
          case 'length':
            return categoryData.total_length_m / 1000;
          case 'cost':
            return categoryData.total_cost / 1e6;
          case 'percentage':
            return categoryData.percentage;
          default:
            return 0;
        }
      });

      datasets.push({
        label: '2011',
        data: data2011,
        backgroundColor: categories.map(cat => `${colors[cat]}80`), // Add transparency
        borderColor: categories.map(cat => colors[cat]),
        borderWidth: 1,
      });
    }

    perfTimer.end('chartUpdate');
    
    return {
      labels: categories.map(cat => {
        // Shorten labels for mobile
        if (window.innerWidth < 768) {
          return cat.split(' ').map(word => word[0]).join('');
        }
        return cat.replace(' of ', ' ');
      }),
      datasets,
    };
  }, [calculationResults, selectedYear, viewMode, showComparison]);

  // Chart options
  const options: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showComparison && selectedYear === 'both',
        position: 'top' as const,
      },
      title: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            
            switch (viewMode) {
              case 'length':
                return `${label}: ${value.toFixed(1)} km`;
              case 'cost':
                return `${label}: €${value.toFixed(2)}M`;
              case 'percentage':
                return `${label}: ${value.toFixed(1)}%`;
              default:
                return `${label}: ${value}`;
            }
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          autoSkip: false,
          maxRotation: window.innerWidth < 768 ? 45 : 0,
          minRotation: window.innerWidth < 768 ? 45 : 0,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: viewMode === 'length' ? 'Length (km)' :
                viewMode === 'cost' ? 'Cost (€M)' :
                'Percentage (%)',
        },
      },
    },
    onClick: (_event, elements) => {
      if (elements.length > 0 && onCategoryClick) {
        const index = elements[0].index;
        const categories: MaintenanceCategory[] = [
          'Road Reconstruction',
          'Structural Overlay',
          'Surface Restoration',
          'Restoration of Skid Resistance',
          'Routine Maintenance',
        ];
        const category = categories[index];
        logger.action('categoryClick', { category });
        onCategoryClick(category);
      }
    },
  }), [viewMode, showComparison, selectedYear, onCategoryClick]);

  const handleViewModeChange = (mode: string | number) => {
    const newMode = mode as 'length' | 'cost' | 'percentage';
    logger.action('viewModeChange', { from: viewMode, to: newMode });
    setViewMode(newMode);
  };

  const handleExport = () => {
    logger.action('exportChart');
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = 'maintenance-categories.png';
      link.href = url;
      link.click();
    }
  };

  const handleFullscreen = () => {
    logger.action('toggleFullscreen', { isFullscreen: !isFullscreen });
    setIsFullscreen(!isFullscreen);
    // TODO: Implement actual fullscreen
  };

  // Loading state
  if (isLoading) {
    return (
      <Card className={styles.chartCard}>
        <div className={styles.loadingContainer} style={{ height }}>
          <Spin size="large" tip="Loading chart data..." />
        </div>
      </Card>
    );
  }

  // No data state
  if (!chartData) {
    return (
      <Card className={styles.chartCard}>
        <Empty
          description="No calculation results available"
          style={{ height }}
        >
          <Button type="primary" icon={<SyncOutlined />}>
            Run Calculation
          </Button>
        </Empty>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={styles.chartCard}
        title={
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>
              <BarChartOutlined /> Maintenance Categories
            </span>
            <Segmented
              value={viewMode}
              onChange={handleViewModeChange}
              options={[
                {
                  label: <AntTooltip title="View as percentage"><PercentageOutlined /></AntTooltip>,
                  value: 'percentage',
                },
                {
                  label: <AntTooltip title="View lengths">Length</AntTooltip>,
                  value: 'length',
                },
                {
                  label: <AntTooltip title="View costs">Cost</AntTooltip>,
                  value: 'cost',
                },
              ]}
              size="small"
            />
          </div>
        }
        extra={
          <Space>
            <AntTooltip title="Export chart">
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={handleExport}
              />
            </AntTooltip>
            <AntTooltip title="Fullscreen">
              <Button
                type="text"
                icon={<FullscreenOutlined />}
                onClick={handleFullscreen}
              />
            </AntTooltip>
          </Space>
        }
      >
        <div className={styles.chartContainer} style={{ height }}>
          <Bar ref={chartRef} options={options} data={chartData} />
        </div>

        {/* Legend for mobile */}
        {window.innerWidth < 768 && (
          <div className={styles.mobileLegend}>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#ff4d4f' }} />
              RR: Road Reconstruction
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#fa8c16' }} />
              SO: Structural Overlay
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#fadb14' }} />
              SR: Surface Restoration
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#52c41a' }} />
              RS: Restoration of Skid
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendColor} style={{ background: '#1890ff' }} />
              RM: Routine Maintenance
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};