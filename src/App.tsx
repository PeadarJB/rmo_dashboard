import './App.css';
import { Dashboard } from '@/components/layout/Dashboard';
import { ConfigProvider, theme } from 'antd';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import styles from '@/components/layout/Dashboard.module.css';

import { KPISummary } from '@/components/common/KPISummary';
// ParameterCostControls and FilterBar are no longer directly used here
import { MaintenanceCategoryChart } from '@/components/charts/MaintenanceCategoryChart';
import { CategoryBreakdownChart } from '@/components/charts/CategoryBreakdownChart';
import type { MaintenanceCategory } from '@/types/calculations';
import { AuthWrapper } from './components/auth';

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

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
      <AuthWrapper>
        <Dashboard onThemeChange={handleThemeChange} isDarkMode={isDarkMode}>
          {/* The controls section is now gone from this grid */}
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