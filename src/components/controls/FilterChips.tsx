// src/components/controls/FilterChips.tsx
import React from 'react';
import { Tag, Space, Button } from 'antd';
import { ClearOutlined } from '@ant-design/icons';
import { useComponentLogger } from '@/utils/logger';
import { COUNTY_NAMES } from '@/utils/countyLabels'; // Import from centralized utility
import type { SurveyYear } from '@/types/data';
import styles from './FilterChips.module.css';

interface FilterChipsProps {
  selectedCounties: string[];
  selectedYear: SurveyYear | 'both';
  onRemoveCounty: (county: string) => void;
  onClearAll: () => void;
}

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