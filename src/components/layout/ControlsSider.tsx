// src/components/layout/ControlsSider.tsx
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from 'antd';
import { CloseOutlined, ControlOutlined } from '@ant-design/icons';
import { ParameterCostControls } from '@/components/controls/ParameterCostControls';
import styles from './ControlsSider.module.css';
import clsx from 'clsx'; // Make sure to import a class utility

interface ControlsSiderProps {
  isVisible: boolean;
  onClose: () => void;
  isDarkMode?: boolean; // Add isDarkMode to the props
}

export const ControlsSider: React.FC<ControlsSiderProps> = ({
  isVisible,
  onClose,
  isDarkMode = false, // Default to dark mode styles if not provided
}) => {
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
          {/* Change is on the next line */}
          <div
            className={clsx(styles.siderContent, {
              [styles.lightTheme]: !isDarkMode,
            })}
          >
            <ParameterCostControls />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};