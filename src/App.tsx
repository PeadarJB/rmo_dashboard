import './App.css';
import { Dashboard } from '@/components/layout/Dashboard';
import { DataLoaderTest } from './components/DataLoaderTest';
import { CalculationTest } from './components/CalculationTest';
import { ConfigProvider, theme } from 'antd';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import styles from '@/components/layout/Dashboard.module.css';
// Import your new control components
import {
  ParameterCostControls,
  FilterBar,
} from './components/controls';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  useEffect(() => {
    logger.info('App', 'RMO Dashboard initialized', {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      userAgent: navigator.userAgent,
      theme: isDarkMode ? 'dark' : 'light',
    });
  }, [isDarkMode]);

  const handleThemeChange = (dark: boolean) => {
    setIsDarkMode(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    logger.userAction('themeToggle', { theme: dark ? 'dark' : 'light' });
  };

  return (
    <ConfigProvider
      theme={{
        algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 8,
        },
      }}
    >
      <Dashboard onThemeChange={handleThemeChange} isDarkMode={isDarkMode}>
        {/* Section for future KPI cards. Full width at the top. */}
        <div className={styles.kpiSection}>
          <div className={styles.placeholderCard}>
            KPI Summary Area (For components from Day 2.4)
          </div>
        </div>

        {/* A dedicated column for all user controls. */}
        <div className={styles.controlsSection}>
          <DataLoaderTest />
          <FilterBar />
          <ParameterCostControls />
        </div>

        {/* The main content area for results and visualizations. */}
        <div className={styles.mainSection}>
          <CalculationTest />
          {/* A placeholder for where a map or another chart could go. */}
          <div className={styles.placeholderCard}>Future Chart/Map Panel</div>
        </div>
      </Dashboard>
    </ConfigProvider>
  );
}

export default App;