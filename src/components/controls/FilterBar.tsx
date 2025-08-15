// src/components/controls/FilterBar.tsx
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Card, 
  Select, 
  Button, 
  Space, 
  Badge, 
  Tooltip,
  Drawer,
  Grid,
  Radio,
} from 'antd';
import {
  FilterOutlined,
  ClearOutlined,
  CalendarOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import { useComponentLogger } from '@/utils/logger';
import { FilterChips } from './FilterChips';
import type { SurveyYear } from '@/types/data';
import styles from './FilterBar.module.css';

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

export const FilterBar: React.FC = () => {
  const logger = useComponentLogger('FilterBar');
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  
  // Store state
  const selectedCounties = useAnalyticsStore(state => state.parameters.selectedCounties);
  const selectedYear = useAnalyticsStore(state => state.parameters.selectedYear);
  const setSelectedCounties = useAnalyticsStore(state => state.setSelectedCounties);
  const setSelectedYear = useAnalyticsStore(state => state.setSelectedYear);
  const summaryData = useAnalyticsStore(state => state.data.summaryData);
  
  // Local state
  const [searchValue, setSearchValue] = useState('');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  
  // Get available counties from data
  const availableCounties = useMemo(() => {
  if (!summaryData?.localAuthorities) return [];
  return [...summaryData.localAuthorities].sort(); // Create a copy with spread operator
}, [summaryData]);

  useEffect(() => {
    logger.mount({ 
      selectedCounties: selectedCounties.length,
      selectedYear,
      availableCounties: availableCounties.length 
    });
    return () => logger.unmount();
  }, []);

  const handleCountyChange = (values: string[]) => {
    logger.action('countiesSelected', { 
      count: values.length, 
      counties: values,
      previous: selectedCounties 
    });
    setSelectedCounties(values);
  };

  const handleYearChange = (year: SurveyYear | 'both') => {
    logger.action('yearSelected', { 
      year,
      previous: selectedYear 
    });
    setSelectedYear(year);
  };

  const handleSelectAll = () => {
    logger.action('selectAllCounties', { count: availableCounties.length });
    setSelectedCounties(availableCounties);
  };

  const handleClearAll = () => {
    logger.action('clearAllFilters');
    setSelectedCounties([]);
    setSearchValue('');
  };

  const handleRemoveCounty = (county: string) => {
    logger.action('removeCounty', { county });
    setSelectedCounties(selectedCounties.filter(c => c !== county));
  };

  // Filter counties based on search
  const filteredCounties = useMemo(() => {
    if (!searchValue) return availableCounties;
    
    const searchLower = searchValue.toLowerCase();
    return availableCounties.filter(code => {
      const name = COUNTY_NAMES[code] || code;
      return name.toLowerCase().includes(searchLower) || 
             code.toLowerCase().includes(searchLower);
    });
  }, [availableCounties, searchValue]);

  const filterCount = selectedCounties.length + (selectedYear !== 'both' ? 1 : 0);

  // Mobile filter content
  const FilterContent = () => (
    <div className={styles.filterContent}>
      {/* Year Selector */}
      <div className={styles.filterSection}>
        <div className={styles.filterLabel}>
          <CalendarOutlined /> Survey Year
        </div>
        <Radio.Group 
          value={selectedYear}
          onChange={(e) => handleYearChange(e.target.value)}
          className={styles.yearSelector}
        >
          <Radio.Button value="2011">2011</Radio.Button>
          <Radio.Button value="2018">2018</Radio.Button>
          <Radio.Button value="both">Compare</Radio.Button>
        </Radio.Group>
      </div>

      {/* County Selector */}
      <div className={styles.filterSection}>
        <div className={styles.filterLabel}>
          <EnvironmentOutlined /> Local Authorities
          <Badge 
            count={selectedCounties.length} 
            className={styles.countBadge}
            showZero
          />
        </div>
        
        <Select
          mode="multiple"
          placeholder="Select counties..."
          value={selectedCounties}
          onChange={handleCountyChange}
          className={styles.countySelect}
          showSearch
          searchValue={searchValue}
          onSearch={setSearchValue}
          filterOption={false}
          notFoundContent={<div>No matches found</div>}
          maxTagCount={isMobile ? 2 : 5}
          dropdownRender={(menu) => (
            <>
              <div className={styles.dropdownActions}>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={handleSelectAll}
                >
                  Select All
                </Button>
                <Button 
                  type="link" 
                  size="small" 
                  onClick={() => setSelectedCounties([])}
                >
                  Clear
                </Button>
              </div>
              {menu}
            </>
          )}
        >
          {filteredCounties.map(code => (
            <Option key={code} value={code}>
              <span className={styles.countyOption}>
                <span className={styles.countyName}>
                  {COUNTY_NAMES[code] || code}
                </span>
                <span className={styles.countyCode}>({code})</span>
              </span>
            </Option>
          ))}
        </Select>

        {/* Quick filters */}
        <Space wrap className={styles.quickFilters}>
          <Button 
            size="small"
            onClick={() => {
              const dublinCounties = ['DCC', 'DLRD', 'FIN', 'STHDUB'];
              handleCountyChange(dublinCounties);
              logger.action('quickFilter', { filter: 'Dublin' });
            }}
          >
            Dublin Region
          </Button>
          <Button 
            size="small"
            onClick={() => {
              const cities = ['CORKCITY', 'DCC', 'GALCITY'];
              handleCountyChange(cities);
              logger.action('quickFilter', { filter: 'Cities' });
            }}
          >
            Cities Only
          </Button>
        </Space>
      </div>

      {/* Active Filters */}
      {filterCount > 0 && (
        <div className={styles.filterSection}>
          <div className={styles.filterLabel}>Active Filters</div>
          <FilterChips
            selectedCounties={selectedCounties}
            selectedYear={selectedYear}
            onRemoveCounty={handleRemoveCounty}
            onClearAll={handleClearAll}
          />
        </div>
      )}
    </div>
  );

  // Mobile view with drawer
  if (isMobile) {
    return (
      <>
        <div className={styles.mobileFilterBar}>
          <Button
            type="primary"
            icon={<FilterOutlined />}
            onClick={() => setMobileDrawerOpen(true)}
            className={styles.mobileFilterButton}
          >
            Filters
            {filterCount > 0 && (
              <Badge count={filterCount} className={styles.mobileBadge} />
            )}
          </Button>
        </div>

        <Drawer
          title="Filters"
          placement="bottom"
          height="70%"
          onClose={() => setMobileDrawerOpen(false)}
          open={mobileDrawerOpen}
          className={styles.mobileDrawer}
          extra={
            <Button 
              type="text" 
              icon={<ClearOutlined />}
              onClick={handleClearAll}
              disabled={filterCount === 0}
            >
              Clear
            </Button>
          }
        >
          <FilterContent />
        </Drawer>
      </>
    );
  }

  // Desktop view
  return (
    <Card 
      className={styles.filterBar}
      title={
        <Space>
          <FilterOutlined />
          <span>Filters</span>
          {filterCount > 0 && (
            <Badge count={filterCount} className={styles.filterCount} />
          )}
        </Space>
      }
      extra={
        <Tooltip title="Clear all filters">
          <Button 
            type="text" 
            icon={<ClearOutlined />}
            onClick={handleClearAll}
            disabled={filterCount === 0}
          />
        </Tooltip>
      }
    >
      <FilterContent />
    </Card>
  );
};