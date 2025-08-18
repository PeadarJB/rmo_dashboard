// src/components/layout/ControlsSider.tsx
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from 'antd';
import { CloseOutlined, ControlOutlined } from '@ant-design/icons';
import { ParameterCostControls } from '@/components/controls/ParameterCostControls';
import { FilterBar } from '@/components/controls/FilterBar';
import styles from './ControlsSider.module.css';

interface ControlsSiderProps {
  isVisible: boolean;
  onClose: () => void;
}

export const ControlsSider: React.FC<ControlsSiderProps> = ({ isVisible, onClose }) => {
  const siderVariants: Variants = {
    hidden: {
      x: '-100%',
      transition: { type: 'spring', damping: 25, stiffness: 150 },
    },
    visible: {
      x: 0,
      transition: { type: 'spring', damping: 25, stiffness: 150 },
    },
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.siderContainer}
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={siderVariants}
        >
          <div className={styles.siderHeader}>
            <h3><ControlOutlined /> Controls</h3>
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined />}
              onClick={onClose}
              aria-label="Close controls panel"
            />
          </div>
          <div className={styles.siderContent}>
            <ParameterCostControls />
            <FilterBar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};