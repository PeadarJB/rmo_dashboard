// src/components/layout/FilterSider.tsx
import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Button } from 'antd';
import { CloseOutlined, FilterOutlined } from '@ant-design/icons';
import styles from './FilterSider.module.css';

interface FilterSiderProps {
  isVisible: boolean;
  onClose: () => void;
  children?: React.ReactNode; // This will hold the FilterControls component
}

export const FilterSider: React.FC<FilterSiderProps> = ({ isVisible, onClose, children }) => {
  // Variants for animating from the right side of the screen
  const siderVariants: Variants = {
    hidden: {
      x: '100%',
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
            <h3>
              <FilterOutlined /> Filters & Display
            </h3>
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined />}
              onClick={onClose}
              aria-label="Close filters panel"
            />
          </div>
          <div className={styles.siderContent}>
            {/* The FilterControls component will be rendered here */}
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
