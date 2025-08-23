import React, { useMemo, useCallback } from 'react';
import { Space, Segmented, Select, Button, Tooltip, Dropdown, message, Grid, Badge } from 'antd';
import {
  PercentageOutlined,
  BarChartOutlined,
  DollarOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
  ReloadOutlined,
  DownloadOutlined,
  LinkOutlined,
  CompressOutlined,
  ExpandOutlined,
  FilterOutlined, // Import the new icon
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { CHART_FILTER_PRESETS, DEFAULT_CHART_FILTERS } from '@/store/slices/chartFiltersSlice';
import { useComponentLogger } from '@/utils/logger';
import type { SurveyYear } from '@/types/data';
import type { ChartMetric } from '@/store/slices/chartFiltersSlice';
import styles from './ChartToolbar.module.css';
import { COUNTY_NAMES } from '@/utils/countyLabels';

const { Option } = Select;
const { useBreakpoint } = Grid;

interface ChartToolbarProps {
  onExport?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
  onOpenFilters?: () => void; // New prop to open the sider
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  onExport,
  onFullscreen,
  isFullscreen = false,
  className,
  onOpenFilters, // Destructure the new prop
}) => {
  const logger = useComponentLogger('ChartToolbar');
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  // Zustand store selectors
  const chartFilters = useAnalyticsStore((s) => s.chartFilters);
  const summaryData = useAnalyticsStore((s) => s.data?.summaryData);
  const setChartMetric = useAnalyticsStore((s) => s.setChartMetric);
  const setChartPrimaryYear = useAnalyticsStore((s) => s.setChartPrimaryYear);
  const setChartCompareYear = useAnalyticsStore((s) => s.setChartCompareYear);
  const resetChartFilters = useAnalyticsStore((s) => s.resetChartFilters);
  const { selectedCounties } = useAnalyticsStore((s) => s.chartFilters);
  const setChartCounties = useAnalyticsStore((s) => s.setChartCounties);

  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;
    if (chartFilters.metric !== DEFAULT_CHART_FILTERS.metric) count += 1;
    if (chartFilters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) count += 1;
    if (chartFilters.compareYear) count += 1;
    count += chartFilters.selectedCounties.length;

    return { hasActiveFilters: count > 0, activeFilterCount: count };
  }, [chartFilters]);

  // Available counties for multi-select
  const availableCounties = useMemo(() => {
    if (!summaryData?.localAuthorities) return [];
    return [...summaryData.localAuthorities].sort();
  }, [summaryData]);

  // Compare-year options (exclude current primaryYear)
  const compareYearOptions = useMemo(() => {
    const years: SurveyYear[] = ['2011', '2018', '2025'];
    return years.filter((y) => y !== chartFilters.primaryYear);
  }, [chartFilters.primaryYear]);

  // Metric options
  const metricOptions = useMemo(
    () => [
      {
        label: (
          <span className={styles.metricOption}>
            <PercentageOutlined />
            <span className={styles.metricLabel}>Percentage</span>
          </span>
        ),
        value: 'percentage' as ChartMetric,
      },
      {
        label: (
          <span className={styles.metricOption}>
            <BarChartOutlined />
            <span className={styles.metricLabel}>Length</span>
          </span>
        ),
        value: 'length' as ChartMetric,
      },
      {
        label: (
          <span className={styles.metricOption}>
            <DollarOutlined />
            <span className={styles.metricLabel}>Cost</span>
          </span>
        ),
        value: 'cost' as ChartMetric,
      },
    ],
    []
  );

  // Preset menu
  const presetMenuItems: MenuProps['items'] = useMemo(
    () =>
      Object.entries(CHART_FILTER_PRESETS).map(([key, preset]) => ({
        key,
        label: preset.name,
        onClick: () => {
          logger.action('applyPreset', { preset: key });
          setChartCounties(preset.counties);
          message.success(`Applied ${preset.name} filter`);
        },
      })),
    [setChartCounties, logger]
  );

  // Handlers
  const handleMetricChange = useCallback(
    (value: string | number) => {
      setChartMetric(value as ChartMetric);
    },
    [setChartMetric]
  );

  const handleYearChange = useCallback(
    (value: SurveyYear) => {
      setChartPrimaryYear(value);
    },
    [setChartPrimaryYear]
  );

  const handleCompareYearChange = useCallback(
    (value: SurveyYear | undefined) => {
      setChartCompareYear(value || null);
    },
    [setChartCompareYear]
  );

  const handleCountyChange = useCallback(
    (values: string[]) => {
      setChartCounties(values);
    },
    [setChartCounties]
  );

  const handleCopyLink = useCallback(() => {
    // This logic will be passed up to the parent to be handled in FilterControls
    // For now, it remains here but will be moved.
    const params = new URLSearchParams();
    if (chartFilters.metric !== DEFAULT_CHART_FILTERS.metric) params.set('metric', chartFilters.metric);
    if (chartFilters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) params.set('year', chartFilters.primaryYear);
    if (chartFilters.compareYear) params.set('compare', chartFilters.compareYear);
    if (chartFilters.selectedCounties.length > 0) params.set('counties', chartFilters.selectedCounties.join(','));

    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(() => {
      message.success('Link copied to clipboard');
    });
  }, [chartFilters]);

  const handleReset = useCallback(() => {
    resetChartFilters();
    message.info('Filters reset to defaults');
  }, [resetChartFilters]);

  const renderCountyDropdown = useCallback(
    (menu: React.ReactElement) => (
      <div className={styles.countyDropdown}>
        <div className={styles.dropdownHeader}>
          <Button type="link" size="small" onClick={() => setChartCounties(availableCounties)}>Select All</Button>
          <Button type="link" size="small" onClick={() => setChartCounties([])}>Clear</Button>
          <Dropdown menu={{ items: presetMenuItems }} placement="bottomRight">
            <Button type="link" size="small">Presets</Button>
          </Dropdown>
        </div>
        {menu}
      </div>
    ),
    [availableCounties, presetMenuItems, setChartCounties]
  );

  const maxTagCount = useMemo(() => {
    if (isTablet) return 2;
    return 'responsive' as const;
  }, [isTablet]);

  // Conditional Rendering for Mobile vs. Desktop
  if (isMobile) {
    return (
      <div className={`${styles.toolbar} ${className || ''}`}>
        <Badge count={activeFilterCount} size="small">
          <Button icon={<FilterOutlined />} onClick={onOpenFilters}>
            Filters
          </Button>
        </Badge>
      </div>
    );
  }

  return (
    <div className={`${styles.toolbar} ${className || ''}`}>
      <div className={styles.toolbarControls}>
        <Segmented
          value={chartFilters.metric}
          onChange={handleMetricChange}
          options={metricOptions}
          className={styles.metricSelector}
        />
        <Select
          value={chartFilters.primaryYear}
          onChange={handleYearChange}
          options={[{ label: '2011', value: '2011' }, { label: '2018', value: '2018' }, { label: '2025', value: '2025' }]}
          style={{ minWidth: 96 }}
          suffixIcon={<CalendarOutlined />}
        />
        <Select
          allowClear
          placeholder="Compare"
          value={chartFilters.compareYear || undefined}
          onChange={handleCompareYearChange}
          options={compareYearOptions.map((y) => ({ label: y, value: y }))}
          style={{ minWidth: 120 }}
          suffixIcon={<CalendarOutlined />}
        />
        <Badge count={selectedCounties.length} offset={[-8, 0]}>
          <Select
            mode="multiple"
            placeholder="All Counties"
            value={chartFilters.selectedCounties}
            onChange={handleCountyChange}
            style={{ minWidth: 260 }}
            maxTagCount={maxTagCount}
            maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
            suffixIcon={<EnvironmentOutlined />}
            popupRender={renderCountyDropdown}
            filterOption={(input, option) => {
              const code = String(option?.value || '');
              const name = COUNTY_NAMES[code] || '';
              const lowerInput = input.toLowerCase();
              // Search both county name and county code
              return name.toLowerCase().includes(lowerInput) || code.toLowerCase().includes(lowerInput);
            }}
          >
            {availableCounties.map((code: string) => (
              <Option key={code} value={code} label={COUNTY_NAMES[code] || code}>
                <span className={styles.countyOption}>
                  <span>{COUNTY_NAMES[code] || code}</span>
                  <span className={styles.countyCode}>({code})</span>
                </span>
              </Option>
            ))}
          </Select>
        </Badge>
      </div>
      <div className={styles.toolbarActions}>
        <Space.Compact>
          <Tooltip title="Copy shareable link"><Button icon={<LinkOutlined />} onClick={handleCopyLink} /></Tooltip>
          {onExport && <Tooltip title="Export chart"><Button icon={<DownloadOutlined />} onClick={onExport} /></Tooltip>}
          {onFullscreen && <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}><Button icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />} onClick={onFullscreen} /></Tooltip>}
          <Tooltip title="Reset filters">
            <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={!hasActiveFilters}>
              {activeFilterCount > 0 && <span className={styles.resetLabel}>Reset ({activeFilterCount})</span>}
            </Button>
          </Tooltip>
        </Space.Compact>
      </div>
    </div>
  );
};
