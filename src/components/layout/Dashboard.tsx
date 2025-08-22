// src/components/layout/Dashboard.tsx
import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import styles from './Dashboard.module.css';
import { Header } from './Header';
import { ControlsSider, FilterSider } from './'; // Updated import
import { FilterControls } from '@/components/controls'; // Import FilterControls
import { useRecalculationManager } from '@/hooks/useRecalculationManager';

const { Content } = Layout;

interface DashboardProps {
  children?: React.ReactNode;
  onThemeChange?: (isDark: boolean) => void;
  isDarkMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  children,
  onThemeChange,
  isDarkMode = false,
}) => {
  const { token } = theme.useToken();
  const [controlsSiderVisible, setControlsSiderVisible] = useState(false);
  const [filterSiderVisible, setFilterSiderVisible] = useState(false); // New state for filter sider
  useRecalculationManager();

  const toggleControlsSider = () => {
    setControlsSiderVisible(!controlsSiderVisible);
  };

  const toggleFilterSider = () => {
    setFilterSiderVisible(!filterSiderVisible);
  };

  return (
    <div className={styles.appWrapper}>
      {/* Parameter Controls Sider (Left) */}
      <ControlsSider isVisible={controlsSiderVisible} onClose={toggleControlsSider} />

      {/* Filter & Display Sider (Right) */}
      <FilterSider isVisible={filterSiderVisible} onClose={toggleFilterSider}>
        <FilterControls />
      </FilterSider>

      <Layout className={styles.mainLayout}>
        <Layout.Header
          className={styles.header}
          style={{ background: token.colorBgContainer, padding: 0 }}
        >
          <Header
            onThemeChange={onThemeChange}
            isDarkMode={isDarkMode}
            onMenuClick={toggleControlsSider} // This controls the left sider
            isSiderVisible={controlsSiderVisible}
            // onFilterClick will be added in a later step
          />
        </Layout.Header>

        <Content className={styles.content}>
          <div className={styles.contentGrid}>{children}</div>
        </Content>
      </Layout>
    </div>
  );
};
