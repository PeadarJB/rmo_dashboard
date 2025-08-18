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
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { CHART_FILTER_PRESETS, DEFAULT_CHART_FILTERS } from '@/store/slices/chartFiltersSlice';
import { useComponentLogger } from '@/utils/logger';
import type { SurveyYear } from '@/types/data';
import type { ChartMetric } from '@/store/slices/chartFiltersSlice';
import styles from './ChartToolbar.module.css';

const { Option } = Select;
const { useBreakpoint } = Grid;

const COUNTY_NAMES: Record<string, string> = {
  CAR: 'Carlow',
  CAV: 'Cavan',
  CLA: 'Clare',
  COR: 'Cork',
  CORKCITY: 'Cork City',
  DCC: 'Dublin City',
  DLRD: 'Dún Laoghaire-Rathdown',
  DON: 'Donegal',
  FIN: 'Fingal',
  GALCITY: 'Galway City',
  GAL: 'Galway',
  KER: 'Kerry',
  KIL: 'Kildare',
  KIK: 'Kilkenny',
  LAO: 'Laois',
  LEI: 'Leitrim',
  LIM: 'Limerick',
  LON: 'Longford',
  LOU: 'Louth',
  MAY: 'Mayo',
  MEA: 'Meath',
  MON: 'Monaghan',
  OFF: 'Offaly',
  ROS: 'Roscommon',
  SLI: 'Sligo',
  STHDUB: 'South Dublin',
  TIP: 'Tipperary',
  WAT: 'Waterford',
  WES: 'Westmeath',
  WEX: 'Wexford',
  WIC: 'Wicklow',
};

interface ChartToolbarProps {
  onExport?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  className?: string;
}

