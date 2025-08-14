// src/components/controls/FilterChips.tsx
import React from 'react';
import { Tag, Space, Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useComponentLogger } from '@/utils/logger';
import type { SurveyYear } from '@/types/data';
import styles from './FilterChips.module.css';

interface FilterChipsProps {
  selectedCounties: string[];
  selectedYear: SurveyYear | 'both';
  onRemoveCounty: (county: string) => void;
  onClearAll: () => void;
}

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

export const FilterChips: React.FC<FilterChipsProps> = ({
  selectedCounties,
  selectedYear,
  onRemoveCounty,
  onClearAll,
}) => {
  const logger = useComponentLogger('FilterChips');

  const handleRemove = (county: string) => {
    logger.action('removeChip', { county });
    onRemoveCounty(county);
  };

  const handleClearAll = () => {
    logger.action('clearAllChips');
    onClearAll();
  };

  const hasFilters = selectedCounties.length > 0 || selectedYear !== 'both';

  if (!hasFilters) return null;

  return (
    <div className={styles.chipsContainer}>
      <Space wrap size={[4, 8]}>
        {/* Year chip */}
        {selectedYear !== 'both' && (
          <Tag className={styles.yearChip} color="blue">
            Year: {selectedYear}
          </Tag>
        )}

        {/* County chips */}
        {selectedCounties.slice(0, 5).map(county => (
          <Tag
            key={county}
            closable
            onClose={() => handleRemove(county)}
            className={styles.countyChip}
          >
            {COUNTY_NAMES[county] || county}
          </Tag>
        ))}

        {/* Overflow indicator */}
        {selectedCounties.length > 5 && (
          <Tag className={styles.overflowChip}>
            +{selectedCounties.length - 5} more
          </Tag>
        )}

        {/* Clear all button */}
        {hasFilters && (
          <Button
            size="small"
            type="text"
            icon={<ClearOutlined />}
            onClick={handleClearAll}
            className={styles.clearButton}
          >
            Clear All
          </Button>
        )}
      </Space>
    </div>
  );
};