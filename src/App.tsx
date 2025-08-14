import './App.css';
import { Dashboard } from '@/components/layout/Dashboard';
import { DataLoaderTest } from './components/DataLoaderTest';
import { CalculationTest } from './components/CalculationTest';
import { Space, ConfigProvider, theme } from 'antd';
import { logger } from '@/utils/logger';
import { useEffect, useState } from 'react';

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
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <DataLoaderTest />
          <CalculationTest />
        </Space>
      </Dashboard>
    </ConfigProvider>
  );
}

export default App;