export const ChartToolbar: React.FC<ChartToolbarProps> = ({
  onExport,
  onFullscreen,
  isFullscreen = false,
  className,
}) => {
  const logger = useComponentLogger('ChartToolbar');
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isTablet = screens.md && !screens.lg;

  // ✅ One-selector-per-field; no equality function arg
  const chartFilters = useAnalyticsStore((s) => s.chartFilters);
  const summaryData = useAnalyticsStore((s) => s.data?.summaryData);
  const setChartMetric = useAnalyticsStore((s) => s.setChartMetric);
  const setChartPrimaryYear = useAnalyticsStore((s) => s.setChartPrimaryYear);
  const setChartCompareYear = useAnalyticsStore((s) => s.setChartCompareYear);
  const setChartCounties = useAnalyticsStore((s) => s.setChartCounties);
  const resetChartFilters = useAnalyticsStore((s) => s.resetChartFilters);

  // Derive "has active filters" and a count locally (avoids external selectors)
  const { hasActiveFilters, activeFilterCount } = useMemo(() => {
    let count = 0;
    if (chartFilters.metric !== DEFAULT_CHART_FILTERS.metric) count += 1;
    if (chartFilters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) count += 1;
    if (chartFilters.compareYear) count += 1;
    if (chartFilters.selectedCounties.length > 0) count += chartFilters.selectedCounties.length;
    if (
      chartFilters.sortBy !== DEFAULT_CHART_FILTERS.sortBy ||
      chartFilters.sortOrder !== DEFAULT_CHART_FILTERS.sortOrder
    ) {
      count += 1;
    }
    if (chartFilters.showTopN !== null) count += 1;

    return { hasActiveFilters: count > 0, activeFilterCount: count };
  }, [chartFilters]);

  // Available counties for multi-select
  const availableCounties = useMemo(() => {
    if (!summaryData?.localAuthorities) return [];
    return [...summaryData.localAuthorities].sort();
  }, [summaryData]);

  // Compare-year options (exclude current primaryYear)
  const compareYearOptions = useMemo(() => {
    const years: SurveyYear[] = ['2011', '2018'];
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
      const metric = value as ChartMetric;
      logger.action('changeMetric', { from: chartFilters.metric, to: metric });
      setChartMetric(metric);
    },
    [chartFilters.metric, setChartMetric, logger]
  );

  const handleYearChange = useCallback(
    (value: SurveyYear) => {
      logger.action('changeYear', { from: chartFilters.primaryYear, to: value });
      setChartPrimaryYear(value);
    },
    [chartFilters.primaryYear, setChartPrimaryYear, logger]
  );

  const handleCompareYearChange = useCallback(
    (value: SurveyYear | undefined) => {
      logger.action('changeCompareYear', { from: chartFilters.compareYear, to: value || null });
      setChartCompareYear(value || null);
    },
    [chartFilters.compareYear, setChartCompareYear, logger]
  );

  const handleCountyChange = useCallback(
    (values: string[]) => {
      logger.action('changeCounties', { count: values.length, counties: values });
      setChartCounties(values);
    },
    [setChartCounties, logger]
  );

  const handleCopyLink = useCallback(() => {
    const params = new URLSearchParams();
    if (chartFilters.metric !== DEFAULT_CHART_FILTERS.metric) params.set('metric', chartFilters.metric);
    if (chartFilters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) params.set('year', chartFilters.primaryYear);
    if (chartFilters.compareYear) params.set('compare', chartFilters.compareYear);
    if (chartFilters.selectedCounties.length > 0) params.set('counties', chartFilters.selectedCounties.join(','));

    const url = `${window.location.origin}${window.location.pathname}${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    navigator.clipboard.writeText(url).then(() => {
      message.success('Link copied to clipboard');
      logger.action('copyLink', { url });
    });
  }, [chartFilters, logger]);

  const handleReset = useCallback(() => {
    logger.action('resetFilters');
    resetChartFilters();
    message.info('Filters reset to defaults');
  }, [resetChartFilters, logger]);

  // Enhance county dropdown with quick actions
  const renderCountyDropdown = useCallback(
    (menu: React.ReactElement) => (
      <div className={styles.countyDropdown}>
        <div className={styles.dropdownHeader}>
          <Button type="link" size="small" onClick={() => setChartCounties(availableCounties)}>
            Select All
          </Button>
          <Button type="link" size="small" onClick={() => setChartCounties([])}>
            Clear
          </Button>
          <Dropdown menu={{ items: presetMenuItems }} placement="bottomRight">
            <Button type="link" size="small">
              Quick Presets
            </Button>
          </Dropdown>
        </div>
        {menu}
      </div>
    ),
    [availableCounties, presetMenuItems, setChartCounties]
  );

  const maxTagCount = useMemo(() => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 'responsive' as const;
  }, [isMobile, isTablet]);

  return (
    <Space wrap size="small" className={`${styles.toolbar} ${className || ''}`}>
      {/* Metric */}
      <Segmented
        value={chartFilters.metric}
        onChange={handleMetricChange}
        options={
          isMobile
            ? [
                { label: <PercentageOutlined />, value: 'percentage' as ChartMetric },
                { label: <BarChartOutlined />, value: 'length' as ChartMetric },
                { label: <DollarOutlined />, value: 'cost' as ChartMetric },
              ]
            : metricOptions
        }
        className={styles.metricSelector}
      />

      {/* Year */}
      <Select
        value={chartFilters.primaryYear}
        onChange={handleYearChange}
        options={[
          { label: '2011', value: '2011' as SurveyYear },
          { label: '2018', value: '2018' as SurveyYear },
        ]}
        style={{ minWidth: isMobile ? 80 : 96 }}
        suffixIcon={<CalendarOutlined />}
        placeholder="Year"
      />

      {/* Compare Year */}
      <Select
        allowClear
        placeholder="Compare"
        value={chartFilters.compareYear || undefined}
        onChange={handleCompareYearChange}
        options={compareYearOptions.map((y) => ({ label: y, value: y }))}
        style={{ minWidth: isMobile ? 100 : 120 }}
        suffixIcon={<CalendarOutlined />}
      />

      {/* Counties */}
      <Badge count={chartFilters.selectedCounties.length} offset={[-8, 0]}>
        <Select
          mode="multiple"
          placeholder="All Counties"
          value={chartFilters.selectedCounties}
          onChange={handleCountyChange}
          style={{ minWidth: isMobile ? 140 : 260 }}
          maxTagCount={maxTagCount}
          maxTagPlaceholder={(omitted) => `+${omitted.length} more`}
          suffixIcon={<EnvironmentOutlined />}
          popupRender={renderCountyDropdown}
          filterOption={(input, option) => {
            const countyCode = (option?.value ?? '') as string;
            const countyName = COUNTY_NAMES[countyCode] || countyCode;
            const q = input.toLowerCase();
            return countyName.toLowerCase().includes(q) || countyCode.toLowerCase().includes(q);
          }}
        >
          {availableCounties.map((code: string) => (
            <Option key={code} value={code}>
              <span className={styles.countyOption}>
                <span>{COUNTY_NAMES[code] || code}</span>
                <span className={styles.countyCode}>({code})</span>
              </span>
            </Option>
          ))}
        </Select>
      </Badge>

      {/* Actions */}
      <Space.Compact>
        <Tooltip title="Copy shareable link">
          <Button icon={<LinkOutlined />} onClick={handleCopyLink} />
        </Tooltip>

        {onExport && (
          <Tooltip title="Export chart">
            <Button icon={<DownloadOutlined />} onClick={onExport} />
          </Tooltip>
        )}

        {onFullscreen && (
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <Button icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />} onClick={onFullscreen} />
          </Tooltip>
        )}

        <Tooltip title="Reset filters">
          <Button icon={<ReloadOutlined />} onClick={handleReset} disabled={!hasActiveFilters}>
            {!isMobile && activeFilterCount > 0 && (
              <span className={styles.resetLabel}>Reset ({activeFilterCount})</span>
            )}
          </Button>
        </Tooltip>
      </Space.Compact>
    </Space>
  );
};
