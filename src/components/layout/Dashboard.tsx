// src/components/layout/Dashboard.tsx
import React from 'react';
import { Layout, theme } from 'antd';
import styles from './Dashboard.module.css';
import { Header } from './Header';
import { ControlsSider, FilterSider } from './';
import { FilterControls } from '@/components/controls';
import { useRecalculationManager } from '@/hooks/useRecalculationManager';

const { Content } = Layout;

interface DashboardProps {
  children?: React.ReactNode;
  onThemeChange?: (isDark: boolean) => void;
  isDarkMode?: boolean;
  // Props to control siders from the parent component (App.tsx)
  isControlsSiderVisible: boolean;
  onToggleControlsSider: () => void;
  isFilterSiderVisible: boolean;
  onToggleFilterSider: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  children,
  onThemeChange,
  isDarkMode = false,
  isControlsSiderVisible,
  onToggleControlsSider,
  isFilterSiderVisible,
  onToggleFilterSider,
}) => {
  const { token } = theme.useToken();
  useRecalculationManager();

  return (
    <div className={styles.appWrapper}>
      {/* Parameter Controls Sider (Left) */}
      <ControlsSider isVisible={isControlsSiderVisible} onClose={onToggleControlsSider} />

      {/* Filter & Display Sider (Right) */}
      <FilterSider isVisible={isFilterSiderVisible} onClose={onToggleFilterSider}>
        <FilterControls />
      </FilterSider>

      <Layout 
        className={styles.mainLayout}
        style={{ 
          paddingLeft: isControlsSiderVisible ? 'clamp(350px, 33vw, 500px)' : 0 
        }}
      >
        <Layout.Header
          className={styles.header}
          style={{ background: token.colorBgContainer, padding: 0 }}
        >
          <Header
            onThemeChange={onThemeChange}
            isDarkMode={isDarkMode}
            onMenuClick={onToggleControlsSider} // Controls the left sider
            isSiderVisible={isControlsSiderVisible}
            onFilterClick={onToggleFilterSider} // Controls the right sider
          />
        </Layout.Header>

        <Content className={styles.content}>
          <div className={styles.contentGrid}>{children}</div>
        </Content>
      </Layout>
    </div>
  );
};
