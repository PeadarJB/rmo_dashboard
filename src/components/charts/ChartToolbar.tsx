// src/components/charts/ChartToolbar.tsx
import React, { useMemo, useCallback } from 'react';
import { 
  Space, 
  Segmented, 
  Select, 
  Button, 
  Tooltip, 
  Dropdown,
  message,
  Grid,
  Badge,
} from 'antd';
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
import { useAnalyticsStore, selectors } from '@/store/useAnalyticsStore';
import { CHART_FILTER_PRESETS } from '@/store/slices/chartFiltersSlice';
import { useComponentLogger } from '@/utils/logger';
import type { SurveyYear } from '@/types/data';
import type { ChartMetric } from '@/store/slices/chartFiltersSlice';
import styles from './ChartToolbar.module.css';

const { Option } = Select;
const { useBreakpoint } = Grid;

// County code to name mapping
const COUNTY_NAMES: Record<string, string> = {
  'CAR': 'Carlow',
  'CAV': 'Cavan',
  'CLA': 'Clare',
  'COR': 'Cork',
  'CORKCITY': 'Cork City',
  'DCC': 'Dublin City',
  'DLRD': 'Dún Laoghaire-Rathdown',
  'DON': 'Donegal',
  'FIN': 'Fingal',
  'GALCITY': 'Galway City',
  'GAL': 'Galway',
  'KER': 'Kerry',
  'KIL': 'Kildare',
  'KIK': 'Kilkenny',
  'LAO': 'Laois',
  'LEI': 'Leitrim',
  'LIM': 'Limerick',
  'LON': 'Longford',
  'LOU': 'Louth',
  'MAY': 'Mayo',
  'MEA': 'Meath',
  'MON': 'Monaghan',
  'OFF': 'Offaly',
  'ROS': 'Roscommon',
  'SLI': 'Sligo',
  'STHDUB': 'South Dublin',
  'TIP': 'Tipperary',
  'WAT': 'Waterford',
  'WES': 'Westmeath',
  'WEX': 'Wexford',
  'WIC': 'Wicklow',
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

  // Store state and actions
  const {
    chartFilters,
    summaryData,
    hasActiveFilters,
    activeFilterCount,
    setChartMetric,
    setChartPrimaryYear,
    setChartCompareYear,
    setChartCounties,
    resetChartFilters,
  } = useAnalyticsStore((state) => ({
    chartFilters: state.chartFilters,
    summaryData: state.data.summaryData,
    hasActiveFilters: selectors.hasActiveChartFilters(state),
    activeFilterCount: selectors.activeChartFilterCount(state),
    setChartMetric: state.setChartMetric,
    setChartPrimaryYear: state.setChartPrimaryYear,
    setChartCompareYear: state.setChartCompareYear,
    setChartCounties: state.setChartCounties,
    resetChartFilters: state.resetChartFilters,
  }));

  // Available counties from data
  const availableCounties = useMemo(() => {
    if (!summaryData?.localAuthorities) return [];
    return [...summaryData.localAuthorities].sort();
  }, [summaryData]);

  // Available years for comparison (exclude primary year)
  const compareYearOptions = useMemo(() => {
    const years: SurveyYear[] = ['2011', '2018'];
    return years.filter(year => year !== chartFilters.primaryYear);
  }, [chartFilters.primaryYear]);

  // Metric options with icons
  const metricOptions = useMemo(() => [
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
  ], []);

  // Quick filter presets menu
  const presetMenuItems: MenuProps['items'] = useMemo(() => 
    Object.entries(CHART_FILTER_PRESETS).map(([key, preset]) => ({
      key,
      label: preset.name,
      onClick: () => {
        logger.action('applyPreset', { preset: key });
        setChartCounties(preset.counties);
        message.success(`Applied ${preset.name} filter`);
      },
    })),
  [setChartCounties, logger]);

  // Handle metric change
  const handleMetricChange = useCallback((value: string | number) => {
    const metric = value as ChartMetric;
    logger.action('changeMetric', { from: chartFilters.metric, to: metric });
    setChartMetric(metric);
  }, [chartFilters.metric, setChartMetric, logger]);

  // Handle year change
  const handleYearChange = useCallback((value: SurveyYear) => {
    logger.action('changeYear', { from: chartFilters.primaryYear, to: value });
    setChartPrimaryYear(value);
  }, [chartFilters.primaryYear, setChartPrimaryYear, logger]);

  // Handle compare year change
  const handleCompareYearChange = useCallback((value: SurveyYear | undefined) => {
    logger.action('changeCompareYear', { 
      from: chartFilters.compareYear, 
      to: value || null 
    });
    setChartCompareYear(value || null);
  }, [chartFilters.compareYear, setChartCompareYear, logger]);

  // Handle county selection
  const handleCountyChange = useCallback((values: string[]) => {
    logger.action('changeCounties', { 
      count: values.length,
      counties: values 
    });
    setChartCounties(values);
  }, [setChartCounties, logger]);

  // Copy link to clipboard
  const handleCopyLink = useCallback(() => {
    const params = new URLSearchParams();
    
    if (chartFilters.metric !== 'percentage') {
      params.set('metric', chartFilters.metric);
    }
    if (chartFilters.primaryYear !== '2018') {
      params.set('year', chartFilters.primaryYear);
    }
    if (chartFilters.compareYear) {
      params.set('compare', chartFilters.compareYear);
    }
    if (chartFilters.selectedCounties.length > 0) {
      params.set('counties', chartFilters.selectedCounties.join(','));
    }
    
    const url = `${window.location.origin}${window.location.pathname}${
      params.toString() ? `?${params.toString()}` : ''
    }`;
    
    navigator.clipboard.writeText(url).then(() => {
      message.success('Link copied to clipboard');
      logger.action('copyLink', { url });
    });
  }, [chartFilters, logger]);

  // Handle reset
  const handleReset = useCallback(() => {
    logger.action('resetFilters');
    resetChartFilters();
    message.info('Filters reset to defaults');
  }, [resetChartFilters, logger]);

  // Render county selector dropdown content
  const renderCountyDropdown = useCallback((menu: React.ReactElement) => (
    <div className={styles.countyDropdown}>
      <div className={styles.dropdownHeader}>
        <Button 
          type="link" 
          size="small"
          onClick={() => setChartCounties(availableCounties)}
        >
          Select All
        </Button>
        <Button 
          type="link" 
          size="small"
          onClick={() => setChartCounties([])}
        >
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
  ), [availableCounties, presetMenuItems, setChartCounties]);

  // Calculate responsive tag count
  const maxTagCount = useMemo(() => {
    if (isMobile) return 1;
    if (isTablet) return 2;
    return 'responsive';
  }, [isMobile, isTablet]);

  return (
    <Space 
      wrap 
      size="small" 
      className={`${styles.toolbar} ${className || ''}`}
    >
      {/* Metric Selector */}
      <Segmented
        value={chartFilters.metric}
        onChange={handleMetricChange}
        options={isMobile ? 
          // Simple icon-only options for mobile
          [
            { label: <PercentageOutlined />, value: 'percentage' as ChartMetric },
            { label: <BarChartOutlined />, value: 'length' as ChartMetric },
            { label: <DollarOutlined />, value: 'cost' as ChartMetric },
          ] : metricOptions
        }
        className={styles.metricSelector}
      />

      {/* Year Selector */}
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

      {/* Compare Year Selector */}
      <Select
        allowClear
        placeholder="Compare"
        value={chartFilters.compareYear || undefined}
        onChange={handleCompareYearChange}
        options={compareYearOptions.map(year => ({
          label: year,
          value: year,
        }))}
        style={{ minWidth: isMobile ? 100 : 120 }}
        suffixIcon={<CalendarOutlined />}
      />

      {/* County Multi-Select */}
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
          dropdownRender={renderCountyDropdown}
          filterOption={(input, option) => {
            const countyCode = option?.value as string;
            const countyName = COUNTY_NAMES[countyCode] || countyCode;
            return countyName.toLowerCase().includes(input.toLowerCase()) ||
                   countyCode.toLowerCase().includes(input.toLowerCase());
          }}
        >
          {availableCounties.map(code => (
            <Option key={code} value={code}>
              <span className={styles.countyOption}>
                <span>{COUNTY_NAMES[code] || code}</span>
                <span className={styles.countyCode}>({code})</span>
              </span>
            </Option>
          ))}
        </Select>
      </Badge>

      {/* Action Buttons */}
      <Space.Compact>
        <Tooltip title="Copy shareable link">
          <Button 
            icon={<LinkOutlined />} 
            onClick={handleCopyLink}
          />
        </Tooltip>
        
        {onExport && (
          <Tooltip title="Export chart">
            <Button 
              icon={<DownloadOutlined />} 
              onClick={onExport}
            />
          </Tooltip>
        )}
        
        {onFullscreen && (
          <Tooltip title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            <Button 
              icon={isFullscreen ? <CompressOutlined /> : <ExpandOutlined />} 
              onClick={onFullscreen}
            />
          </Tooltip>
        )}
        
        <Tooltip title="Reset filters">
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleReset}
            disabled={!hasActiveFilters}
          >
            {!isMobile && activeFilterCount > 0 && (
              <span className={styles.resetLabel}>
                Reset ({activeFilterCount})
              </span>
            )}
          </Button>
        </Tooltip>
      </Space.Compact>
    </Space>
  );
};