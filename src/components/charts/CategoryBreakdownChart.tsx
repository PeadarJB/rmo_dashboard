// src/components/charts/CategoryBreakdownChart.tsx
import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Card, Button, Space, Empty, Spin, Select, Breadcrumb, Tooltip, theme, Grid } from 'antd';
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

// County name mapping
const COUNTY_NAMES: Record<string, string> = {
  'CAR': 'Carlow', 'CAV': 'Cavan', 'CLA': 'Clare', 'COR': 'Cork',
  'CORKCITY': 'Cork City', 'DCC': 'Dublin City', 'DLRD': 'Dún Laoghaire-Rathdown',
  'DON': 'Donegal', 'FIN': 'Fingal', 'GALCITY': 'Galway City', 'GAL': 'Galway',
  'KER': 'Kerry', 'KIL': 'Kildare', 'KIK': 'Kilkenny', 'LAO': 'Laois',
  'LEI': 'Leitrim', 'LIM': 'Limerick', 'LON': 'Longford', 'LOU': 'Louth',
  'MAY': 'Mayo', 'MEA': 'Meath', 'MON': 'Monaghan', 'OFF': 'Offaly',
  'ROS': 'Roscommon', 'SLI': 'Sligo', 'STHDUB': 'South Dublin', 'TIP': 'Tipperary',
  'WAT': 'Waterford', 'WES': 'Westmeath', 'WEX': 'Wexford', 'WIC': 'Wicklow',
};

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
  height = 600,
  onCountyClick,
  onBack,
}) => {
  const logger = useComponentLogger('CategoryBreakdownChart');
  const perfTimer = usePerformanceTimer('CategoryBreakdownRender');
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const { token } = theme.useToken();
  const screens = useBreakpoint();

  // Store state
  const calculationResults = useAnalyticsStore(state => state.cache.results);
  const selectedYear = useAnalyticsStore(state => state.parameters.selectedYear);
  const selectedCounties = useAnalyticsStore(state => state.parameters.selectedCounties);
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
    logger.mount({ category, selectedYear });
    return () => logger.unmount();
  }, []);

  useEffect(() => {
    if (category) {
      setSelectedCategory(category);
    }
  }, [category]);

  // Memoize the sorted data so it can be used by both chartData and options.onClick
  const sortedCountyData = useMemo(() => {
    if (!calculationResults.segments || calculationResults.segments.length === 0) {
      return [];
    }

    const displayYear = selectedYear as SurveyYear;
    const countyData: Record<string, { count: number; cost: number; length: number }> = {};

    calculationResults.segments.forEach(segment => {
      const yearData = segment.data[displayYear];
      if (!yearData || yearData.category !== selectedCategory) return;

      if (selectedCounties.length > 0 && !selectedCounties.includes(segment.county)) {
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
      name: COUNTY_NAMES[county] || county,
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
  }, [calculationResults, selectedCategory, sortBy, sortOrder, selectedYear, selectedCounties]);

  // Process chart data
  const chartData = useMemo((): ChartData<'bar'> | null => {
    perfTimer.start();

    if (sortedCountyData.length === 0) {
      perfTimer.end();
      return null;
    }

    // Calculate total for percentage view
    const totalCost = sortedCountyData.reduce((sum, item) => sum + item.cost, 0);

    // Prepare chart data
    const labels = sortedCountyData.map(item => {
      // Use abbreviation for mobile, full name for desktop
      return isMobile ? item.county : item.name;
    });
    const data = sortedCountyData.map(item => {
      if (viewMode === 'percentage' && totalCost > 0) {
        return (item.cost / totalCost) * 100;
      }
      return item.cost / 1e6; // Convert to millions
    });

    const color = CATEGORY_COLORS[selectedCategory];

    perfTimer.end('chartUpdate');

    return {
      labels,
      datasets: [{
        label: selectedCategory,
        data,
        backgroundColor: color,
        borderColor: color,
        borderWidth: 1,
        barPercentage: 0.8,
        categoryPercentage: 0.6,
      }],
    };
  }, [sortedCountyData, viewMode, isMobile, selectedCategory, perfTimer]);

  // Chart options for horizontal bar
  const options: ChartOptions<'bar'> = useMemo(() => ({
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.x;
            if (viewMode === 'percentage') {
              return `${value.toFixed(1)}%`;
            }
            return `€${value.toFixed(2)}M`;
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
            size: isMobile ? 10 : 12,
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
  }), [viewMode, onCountyClick, token, isMobile, logger, sortedCountyData]);

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

  // Loading state
  if (isLoading) {
    return (
      <Card className={styles.chartCard}>
        <div className={styles.loadingContainer} style={{ height }}>
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
          style={{ height: height / 2 }}
        />
      </Card>
    );
  }

  const getTotalCost = (): number => {
    if (!calculationResults.summary) return 0;
    const yearData = calculationResults.summary[selectedYear === '2011' ? '2011' : '2018'];
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
            <Breadcrumb>
              <Breadcrumb.Item>
                <a onClick={onBack}>Maintenance Categories</a>
              </Breadcrumb.Item>
              <Breadcrumb.Item>{selectedCategory}</Breadcrumb.Item>
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
        <div className={styles.chartContainer} style={{ height }}>
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
          </div>
        )}
      </Card>
    </motion.div>
  );
};