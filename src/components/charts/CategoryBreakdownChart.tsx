// src/components/charts/CategoryBreakdownChart.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, Button, Space, Empty, Spin, Select, Breadcrumb, Tooltip, theme, Grid, Badge } from 'antd';
import {
  BarChartOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  PercentageOutlined,
} from '@ant-design/icons';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger, usePerformanceTimer } from '@/utils/logger';
import { countyUtils } from '@/utils/countyLabels';
import { ActiveFilterChips } from './ActiveFilterChips';
import type { MaintenanceCategory } from '@/types/calculations';
import type { SurveyYear } from '@/types/data';
import styles from './CategoryBreakdownChart.module.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ChartDataLabels
);

const { Option } = Select;
const { useBreakpoint } = Grid;

interface CategoryBreakdownChartProps {
  category?: MaintenanceCategory;
  height?: number;
  onCountyClick?: (county: string) => void;
  onBack?: () => void;
}

// County names are now imported from centralized utility

// Define categoryColors once using theme tokens
const CATEGORY_COLORS: Record<MaintenanceCategory, string> = {
  'Road Reconstruction': '#ff4d4f',         // could use token.colorError
  'Structural Overlay': '#fa8c16',          // custom orange (AntD orange-6)
  'Surface Restoration': '#fadb14',         // custom yellow
  'Restoration of Skid Resistance': '#52c41a', // could use token.colorSuccess
  'Routine Maintenance': '#1890ff',         // could use token.colorPrimary
};

