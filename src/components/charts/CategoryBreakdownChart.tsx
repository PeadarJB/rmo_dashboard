// src/components/charts/CategoryBreakdownChart.tsx
// Updated sections with mobile-responsive county labels

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Empty, Spin, Space, Button, Select, Tooltip, Badge, Breadcrumb, Grid } from 'antd';
import { 
  DownloadOutlined, 
  ArrowUpOutlined, 
  ArrowDownOutlined,
  SortAscendingOutlined,
  PercentageOutlined
} from '@ant-design/icons';
import { Bar } from 'react-chartjs-2';
import type { ChartOptions, TooltipItem } from 'chart.js';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { countyUtils } from '../../utils/countyLabels';
import { logger } from '../../utils/logger';
import type { MaintenanceCategory } from '../../types/calculations';
import { motion } from 'framer-motion';
import { theme } from 'antd';
import styles from './CategoryBreakdownChart.module.css';

// Define SurveyYear type locally if not exported from calculations
type SurveyYear = '2021' | '2022' | '2023' | '2024' | '2025';

interface CategoryBreakdownChartProps {
  category?: MaintenanceCategory;
  onBack: () => void;
  onCountyClick?: (county: string) => void;
}

export default function CategoryBreakdownChart({
  category,
  onBack,
  onCountyClick,
}: CategoryBreakdownChartProps) {
  const { token } = theme.useToken();
  const chartRef = useRef<any>(null);
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();

  // Store state with proper types
  const calculationResults = useAnalyticsStore((state: any) => state.calculationResults);
  const chartFilters = useAnalyticsStore((state: any) => state.chartFilters);
  const isLoading = useAnalyticsStore((state: any) => state.ui.isLoading);

  // Local state
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory>(
    category || 'Structural Overlay'
  );
  const [sortBy, setSortBy] = useState<'value' | 'alphabetical'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage'>('absolute');

  const isMobile = !screens.md; // Use breakpoint for responsive logic

  useEffect(() => {
    logger.info('CategoryBreakdownChart', 'Component mounted', { 
      category, 
      primaryYear: chartFilters.primaryYear,
      selectedCounties: chartFilters.selectedCounties,
      isComparisonMode: chartFilters.isComparisonMode 
    });
    return () => logger.info('CategoryBreakdownChart', 'Component unmounted');
  }, []);

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
  }, [category]);

  // Process and sort county data
  const sortedCountyData = useMemo(() => {
    if (!calculationResults.segments || calculationResults.segments.length === 0) {
      return [];
    }

    const displayYear = chartFilters.primaryYear as SurveyYear;
    const countyData: Record<string, { count: number; cost: number; length: number }> = {};

    calculationResults.segments.forEach((segment: any) => {
      const yearData = segment.data[displayYear];
      if (!yearData || yearData.category !== selectedCategory) return;

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

    // Limit to top 20 for readability
    return data.slice(0, 20);
  }, [calculationResults.segments, selectedCategory, sortBy, sortOrder, chartFilters]);

  // Calculate dynamic height based on number of counties
  const dynamicHeight = Math.max(400, sortedCountyData.length * 30);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!sortedCountyData.length) return null;

    const totalCost = sortedCountyData.reduce((sum, d) => sum + d.cost, 0);

    return {
      // MOBILE FIX: Use abbreviated codes on mobile, full names on desktop
      labels: sortedCountyData.map(d => isMobile ? d.county : d.name),
      datasets: [{
        label: selectedCategory,
        data: sortedCountyData.map(d => 
          viewMode === 'percentage' 
            ? (d.cost / totalCost) * 100 
            : d.cost / 1000000 // Convert to millions
        ),
        backgroundColor: token.colorPrimary,
        borderColor: token.colorPrimaryBorder,
        borderWidth: 1,
        borderRadius: 4,
      }]
    };
  }, [sortedCountyData, selectedCategory, viewMode, token, isMobile]);

  // Chart options
  const chartOptions: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          // Always show full county name in tooltip for clarity
          title: (items: TooltipItem<'bar'>[]) => {
            const index = items[0].dataIndex;
            const data = sortedCountyData[index];
            return data ? data.name : '';
          },
          label: (context: TooltipItem<'bar'>) => {
            const value = context.parsed.x;
            if (viewMode === 'percentage') {
              return `${selectedCategory}: ${value.toFixed(1)}%`;
            }
            return `${selectedCategory}: €${value.toFixed(2)}M`;
          },
          afterLabel: (context: TooltipItem<'bar'>) => {
            const index = context.dataIndex;
            const data = sortedCountyData[index];
            if (data) {
              return [
                `Segments: ${data.count}`,
                `Length: ${(data.length / 1000).toFixed(1)} km`,
                // Show county code if on mobile
                isMobile ? `Code: ${data.county}` : ''
              ].filter(Boolean);
            }
            return [];
          }
        }
      }
    },
    scales: {
      x: {
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
            size: isMobile ? 11 : 13,
            // Use monospace font for better alignment of abbreviated codes on mobile
            family: isMobile ? 'monospace' : 'system-ui',
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
          logger.info('CategoryBreakdownChart', 'County clicked', { county: countyCode });
          onCountyClick(countyCode);
        }
      }
    },
  }), [viewMode, onCountyClick, token, isMobile, sortedCountyData, chartFilters, selectedCategory]);

  const handleCategoryChange = (value: MaintenanceCategory) => {
    logger.info('CategoryBreakdownChart', 'Category changed', { from: selectedCategory, to: value });
    setSelectedCategory(value);
  };

  const handleSortToggle = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    logger.info('CategoryBreakdownChart', 'Sort order changed', { from: sortOrder, to: newOrder });
    setSortOrder(newOrder);
  };

  const handleSortByToggle = () => {
    const newSortBy = sortBy === 'value' ? 'alphabetical' : 'value';
    logger.info('CategoryBreakdownChart', 'Sort by changed', { from: sortBy, to: newSortBy });
    setSortBy(newSortBy);
  };

  const handleExport = () => {
    logger.info('CategoryBreakdownChart', 'Export chart');
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image();
      const link = document.createElement('a');
      link.download = `${selectedCategory}-breakdown.png`;
      link.href = url;
      link.click();
    }
  };

  // Generate filter context for breadcrumb
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
              <Select.Option value="Road Reconstruction">Road Reconstruction</Select.Option>
              <Select.Option value="Structural Overlay">Structural Overlay</Select.Option>
              <Select.Option value="Surface Restoration">Surface Restoration</Select.Option>
              <Select.Option value="Restoration of Skid Resistance">Restoration of Skid</Select.Option>
              <Select.Option value="Routine Maintenance">Routine Maintenance</Select.Option>
            </Select>

            <Tooltip title={viewMode === 'absolute' ? 'Show percentages' : 'Show values'}>
              <Button
                type={viewMode === 'percentage' ? 'primary' : 'default'}
                icon={<PercentageOutlined />}
                size="small"
                onClick={() => setViewMode(viewMode === 'absolute' ? 'percentage' : 'absolute')}
              />
            </Tooltip>

            <Tooltip title={`Sort ${sortBy === 'value' ? 'alphabetically' : 'by value'}`}>
              <Button
                icon={<SortAscendingOutlined />}
                size="small"
                onClick={handleSortByToggle}
              />
            </Tooltip>

            <Tooltip title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}>
              <Button
                icon={sortOrder === 'asc' ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
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
          </Space>
        }
      >
        <div className={styles.chartContainerWrapper}>
          <div style={{ height: dynamicHeight }}>
            <Bar ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Summary stats */}
        <div className={styles.summaryStats}>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Counties:</span>
            <span className={styles.statValue}>{sortedCountyData.length}</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Cost:</span>
            <span className={styles.statValue}>
              €{(sortedCountyData.reduce((sum, d) => sum + d.cost, 0) / 1000000).toFixed(2)}M
            </span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statLabel}>Total Segments:</span>
            <span className={styles.statValue}>
              {sortedCountyData.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
            </span>
          </div>
          {isMobile && (
            <div className={styles.statItem}>
              <span className={styles.statLabel} style={{ fontSize: '11px', fontStyle: 'italic' }}>
                Tip: County codes shown for space. Tap bars for full names.
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}