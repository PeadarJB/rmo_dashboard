// src/App.tsx
import './App.css';
import { Dashboard } from '@/components/layout/Dashboard';
import { ConfigProvider } from 'antd';
import { logger } from '@/utils/logger';
import { useState, useEffect } from 'react';
import styles from '@/components/layout/Dashboard.module.css';

import { KPISummary } from '@/components/common/KPISummary';
import { MaintenanceCategoryChart } from '@/components/charts/MaintenanceCategoryChart';
import { CategoryBreakdownChart } from '@/components/charts/CategoryBreakdownChart';
import type { MaintenanceCategory } from '@/types/calculations';
import { AuthWrapper } from './components/auth';
import { lightTheme, darkTheme } from './theme';
import { ThemeTokenBridge } from './theme/ThemeTokenBridge';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
  
  // State for both siders is now managed here
  const [controlsSiderVisible, setControlsSiderVisible] = useState(false);
  const [filterSiderVisible, setFilterSiderVisible] = useState(false);

  const toggleControlsSider = () => setControlsSiderVisible(!controlsSiderVisible);
  const toggleFilterSider = () => setFilterSiderVisible(!filterSiderVisible);

  useEffect(() => {
    logger.info('App', 'RMO Dashboard initialized', {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      theme: isDarkMode ? 'dark' : 'light',
    });
  }, [isDarkMode]);

  const handleThemeChange = (dark: boolean) => {
    setIsDarkMode(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  };

  return (
    <ConfigProvider
      theme={{
        ...(isDarkMode ? darkTheme : lightTheme),
        cssVar: true,
        hashed: false,
      }}
    >
      <ThemeTokenBridge />
      <AuthWrapper>
        <Dashboard
          onThemeChange={handleThemeChange}
          isDarkMode={isDarkMode}
          isControlsSiderVisible={controlsSiderVisible}
          onToggleControlsSider={toggleControlsSider}
          isFilterSiderVisible={filterSiderVisible}
          onToggleFilterSider={toggleFilterSider}
        >
          <div className={styles.kpiSection}>
            <KPISummary />
          </div>

          <div className={styles.mainChartSection}>
            {showDrillDown ? (
              <CategoryBreakdownChart
                category={selectedCategory || undefined}
                onBack={() => {
                  setShowDrillDown(false);
                  setSelectedCategory(null);
                }}
                onCountyClick={(county) => {
                  logger.userAction('countyDrillDown', { county });
                }}
              />
            ) : (
              <MaintenanceCategoryChart
                onCategoryClick={(category) => {
                  setSelectedCategory(category);
                  setShowDrillDown(true);
                }}
                onOpenFilters={toggleFilterSider} // Pass the handler to the chart
              />
            )}
          </div>

          <div className={styles.tableSection}>
            {/* Ready for the data table */}
          </div>
        </Dashboard>
      </AuthWrapper>
    </ConfigProvider>
  );
}

export default App;
