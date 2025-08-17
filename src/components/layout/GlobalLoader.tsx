import React from 'react';
import { Spin, Typography } from 'antd';
import styles from './GlobalLoader.module.css';

const { Text } = Typography;

interface GlobalLoaderProps {
  message?: string;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({
  message = 'Loading...',
}) => {
  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderBox}>
        <Spin size="large" />
        <Text type="secondary" className={styles.loaderText}>
          {message}
        </Text>
      </div>
    </div>
  );
};