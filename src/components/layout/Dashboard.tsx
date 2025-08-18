// src/components/layout/Dashboard.tsx
import React, { useState } from 'react';
import { Layout, theme } from 'antd';
import styles from './Dashboard.module.css';
import { Header } from './Header';
import { ControlsSider } from './ControlsSider';

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
  const [siderVisible, setSiderVisible] = useState(true);

  const toggleSider = () => {
    setSiderVisible(!siderVisible);
  };

  return (
    <div className={styles.appWrapper}>
      {/* Pass the toggleSider function as the onClose prop */}
      <ControlsSider isVisible={siderVisible} onClose={toggleSider} />

      <Layout className={styles.mainLayout}>
        <Layout.Header
          className={styles.header}
          style={{ background: token.colorBgContainer, padding: 0 }}
        >
          <Header
            onThemeChange={onThemeChange}
            isDarkMode={isDarkMode}
            onMenuClick={toggleSider}
            isSiderVisible={siderVisible}
          />
        </Layout.Header>

        <Content className={styles.content}>
          <div className={styles.contentGrid}>{children}</div>
        </Content>
      </Layout>
    </div>
  );
};