// src/components/charts/MaintenanceCategoryChart.tsx
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Card, Button, Empty, Spin, theme } from 'antd';
import {
  BarChartOutlined,
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
  ChartEvent,
  ActiveElement,
  TooltipItem,
} from 'chart.js';
import ChartDataLabels, { Context } from 'chartjs-plugin-datalabels';
import { Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger, usePerformanceTimer } from '@/utils/logger';
import type { MaintenanceCategory } from '@/types/calculations';
import styles from './MaintenanceCategoryChart.module.css';
import { ChartToolbar } from './ChartToolbar';
import { ActiveFilterChips } from './ActiveFilterChips';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

// Centralize the list of categories to avoid repetition and ensure consistency.
const MAINTENANCE_CATEGORIES: MaintenanceCategory[] = [
  'Road Reconstruction',
  'Structural Overlay',
  'Surface Restoration',
  'Restoration of Skid Resistance',
  'Routine Maintenance',
];

interface MaintenanceCategoryChartProps {
  height?: number;
  onCategoryClick?: (category: MaintenanceCategory) => void;
  onOpenFilters?: () => void;
}

export const MaintenanceCategoryChart: React.FC<MaintenanceCategoryChartProps> = ({
  height = 400,
  onCategoryClick,
  onOpenFilters,
}) => {
  const logger = useComponentLogger('MaintenanceCategoryChart');
  const perfTimer = usePerformanceTimer('ChartRender');
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const { token } = theme.useToken();

  // Store state
  const calculationResults = useAnalyticsStore(state => state.cache.results);
  const chartFilters = useAnalyticsStore(state => state.chartFilters);
  const isLoading = useAnalyticsStore(state => state.ui.isLoading);

  useEffect(() => {
    logger.mount({ 
      primaryYear: chartFilters.primaryYear, 
      isComparisonMode: chartFilters.isComparisonMode 
    });
    return () => logger.unmount();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Process chart data
  const chartData = useMemo((): ChartData<'bar'> | null => {
    perfTimer.start();
    if (!calculationResults.segments) {
      perfTimer.end();
      return null;
    }

    const { primaryYear, compareYear, selectedCounties, metric, isComparisonMode } = chartFilters;

    const filteredSegments =
      selectedCounties.length > 0
        ? calculationResults.segments.filter((s) => selectedCounties.includes(s.county))
        : calculationResults.segments;

    const aggregateYearData = (year: typeof primaryYear) => {
      const yearData = {
        totalCost: 0,
        totalLength: 0,
        byCategory: {} as Record<MaintenanceCategory, { cost: number; length: number; count: number }>,
      };

      MAINTENANCE_CATEGORIES.forEach(cat => {
        yearData.byCategory[cat] = { cost: 0, length: 0, count: 0 };
      });

      for (const segment of filteredSegments) {
        const conditions = segment.data[year];
        if (conditions?.category) {
          const category = conditions.category as MaintenanceCategory;
          if (yearData.byCategory[category]) {
            yearData.byCategory[category].cost += conditions.cost;
            yearData.byCategory[category].length += 100;
            yearData.byCategory[category].count++;
            yearData.totalCost += conditions.cost;
            yearData.totalLength += 100;
          }
        }
      }
      return yearData;
    };

    const datasets = [];
    const colors: Record<MaintenanceCategory, string> = {
      'Road Reconstruction': token.colorError,
      'Structural Overlay': token.colorWarning,
      'Surface Restoration': '#fadb14',
      'Restoration of Skid Resistance': token.colorSuccess,
      'Routine Maintenance': token.colorPrimary,
    };

    const primaryYearTotals = aggregateYearData(primaryYear);
    if (primaryYearTotals.totalLength > 0 || primaryYearTotals.totalCost > 0) {
      const data = MAINTENANCE_CATEGORIES.map(cat => {
        const categoryData = primaryYearTotals.byCategory[cat];
        if (!categoryData) return 0;
        switch (metric) {
          case 'length': return categoryData.length / 1000; // km
          case 'cost': return categoryData.cost / 1e6; // millions
          case 'percentage': return primaryYearTotals.totalLength > 0 ? (categoryData.length / primaryYearTotals.totalLength) * 100 : 0;
          default: return 0;
        }
      });

      datasets.push({
        label: primaryYear,
        data,
        backgroundColor: MAINTENANCE_CATEGORIES.map(cat => colors[cat]),
        borderColor: MAINTENANCE_CATEGORIES.map(cat => colors[cat]),
        borderWidth: 1,
      });
    }

    if (isComparisonMode && compareYear) {
      const compareYearTotals = aggregateYearData(compareYear);
      if (compareYearTotals.totalLength > 0 || compareYearTotals.totalCost > 0) {
        const data = MAINTENANCE_CATEGORIES.map(cat => {
          const categoryData = compareYearTotals.byCategory[cat];
           if (!categoryData) return 0;
          switch (metric) {
            case 'length': return categoryData.length / 1000; // km
            case 'cost': return categoryData.cost / 1e6; // millions
            case 'percentage': return compareYearTotals.totalLength > 0 ? (categoryData.length / compareYearTotals.totalLength) * 100 : 0;
            default: return 0;
          }
        });

        datasets.push({
          label: compareYear,
          data,
          backgroundColor: MAINTENANCE_CATEGORIES.map(cat => `${colors[cat]}80`),
          borderColor: MAINTENANCE_CATEGORIES.map(cat => colors[cat]),
          borderWidth: 1,
        });
      }
    }

    perfTimer.end('chartUpdate');

    if (datasets.length === 0) {
        return null;
    }

    return {
      labels: MAINTENANCE_CATEGORIES.map(cat => {
        if (window.innerWidth < 768) {
          return cat.split(' ').map(word => word[0]).join('');
        }
        return cat.replace(' of ', ' ');
      }),
      datasets,
    };
  }, [calculationResults.segments, chartFilters, token, perfTimer]);

  const options: ChartOptions<'bar'> = useMemo(() => {
    // This helper function centralizes the label formatting logic for both tooltips and datalabels.
    const formatMetricValue = (value: number, context: Context | TooltipItem<'bar'>, forDatalabel: boolean) => {
      const label = forDatalabel ? '' : `${context.dataset.label || ''}: `;
      const numericValue = 'parsed' in context ? context.parsed.y : value;

      switch (chartFilters.metric) {
        case 'length':
          return `${label}${numericValue.toFixed(1)} km`;
        case 'cost':
          return `${label}€${numericValue.toFixed(2)}M`;
        case 'percentage':
          return `${label}${numericValue.toFixed(1)}%`;
        default:
          return `${label}${numericValue}`;
      }
    };

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: chartFilters.isComparisonMode && chartFilters.compareYear !== null,
          position: 'top' as const,
          labels: { color: token.colorTextSecondary },
        },
        title: { display: false },
        datalabels: {
          anchor: 'end',
          align: 'end',
          offset: 8,
          formatter: (value: number, context: Context) => formatMetricValue(value, context, true), // Simplified for data label
          color: token.colorText,
        },
        tooltip: {
          callbacks: {
            label: (context: TooltipItem<'bar'>) => formatMetricValue(0, context, false), // Full info for tooltip
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: token.colorTextSecondary,
            autoSkip: false,
            maxRotation: window.innerWidth < 768 ? 45 : 0,
            minRotation: window.innerWidth < 768 ? 45 : 0,
          },
        },
        y: {
          beginAtZero: true,
          grace: '5%',
          title: {
            display: true,
            text: chartFilters.metric === 'length' ? 'Length (km)' :
                  chartFilters.metric === 'cost' ? 'Cost (€M)' :
                  'Percentage (%)',
            color: token.colorTextSecondary,
          },
          ticks: { color: token.colorTextSecondary },
          grid: { color: token.colorSplit },
        },
      },
      onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
        if (elements.length > 0 && onCategoryClick) {
          const index = elements[0].index;
          const category = MAINTENANCE_CATEGORIES[index];
          logger.action('categoryClick', { category });
          onCategoryClick(category);
        }
      },
    };
  }, [chartFilters, onCategoryClick, token, logger]);
  
  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `maintenance-categories-${chartFilters.primaryYear}.png`;
      link.href = url;
      link.click();
    }
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const handleFullscreen = () => setIsFullscreen(!isFullscreen);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`${styles.chartCard} ${isFullscreen ? styles.fullscreen : ''}`}
        title={
          <span className={styles.chartTitle}>
            <BarChartOutlined /> Maintenance Categories
          </span>
        }
        extra={
          <ChartToolbar
            onExport={handleExport}
            onFullscreen={handleFullscreen}
            isFullscreen={isFullscreen}
            onOpenFilters={onOpenFilters}
          />
        }
      >
        <ActiveFilterChips className={styles.filterChips} />
        <div className={styles.chartContainer} style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
          {isLoading ? (
            <div className={styles.loadingContainer}><Spin size="large" tip="Loading chart data..." /></div>
          ) : chartData ? (
            <Bar ref={chartRef} options={options} data={chartData} />
          ) : (
            <Empty description="No calculation results available" style={{ height }}>
              <Button type="primary" icon={<SyncOutlined />}>Run Calculation</Button>
            </Empty>
          )}
        </div>
        {window.innerWidth < 768 && !isLoading && chartData && (
          <div className={styles.mobileLegend}>
            <div className={styles.legendItem}><span className={styles.legendColor} style={{ background: token.colorError }} />RR: Road Reconstruction</div>
            <div className={styles.legendItem}><span className={styles.legendColor} style={{ background: token.colorWarning }} />SO: Structural Overlay</div>
            <div className={styles.legendItem}><span className={styles.legendColor} style={{ background: '#fadb14' }} />SR: Surface Restoration</div>
            <div className={styles.legendItem}><span className={styles.legendColor} style={{ background: token.colorSuccess }} />RS: Restoration of Skid</div>
            <div className={styles.legendItem}><span className={styles.legendColor} style={{ background: token.colorPrimary }} />RM: Routine Maintenance</div>
          </div>
        )}
      </Card>
    </motion.div>
  );
};
