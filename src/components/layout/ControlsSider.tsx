import React from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion'; // Import Variants type
import { ParameterCostControls } from '@/components/controls/ParameterCostControls';
import { FilterBar } from '@/components/controls/FilterBar';
import styles from './ControlsSider.module.css';

interface ControlsSiderProps {
  isVisible: boolean;
}

/**
 * An animated, overlaying sidebar for user controls.
 */
export const ControlsSider: React.FC<ControlsSiderProps> = ({ isVisible }) => {
  // Explicitly type the variants object with the 'Variants' type from Framer Motion
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
          <div className={styles.siderContent}>
            <ParameterCostControls />
            <FilterBar />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};