import React, { useMemo } from 'react';
import { Tag, Space, Button, Tooltip } from 'antd';
import {
  ClearOutlined,
  PercentageOutlined,
  BarChartOutlined,
  DollarOutlined,
  CalendarOutlined,
  SwapOutlined,
  EnvironmentOutlined,
  SortAscendingOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { DEFAULT_CHART_FILTERS } from '@/store/slices/chartFiltersSlice';
import { useComponentLogger } from '@/utils/logger'; 
import { COUNTY_NAMES } from '@/utils/countyLabels'; 
import type { ChartMetric } from '@/store/slices/chartFiltersSlice'; 
import styles from './ActiveFilterChips.module.css';

interface FilterChip {
  id: string;
  type: 'metric' | 'year' | 'compare' | 'county' | 'sort' | 'limit';
  label: string;
  icon?: React.ReactNode;
  color?: string;
  removable: boolean;
  onRemove?: () => void;
}

interface ActiveFilterChipsProps {
  className?: string;
  maxVisible?: number;
  showClearAll?: boolean;
  onChipClick?: (chip: FilterChip) => void;
}

export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({
  className,
  maxVisible = 10,
  showClearAll = true,
  onChipClick,
}) => {
  const logger = useComponentLogger('ActiveFilterChips');

  // ✅ One-selector-per-field; no equality function arg
  const chartFilters = useAnalyticsStore((s) => s.chartFilters);
  const setChartMetric = useAnalyticsStore((s) => s.setChartMetric);
  const setChartPrimaryYear = useAnalyticsStore((s) => s.setChartPrimaryYear);
  const setChartCompareYear = useAnalyticsStore((s) => s.setChartCompareYear);
  const removeChartCounty = useAnalyticsStore((s) => s.removeChartCounty);
  const setChartSortBy = useAnalyticsStore((s) => s.setChartSortBy);
  const setChartSortOrder = useAnalyticsStore((s) => s.setChartSortOrder);
  const setChartTopN = useAnalyticsStore((s) => s.setChartTopN);
  const resetChartFilters = useAnalyticsStore((s) => s.resetChartFilters);

  // Generate filter chips from current state
  const filterChips = useMemo<FilterChip[]>(() => {
    const chips: FilterChip[] = [];

    // Metric chip (only if not default)
    if (chartFilters.metric !== DEFAULT_CHART_FILTERS.metric) {
      const metricIcons: Record<ChartMetric, React.ReactNode> = {
        percentage: <PercentageOutlined />,
        length: <BarChartOutlined />,
        cost: <DollarOutlined />,
      };
      chips.push({
        id: 'metric',
        type: 'metric',
        label: `Metric: ${chartFilters.metric}`,
        // TS: ensure key is ChartMetric
        icon: metricIcons[chartFilters.metric as ChartMetric],
        color: 'blue',
        removable: true,
        onRemove: () => {
          logger.action('removeMetricFilter');
          setChartMetric(DEFAULT_CHART_FILTERS.metric);
        },
      });
    }

    // Year chip (only if not default)
    if (chartFilters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) {
      chips.push({
        id: 'year',
        type: 'year',
        label: `Year: ${chartFilters.primaryYear}`,
        icon: <CalendarOutlined />,
        color: 'green',
        removable: true,
        onRemove: () => {
          logger.action('removeYearFilter');
          setChartPrimaryYear(DEFAULT_CHART_FILTERS.primaryYear);
        },
      });
    }

    // Compare year chip (only if a comparison is active)
    if (chartFilters.compareYear) {
      chips.push({
        id: 'compare',
        type: 'compare',
        label: `Compare: ${chartFilters.compareYear}`,
        icon: <SwapOutlined />,
        color: 'purple',
        removable: true,
        onRemove: () => {
          logger.action('removeCompareFilter');
          setChartCompareYear(null);
        },
      });
    }

    // County chips (one per selected county)
    chartFilters.selectedCounties.forEach((county: string) => {
      chips.push({
        id: `county-${county}`,
        type: 'county',
        label: COUNTY_NAMES[county] || county,
        icon: <EnvironmentOutlined />,
        color: 'orange',
        removable: true,
        onRemove: () => {
          logger.action('removeCountyFilter', { county });
          removeChartCounty(county);
        },
      });
    });

    // Sort chip (only if sort is not default)
    if (
      chartFilters.sortBy !== DEFAULT_CHART_FILTERS.sortBy ||
      chartFilters.sortOrder !== DEFAULT_CHART_FILTERS.sortOrder
    ) {
      chips.push({
        id: 'sort',
        type: 'sort',
        label: `Sort: ${chartFilters.sortBy} ${chartFilters.sortOrder}`,
        icon: <SortAscendingOutlined />,
        color: 'cyan',
        removable: true,
        onRemove: () => {
          logger.action('removeSortFilter');
          setChartSortBy(DEFAULT_CHART_FILTERS.sortBy);
          setChartSortOrder(DEFAULT_CHART_FILTERS.sortOrder);
        },
      });
    }

    // Top N chip (only if a Top N filter is active)
    if (chartFilters.showTopN !== null) {
      chips.push({
        id: 'limit',
        type: 'limit',
        label: `Top ${chartFilters.showTopN}`,
        icon: <FilterOutlined />,
        color: 'magenta',
        removable: true,
        onRemove: () => {
          logger.action('removeTopNFilter');
          setChartTopN(null);
        },
      });
    }

    return chips;
  }, [
    chartFilters,
    logger,
    setChartMetric,
    setChartPrimaryYear,
    setChartCompareYear,
    removeChartCounty,
    setChartSortBy,
    setChartSortOrder,
    setChartTopN,
  ]);

  const handleClearAll = () => {
    logger.action('clearAllFilters');
    resetChartFilters();
  };

  if (filterChips.length === 0) return null;

  const visibleChips = filterChips.slice(0, maxVisible);
  const overflowChips = filterChips.slice(maxVisible);
  const hasOverflow = overflowChips.length > 0;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <AnimatePresence mode="popLayout">
        <Space size={[4, 4]} wrap className={styles.chipsWrapper}>
          {visibleChips.map((chip) => (
            <motion.div
              key={chip.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.2 }}
            >
              <Tag
                className={`${styles.chip} ${styles[chip.type]}`}
                color={chip.color}
                icon={chip.icon}
                closable={chip.removable}
                onClose={(e) => {
                  e.preventDefault();
                  chip.onRemove?.();
                }}
                onClick={() => onChipClick?.(chip)}
              >
                <span className={styles.chipLabel}>{chip.label}</span>
              </Tag>
            </motion.div>
          ))}

          {hasOverflow && (
            <Tooltip
              title={
                <div className={styles.overflowTooltip}>
                  {overflowChips.map((chip) => (
                    <div key={chip.id} className={styles.overflowItem}>
                      {chip.icon}
                      <span>{chip.label}</span>
                    </div>
                  ))}
                </div>
              }
            >
              <Tag className={styles.overflowChip}>+{overflowChips.length} more</Tag>
            </Tooltip>
          )}

          {showClearAll && filterChips.length > 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <Button
                type="text"
                size="small"
                icon={<ClearOutlined />}
                onClick={handleClearAll}
                className={styles.clearButton}
              >
                Clear All
              </Button>
            </motion.div>
          )}
        </Space>
      </AnimatePresence>

      <div className={styles.summary}>
        <span className={styles.summaryText}>
          {filterChips.length} active filter{filterChips.length !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};
