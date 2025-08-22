// src/components/controls/FilterControls.tsx
import React, { useMemo, useCallback } from 'react';
import {
  Space,
  Segmented,
  Select,
  Button,
  Tooltip,
  Dropdown,
  message,
  Badge,
  Collapse,
  Divider,
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
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { CHART_FILTER_PRESETS, DEFAULT_CHART_FILTERS } from '@/store/slices/chartFiltersSlice';
import { useComponentLogger } from '@/utils/logger';
import type { SurveyYear } from '@/types/data';
import type { ChartMetric } from '@/store/slices/chartFiltersSlice';
import styles from './FilterControls.module.css';
import { COUNTY_NAMES } from '@/utils/countyLabels';

const { Option } = Select;

interface FilterControlsProps {
  onExport?: () => void;
  onCopyLink?: () => void;
}

export const FilterControls: React.FC<FilterControlsProps> = React.memo(
  ({ onExport, onCopyLink }) => {
    const logger = useComponentLogger('FilterControls');

    // State selectors from Zustand store
    const {
      chartFilters,
      summaryData,
      setChartMetric,
      setChartPrimaryYear,
      setChartCompareYear,
      resetChartFilters,
      setChartCounties,
    } = useAnalyticsStore((s) => ({
      chartFilters: s.chartFilters,
      summaryData: s.data.summaryData,
      setChartMetric: s.setChartMetric,
      setChartPrimaryYear: s.setChartPrimaryYear,
      setChartCompareYear: s.setChartCompareYear,
      resetChartFilters: s.resetChartFilters,
      setChartCounties: s.setChartCounties,
    }));

    // Memoized values
    const { hasActiveFilters, activeFilterCount } = useMemo(() => {
        let count = 0;
        if (chartFilters.metric !== DEFAULT_CHART_FILTERS.metric) count++;
        if (chartFilters.primaryYear !== DEFAULT_CHART_FILTERS.primaryYear) count++;
        if (chartFilters.compareYear) count++;
        count += chartFilters.selectedCounties.length;
        return { hasActiveFilters: count > 0, activeFilterCount: count };
    }, [chartFilters]);


    const availableCounties = useMemo(() => {
      if (!summaryData?.localAuthorities) return [];
      return [...summaryData.localAuthorities].sort();
    }, [summaryData]);

    const compareYearOptions = useMemo(() => {
      const years: SurveyYear[] = ['2011', '2018'];
      return years.filter((y) => y !== chartFilters.primaryYear);
    }, [chartFilters.primaryYear]);

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

    // Callbacks
    const handleMetricChange = useCallback((value: string | number) => {
        setChartMetric(value as ChartMetric);
      }, [setChartMetric]);

    const handleYearChange = useCallback((value: SurveyYear) => {
        setChartPrimaryYear(value);
      }, [setChartPrimaryYear]);

    const handleCompareYearChange = useCallback((value: SurveyYear | undefined) => {
        setChartCompareYear(value || null);
      }, [setChartCompareYear]);

    const handleCountyChange = useCallback((values: string[]) => {
        setChartCounties(values);
      }, [setChartCounties]);

    const handleReset = useCallback(() => {
      resetChartFilters();
      message.info('Filters reset to defaults');
    }, [resetChartFilters]);
    
    const renderCountyDropdown = useCallback((menu: React.ReactElement) => (
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
      ), [availableCounties, presetMenuItems, setChartCounties]);

    return (
      <div className={styles.controlsContainer}>
        <Collapse defaultActiveKey={['time', 'location']} ghost>
          <Collapse.Panel header="Time" key="time" className={styles.panel}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div className={styles.controlGroup}>
                <label>Primary Year</label>
                <Select
                  value={chartFilters.primaryYear}
                  onChange={handleYearChange}
                  suffixIcon={<CalendarOutlined />}
                  style={{ width: '100%' }}
                >
                  <Option value="2011">2011</Option>
                  <Option value="2018">2018</Option>
                </Select>
              </div>
              <div className={styles.controlGroup}>
                <label>Compare Year</label>
                <Select
                  allowClear
                  placeholder="Select compare year"
                  value={chartFilters.compareYear || undefined}
                  onChange={handleCompareYearChange}
                  options={compareYearOptions.map((y) => ({ label: y, value: y }))}
                  suffixIcon={<CalendarOutlined />}
                   style={{ width: '100%' }}
                />
              </div>
            </Space>
          </Collapse.Panel>

          <Collapse.Panel header="Location" key="location" className={styles.panel}>
             <div className={styles.controlGroup}>
                <label>Counties</label>
                <Select
                  mode="multiple"
                  placeholder="All Counties"
                  value={chartFilters.selectedCounties}
                  onChange={handleCountyChange}
                  style={{ width: '100%' }}
                  maxTagCount="responsive"
                  suffixIcon={<EnvironmentOutlined />}
                  popupRender={renderCountyDropdown}
                  filterOption={(input, option) => 
                    String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                >
                  {availableCounties.map((code: string) => (
                    <Option key={code} value={code} label={COUNTY_NAMES[code] || code}>
                      {COUNTY_NAMES[code] || code}
                    </Option>
                  ))}
                </Select>
              </div>
          </Collapse.Panel>

          <Collapse.Panel header="Display" key="display" className={styles.panel}>
            <div className={styles.controlGroup}>
              <label>Metric</label>
              <Segmented
                block
                value={chartFilters.metric}
                onChange={handleMetricChange}
                options={[
                  { label: 'Percentage', value: 'percentage', icon: <PercentageOutlined /> },
                  { label: 'Length', value: 'length', icon: <BarChartOutlined /> },
                  { label: 'Cost', value: 'cost', icon: <DollarOutlined /> },
                ]}
              />
            </div>
          </Collapse.Panel>
        </Collapse>
        
        <Divider />

        <Space direction="vertical" style={{ width: '100%' }}>
            <Tooltip title="Copy a shareable link with the current filters">
                <Button icon={<LinkOutlined />} onClick={onCopyLink} block>Copy Link</Button>
            </Tooltip>
            {onExport && (
                <Tooltip title="Export the current chart view as a PNG image">
                    <Button icon={<DownloadOutlined />} onClick={onExport} block>Export Chart</Button>
                </Tooltip>
            )}
            <Tooltip title="Reset all filters to their default values">
                <Badge count={activeFilterCount} size="small">
                    <Button 
                        icon={<ReloadOutlined />} 
                        onClick={handleReset} 
                        disabled={!hasActiveFilters} 
                        block
                        danger
                    >
                        Reset Filters
                    </Button>
                </Badge>
            </Tooltip>
        </Space>
      </div>
    );
  }
);
