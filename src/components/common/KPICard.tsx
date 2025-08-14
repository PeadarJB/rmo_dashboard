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

export interface KPICardProps {
  title: string;
  value: number | string;
  prefix?: string;
  suffix?: string;
  precision?: number;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
  description?: string;
  formatter?: (value: number | string) => string;
  color?: 'default' | 'success' | 'warning' | 'error';
  size?: 'small' | 'default' | 'large';
  onClick?: () => void;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  prefix,
  suffix,
  precision = 0,
  trend,
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
  }, []);

  useEffect(() => {
    if (value !== displayValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setDisplayValue(value);
        setIsAnimating(false);
        logger.action('valueUpdate', { 
          title, 
          oldValue: displayValue, 
          newValue: value 
        });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [value]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      logger.action('cardClick', { title });
    }
  };

  const getColorClass = () => {
    switch (color) {
      case 'success': return styles.success;
      case 'warning': return styles.warning;
      case 'error': return styles.error;
      default: return styles.default;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'small': return styles.small;
      case 'large': return styles.large;
      default: return styles.medium;
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
          <span className={styles.title}>{title}</span>
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
                className={`${styles.value} ${isAnimating ? styles.animating : ''}`}
              >
                {prefix && <span className={styles.prefix}>{prefix}</span>}
                <span className={styles.number}>{formatValue()}</span>
                {suffix && <span className={styles.suffix}>{suffix}</span>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {trend && !loading && (
          <div className={styles.trend}>
            <span className={trend.isPositive ? styles.trendUp : styles.trendDown}>
              {trend.isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
              <span className={styles.trendValue}>
                {Math.abs(trend.value).toFixed(1)}%
              </span>
            </span>
            <span className={styles.trendLabel}>vs previous</span>
          </div>
        )}
      </Card>
    </motion.div>
  );
};