import './App.css';
import { Dashboard } from '@/components/layout/Dashboard';
import { DataLoaderTest } from './components/DataLoaderTest';
import { CalculationTest } from './components/CalculationTest';
import { ConfigProvider, theme } from 'antd';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';
import { KPISummary } from '@/components/common/KPISummary';
import { ParameterCostControls } from '@/components/controls/ParameterCostControls';
import { FilterBar } from '@/components/controls/FilterBar';

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
  }, []);

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
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(12, 1fr)',
          gap: '16px',
          padding: '24px'
        }}>
          <div style={{ gridColumn: 'span 12' }}>
            <KPISummary />
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <ParameterCostControls />
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <FilterBar />
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <DataLoaderTest />
          </div>
          <div style={{ gridColumn: 'span 3' }}>
            <CalculationTest />
          </div>
        </div>
      </Dashboard>
    </ConfigProvider>
  );
}

export default App;