import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { logger } from './utils/logger';
import { AuthWrapper } from './components/auth';
import { Dashboard } from './components/layout';
import LoginPage from './pages/LoginPage';
import CallbackPage from './pages/CallbackPage';
import { KPISummary } from './components/common/KPISummary';
import { MaintenanceCategoryChart } from './components/charts/MaintenanceCategoryChart';
import { CategoryBreakdownChart } from './components/charts/CategoryBreakdownChart';
import type { MaintenanceCategory } from './types/calculations';
import { lightTheme, darkTheme } from './theme/appTheme'; // Adjusted path
import { ThemeTokenBridge } from './theme/ThemeTokenBridge';
import styles from './components/layout/Dashboard.module.css';
import './App.css';

// This new component contains your original App's UI logic
const MainDashboard = () => {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [selectedCategory, setSelectedCategory] = useState<MaintenanceCategory | null>(null);
  const [showDrillDown, setShowDrillDown] = useState(false);
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
                logger.info('userAction', 'countyDrillDown', { county });
              }}
            />
          ) : (
            <MaintenanceCategoryChart
              onCategoryClick={(category) => {
                setSelectedCategory(category);
                setShowDrillDown(true);
              }}
              onOpenFilters={toggleFilterSider}
            />
          )}
        </div>
        <div className={styles.tableSection}>{/* Ready for the data table */}</div>
      </Dashboard>
    </ConfigProvider>
  );
};

// The main App component now handles routing
function App() {
  return (
    <Routes>
      {/* Publicly accessible routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/callback" element={<CallbackPage />} />

      {/* Protected routes now render the MainDashboard */}
      <Route
        path="/*"
        element={
          <AuthWrapper>
            <MainDashboard />
          </AuthWrapper>
        }
      />
    </Routes>
  );
}

export default App;
