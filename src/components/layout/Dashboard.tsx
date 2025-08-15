// src/components/layout/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { Layout, Grid, theme } from 'antd';
import { useComponentLogger, usePerformanceTimer } from '@/utils/logger';
import styles from './Dashboard.module.css';
import { Header } from './Header'; // <-- keeps your custom Header component

// Don't destructure Layout.Header to avoid a name clash with our custom Header
const { Content, Sider } = Layout;
const { useBreakpoint } = Grid;

interface DashboardProps {
  children?: React.ReactNode;
  onThemeChange?: (isDark: boolean) => void;
  isDarkMode?: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
  children, 
  onThemeChange,
  isDarkMode = false 
}) => {
  const logger = useComponentLogger('Dashboard');
  const perfTimer = usePerformanceTimer('Dashboard.render');
  const screens = useBreakpoint();
  const { token } = theme.useToken();
  
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Determine device type based on breakpoints
  useEffect(() => {
    perfTimer.start();
    
    // Ant Design breakpoints: xs < 576, sm < 768, md < 992, lg < 1200, xl < 1600, xxl >= 1600
    const mobile = !screens.md; // Mobile if smaller than md (992px)
    setIsMobile(mobile);
    
    if (mobile && !collapsed) {
      setCollapsed(true); // Auto-collapse sidebar on mobile
    }
    
    logger.mount({
      breakpoints: screens,
      isMobile: mobile,
      collapsed,
    });
    
    perfTimer.end('componentRender');
    
    return () => logger.unmount();
  }, [screens]);

  const handleCollapse = (value: boolean) => {
    setCollapsed(value);
    logger.action('toggleSidebar', { collapsed: value });
  };

  // Mobile layout (single column)
  if (isMobile) {
    return (
      <Layout className={styles.mobileLayout}>
        <Layout.Header className={styles.mobileHeader} style={{ padding: 0 }}>
          <Header 
            onThemeChange={onThemeChange}
            isDarkMode={isDarkMode}
            showMenuButton={true}
            onMenuClick={() => logger.action('mobileMenuToggle')}
          />
        </Layout.Header>
        <Content className={styles.mobileContent}>
          <div className={styles.mobileContainer}>
            {children || (
              <>
                <div className={styles.placeholderCard}>KPI Summary</div>
                <div className={styles.placeholderCard}>Parameter Controls</div>
                <div className={styles.placeholderCard}>Main Chart</div>
                <div className={styles.placeholderCard}>Data Table</div>
              </>
            )}
          </div>
        </Content>
      </Layout>
    );
  }

  // Tablet and Desktop layout (responsive grid)
  return (
    <Layout className={styles.layout}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={handleCollapse}
        breakpoint="lg"
        collapsedWidth={screens.sm ? 80 : 0}
        trigger={screens.sm ? undefined : null}
        className={styles.sider}
      >
        <div className={styles.siderContent}>
          <div className={styles.logo}>
            {collapsed ? 'RMO' : 'RMO Dashboard'}
          </div>
          {/* Navigation items will go here */}
        </div>
      </Sider>
      
      <Layout>
        <Layout.Header className={styles.header} style={{ background: token.colorBgContainer, padding: 0 }}>
          <Header 
            onThemeChange={onThemeChange}
            isDarkMode={isDarkMode}
            showMenuButton={collapsed}
            onMenuClick={() => handleCollapse(!collapsed)}
          />
        </Layout.Header>
        
        <Content className={styles.content}>
          <div 
            className={styles.dashboardGrid}
          >
            {children || (
              <>
                {/* KPI Cards - full width on mobile, 3 cols on desktop */}
                <div className={styles.kpiSection}>
                  <div className={styles.placeholderCard}>Total Cost</div>
                  <div className={styles.placeholderCard}>Network Length</div>
                  <div className={styles.placeholderCard}>Condition Score</div>
                </div>
                
                {/* Controls - sidebar on desktop, full width on tablet */}
                <div className={styles.controlsSection}>
                  <div className={styles.placeholderCard}>Parameters</div>
                  <div className={styles.placeholderCard}>Filters</div>
                </div>
                
                {/* Main visualization area */}
                <div className={styles.mainSection}>
                  <div className={styles.placeholderCard}>Main Chart</div>
                  <div className={styles.placeholderCard}>Comparison Panel</div>
                </div>
                
                {/* Data table - full width */}
                <div className={styles.tableSection}>
                  <div className={styles.placeholderCard}>Data Table</div>
                </div>
              </>
            )}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};
