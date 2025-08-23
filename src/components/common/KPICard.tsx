// src/components/common/KPICard.tsx
import React, { useEffect, useState } from 'react';
import { Card, Tooltip } from 'antd';
import {
  ArrowUpOutlined,
  ArrowDownOutlined,
  InfoCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useComponentLogger } from '@/utils/logger';
import styles from './KPICard.module.css';
import type { TrendComparison } from '@/types/ui';
import type { SurveyYear } from '@/types/data';

export interface KPICardProps {
  title: string;
  primaryYear: SurveyYear;
  value: number | string;
  prefix?: string;
  suffix?: string;
  precision?: number;
  trends?: TrendComparison[];
  loading?: boolean;
  description?: string;
  formatter?: (value: number | string) => string;
  color?: 'default' | 'success' | 'warning' | 'error';
  size?: 'small' | 'default' | 'large';
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  primaryYear,
  value,
  prefix,
  suffix,
  precision = 0,
  trends,
  loading = false,
  description,
  formatter,
  color = 'default',
  size = 'default',
  onClick,
}) => {
  const logger = useComponentLogger('KPICard');
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    logger.mount({ title, value });
    return () => logger.unmount();
  }, [title, value, logger]);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
        logger.action('valueUpdate', {
          title,
          oldValue: displayValue,
          newValue: value,
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value, displayValue, title, logger]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      logger.action('cardClick', { title });
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'success':
        return styles.success;
      case 'warning':
        return styles.warning;
      case 'error':
        return styles.error;
      default:
        return styles.default;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return styles.small;
      case 'large':
        return styles.large;
      default:
        return styles.medium;
    }
  };

  const formatValue = () => {
    if (formatter) {
      return formatter(displayValue);
    }
    if (typeof displayValue === 'number') {
      return displayValue.toLocaleString('en-IE', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
      });
    }
    return displayValue;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card
        className={`${styles.kpiCard} ${getColorClass()} ${getSizeClass()} ${
          onClick ? styles.clickable : ''
        }`}
        onClick={handleClick}
        loading={loading}
      >
        <div className={styles.header}>
          <span className={styles.title}>
            {title} ({primaryYear})
          </span>
          {description && (
            <Tooltip title={description}>
              <InfoCircleOutlined className={styles.infoIcon} />
            </Tooltip>
          )}
        </div>

        <div className={styles.content}>
          <AnimatePresence mode="wait">
            {loading ? (
              <LoadingOutlined className={styles.loadingIcon} />
            ) : (
              <motion.div
                key={String(displayValue)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className={`${styles.value} ${
                  isAnimating ? styles.animating : ''
                }`}
              >
                {prefix && <span className={styles.prefix}>{prefix}</span>}
                <span className={styles.number}>{formatValue()}</span>
                {suffix && <span className={styles.suffix}>{suffix}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {trends && trends.length > 0 && !loading && (
          <div className={styles.trendTicker}>
            {trends.map((trend) => (
              <div key={trend.year} className={styles.tickerItem}>
                <span className={styles.tickerYear}>vs {trend.year}</span>
                <span
                  className={`${styles.tickerValue} ${
                    trend.direction === 'up'
                      ? styles.tickerUp
                      : trend.direction === 'down'
                      ? styles.tickerDown
                      : styles.tickerNeutral
                  }`}
                >
                  {trend.direction === 'up' && <ArrowUpOutlined />}
                  {trend.direction === 'down' && <ArrowDownOutlined />}
                  {trend.percentChange.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  );
};