export const CategoryBreakdownChart: React.FC<CategoryBreakdownChartProps> = ({
  category,
  height = 700, // Increased default height for better spacing
  onCountyClick,
  onBack,
}) => {
  const logger = useComponentLogger('CategoryBreakdownChart');
  const perfTimer = usePerformanceTimer('CategoryBreakdownRender');
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  // ✅ FIXED: Now using chartFilters instead of parameters
  const calculationResults = useAnalyticsStore(state => state.cache.results);
  const chartFilters = useAnalyticsStore(state => state.chartFilters);
  const isLoading = useAnalyticsStore(state => state.ui.isLoading);

  // Local state
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory>(
    category || 'Structural Overlay'
  );
  const [sortBy, setSortBy] = useState<'value' | 'alphabetical'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage'>('absolute');

  const isMobile = !screens.md; // Use breakpoint for responsive logic

  useEffect(() => {
    logger.mount({ 
      category, 
      primaryYear: chartFilters.primaryYear,
      selectedCounties: chartFilters.selectedCounties,
      isComparisonMode: chartFilters.isComparisonMode 
    });
    return () => logger.unmount();
  }, []);

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
  }, [category]);

  // ✅ FIXED: Now uses chartFilters for consistent data context
  const sortedCountyData = useMemo(() => {
    if (!calculationResults.segments || calculationResults.segments.length === 0) {
      return [];
    }

    const displayYear = chartFilters.primaryYear as SurveyYear;
    const countyData: Record<string, { count: number; cost: number; length: number }> = {};

    calculationResults.segments.forEach(segment => {
      const yearData = segment.data[displayYear];
      if (!yearData || yearData.category !== selectedCategory) return;

      // ✅ FIXED: Use chartFilters.selectedCounties instead of parameters
      if (chartFilters.selectedCounties.length > 0 && !chartFilters.selectedCounties.includes(segment.county)) {
        return;
      }

      if (!countyData[segment.county]) {
        countyData[segment.county] = { count: 0, cost: 0, length: 0 };
      }

      countyData[segment.county].count++;
      countyData[segment.county].cost += yearData.cost;
      countyData[segment.county].length += 100;
    });

    let data = Object.entries(countyData).map(([county, data]) => ({
      county,
      name: countyUtils.getDisplayName(county),
      ...data,
    }));

    if (sortBy === 'alphabetical') {
      data.sort((a, b) => {
        const comparison = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    } else {
      data.sort((a, b) => {
        const comparison = a.cost - b.cost;
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    return data;
  }, [calculationResults, selectedCategory, sortBy, sortOrder, chartFilters.primaryYear, chartFilters.selectedCounties]);

  // ✅ ENHANCED: Calculate dynamic height based on number of counties for better spacing
  const dynamicHeight = useMemo(() => {
    const baseHeight = 300;
    const minBarHeight = 35; // Minimum height per bar for good spacing
    const calculatedHeight = Math.max(baseHeight, sortedCountyData.length * minBarHeight);
    return Math.min(calculatedHeight, height); // Don't exceed provided height
  }, [sortedCountyData.length, height]);

  // Process chart data with comparison support
  const chartData = useMemo((): ChartData<'bar'> | null => {
    perfTimer.start();

    if (sortedCountyData.length === 0) {
      perfTimer.end();
      return null;
    }

    // Calculate total for percentage view
    const totalCost = sortedCountyData.reduce((sum, item) => sum + item.cost, 0);

    // Prepare chart data - always use county codes for better spacing
    const labels = sortedCountyData.map(item => item.county);

    const datasets = [];

    // Primary year data
    const primaryData = sortedCountyData.map(item => {
      if (viewMode === 'percentage' && totalCost > 0) {
        return (item.cost / totalCost) * 100;
      }
      return item.cost / 1e6; // Convert to millions
    });

    const color = CATEGORY_COLORS[selectedCategory];

    datasets.push({
      label: chartFilters.primaryYear,
      data: primaryData,
      backgroundColor: color,
      borderColor: color,
      borderWidth: 1,
      barPercentage: 0.6, // Reduced from 0.8 for more spacing
      categoryPercentage: chartFilters.compareYear ? 0.7 : 0.5, // Reduced for more spacing
    });

    // ✅ NEW: Comparison year support
    if (chartFilters.compareYear && chartFilters.isComparisonMode) {
      const compareYearData: Record<string, { cost: number }> = {};
      
      calculationResults.segments?.forEach(segment => {
        const yearData = segment.data[chartFilters.compareYear as SurveyYear];
        if (!yearData || yearData.category !== selectedCategory) return;

        if (chartFilters.selectedCounties.length > 0 && !chartFilters.selectedCounties.includes(segment.county)) {
          return;
        }

        if (!compareYearData[segment.county]) {
          compareYearData[segment.county] = { cost: 0 };
        }

        compareYearData[segment.county].cost += yearData.cost;
      });

      const compareData = sortedCountyData.map(item => {
        const compareCountyData = compareYearData[item.county];
        if (!compareCountyData) return 0;

        if (viewMode === 'percentage') {
          const compareTotalCost = Object.values(compareYearData).reduce((sum, data) => sum + data.cost, 0);
          return compareTotalCost > 0 ? (compareCountyData.cost / compareTotalCost) * 100 : 0;
        }
        return compareCountyData.cost / 1e6;
      });

      datasets.push({
        label: chartFilters.compareYear,
        data: compareData,
        backgroundColor: `${color}80`, // 50% opacity
        borderColor: color,
        borderWidth: 1,
        barPercentage: 0.6, // Match primary dataset spacing
        categoryPercentage: 0.7, // Match primary dataset spacing
      });
    }

    perfTimer.end('chartUpdate');

    return {
      labels,
      datasets,
    };
  }, [sortedCountyData, viewMode, isMobile, selectedCategory, chartFilters, calculationResults, perfTimer]);

  // Chart options for horizontal bar
  const options: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: chartFilters.compareYear !== null && chartFilters.isComparisonMode,
        position: 'top' as const,
        labels: { color: token.colorTextSecondary },
      },
      tooltip: {
        callbacks: {
          title: (context) => {
            // Show full county name in tooltip title
            const countyCode = context[0]?.label;
            return countyCode ? countyUtils.getDisplayName(countyCode) : '';
          },
          label: (context) => {
            const value = context.parsed.x;
            const label = context.dataset.label ? `${context.dataset.label}: ` : '';
            if (viewMode === 'percentage') {
              return `${label}${value.toFixed(1)}%`;
            }
            return `${label}€${value.toFixed(2)}M`;
          },
        },
      },
      datalabels: {
        anchor: 'end',
        align: 'end',
        color: token.colorText,
        formatter: (value: number) => {
          if (viewMode === 'percentage') {
            return `${value.toFixed(1)}%`;
          }
          return `€${value.toFixed(1)}M`;
        },
        display: !isMobile, // Hide on mobile for clarity
        font: {
          size: 10,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: viewMode === 'percentage' ? 'Percentage (%)' : 'Cost (€M)',
          color: token.colorTextSecondary,
        },
        ticks: { color: token.colorTextSecondary },
        grid: { color: token.colorSplit },
      },
      y: {
        ticks: {
          autoSkip: false,
          color: token.colorTextSecondary,
          font: {
            size: isMobile ? 11 : 13, // Slightly larger since codes are shorter
            family: 'monospace', // Monospace font for better code alignment
          },
        },
        grid: { display: false },
      },
    },
    onClick: (_event, elements) => {
      if (elements.length > 0 && onCountyClick) {
        const index = elements[0].index;
        const clickedData = sortedCountyData[index];

        if (clickedData) {
          const countyCode = clickedData.county;
          logger.action('countyClick', { county: countyCode });
          onCountyClick(countyCode);
        }
      }
    },
  }), [viewMode, onCountyClick, token, isMobile, logger, sortedCountyData, chartFilters]);

  const handleCategoryChange = (value: MaintenanceCategory) => {
    logger.action('categoryChange', { from: selectedCategory, to: value });
    setSelectedCategory(value);
  };

  const handleSortToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    logger.action('sortOrderChange', { from: sortOrder, to: newOrder });
    setSortOrder(newOrder);
  };

  const handleSortByToggle = () => {
    const newSortBy = sortBy === 'value' ? 'alphabetical' : 'value';
    logger.action('sortByChange', { from: sortBy, to: newSortBy });
    setSortBy(newSortBy);
  };

  const handleExport = () => {
    logger.action('exportChart');
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `${selectedCategory}-breakdown.png`;
      link.href = url;
      link.click();
    }
  };

  // ✅ NEW: Generate filter context for breadcrumb
  const getFilterContext = () => {
    const context = [];
    if (chartFilters.primaryYear !== '2025') {
      context.push(chartFilters.primaryYear);
    }
    if (chartFilters.compareYear) {
      context.push(`vs ${chartFilters.compareYear}`);
    }
    if (chartFilters.selectedCounties.length > 0) {
      if (chartFilters.selectedCounties.length === 1) {
        context.push(countyUtils.getDisplayName(chartFilters.selectedCounties[0]));
      } else {
        context.push(`${chartFilters.selectedCounties.length} counties`);
      }
    }
    return context.join(' • ');
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (chartFilters.selectedCounties.length > 0) count += chartFilters.selectedCounties.length;
    if (chartFilters.compareYear) count += 1;
    if (chartFilters.primaryYear !== '2025') count += 1;
    return count;
  }, [chartFilters]);

  // Loading state
  if (isLoading) {
    return (
      <Card className={styles.chartCard}>
        <div className={styles.loadingContainer} style={{ height: dynamicHeight }}>
          <Spin size="large" tip="Loading breakdown data..." />
        </div>
      </Card>
    );
  }

  // No data state
  if (!chartData) {
    return (
      <Card className={styles.chartCard}>
        <Empty
          description="No data available for breakdown"
          style={{ height: dynamicHeight / 2 }}
        />
      </Card>
    );
  }

  const getTotalCost = (): number => {
    if (!calculationResults.summary) return 0;
    const yearData = calculationResults.summary[chartFilters.primaryYear];
    return yearData?.by_category[selectedCategory]?.total_cost || 0;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={styles.chartCard}
        title={
          <div className={styles.chartHeader}>
            {/* ✅ ENHANCED: Breadcrumb with filter context */}
            <Breadcrumb>
              <Breadcrumb.Item>
                <a onClick={onBack}>
                  Maintenance Categories
                  {activeFiltersCount > 0 && (
                    <Badge 
                      count={activeFiltersCount} 
                      size="small" 
                      style={{ marginLeft: 8 }}
                    />
                  )}
                </a>
              </Breadcrumb.Item>
              <Breadcrumb.Item>
                {selectedCategory}
                {getFilterContext() && (
                  <span style={{ color: token.colorTextSecondary, fontSize: '12px', marginLeft: 8 }}>
                    ({getFilterContext()})
                  </span>
                )}
              </Breadcrumb.Item>
            </Breadcrumb>
          </div>
        }
        extra={
          <Space>
            <Select
              value={selectedCategory}
              onChange={handleCategoryChange}
              style={{ width: 200 }}
              size="small"
            >
              <Option value="Road Reconstruction">Road Reconstruction</Option>
              <Option value="Structural Overlay">Structural Overlay</Option>
              <Option value="Surface Restoration">Surface Restoration</Option>
              <Option value="Restoration of Skid Resistance">Restoration of Skid</Option>
              <Option value="Routine Maintenance">Routine Maintenance</Option>
            </Select>

            <Tooltip title={viewMode === 'absolute' ? 'Show percentages' : 'Show values'}>
              <Button
                type={viewMode === 'percentage' ? 'primary' : 'default'}
                icon={<PercentageOutlined />}
                size="small"
                onClick={() => setViewMode(viewMode === 'absolute' ? 'percentage' : 'absolute')}
              />
            </Tooltip>

            <Tooltip title={`Sort by ${sortBy === 'value' ? 'name' : 'value'}`}>
              <Button
                icon={<BarChartOutlined />}
                size="small"
                onClick={handleSortByToggle}
              />
            </Tooltip>

            <Tooltip title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}>
              <Button
                icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                size="small"
                onClick={handleSortToggle}
              />
            </Tooltip>

            <Tooltip title="Export chart">
              <Button
                icon={<DownloadOutlined />}
                size="small"
                onClick={handleExport}
              />
            </Tooltip>

            {onBack && (
              <Button
                icon={<ArrowLeftOutlined />}
                size="small"
                onClick={onBack}
              >
                Back
              </Button>
            )}
          </Space>
        }
      >
        {/* ✅ NEW: Filter chips integration */}
        <ActiveFilterChips className={styles.filterChips} />
        
        <div className={styles.chartContainerWrapper} style={{ height: dynamicHeight }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedCategory}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ height: '100%' }}
            >
              <Bar ref={chartRef} options={options} data={chartData} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Summary stats */}
        {chartData && (
          <div className={styles.summaryStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Counties shown:</span>
              <span className={styles.statValue}>
                {chartData.labels?.length || 0}
              </span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Total cost:</span>
              <span className={styles.statValue}>
                €{(getTotalCost() / 1e6).toFixed(1)}M
              </span>
            </div>
            {chartFilters.compareYear && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Comparing:</span>
                <span className={styles.statValue}>
                  {chartFilters.primaryYear} vs {chartFilters.compareYear}
                </span>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
};