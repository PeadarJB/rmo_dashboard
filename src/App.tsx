import './App.css';
import { Dashboard } from '@/components/layout/Dashboard';
import { DataLoaderTest } from './components/DataLoaderTest';
import { CalculationTest } from './components/CalculationTest';
import { ConfigProvider, theme } from 'antd';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import styles from '@/components/layout/Dashboard.module.css';

// Import all the new components
import { KPISummary } from '@/components/common/KPISummary';
import { ParameterCostControls } from '@/components/controls/ParameterCostControls';
import { FilterBar } from '@/components/controls/FilterBar';
import { MaintenanceCategoryChart } from '@/components/charts/MaintenanceCategoryChart';
import { CategoryBreakdownChart } from '@/components/charts/CategoryBreakdownChart';
import type { MaintenanceCategory } from '@/types/calculations';


function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  // Add state for drill-down
  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);


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
        {/* KPI Summary - Full width at the top */}
        <div className={styles.kpiSection}>
          <KPISummary />
        </div>

        {/* Controls Section - Left sidebar */}
        <div className={styles.controlsSection}>
          <ParameterCostControls />
          <FilterBar />
        </div>

        {/* Main Visualization Section - Right side main area */}
        <div className={styles.mainSection}>
          {showDrillDown ? (
            <CategoryBreakdownChart
              category={selectedCategory || undefined}
              onBack={() => {
                setShowDrillDown(false);
                setSelectedCategory(null);
              }}
              onCountyClick={(county) => {
                logger.userAction('countyDrillDown', { county });
                console.log('County clicked:', county);
              }}
            />
          ) : (
            <MaintenanceCategoryChart 
              showComparison={true}
              onCategoryClick={(category) => {
                logger.userAction('categoryDrillDown', { category });
                setSelectedCategory(category);
                setShowDrillDown(true);
              }}
            />
          )}
          <CalculationTest />
        </div>

        {/* Table Section - Full width at bottom (for future use) */}
        <div className={styles.tableSection}>
          <DataLoaderTest />
        </div>
      </Dashboard>
    </ConfigProvider>
  );
}

export default App;