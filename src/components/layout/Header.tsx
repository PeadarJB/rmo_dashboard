// src/components/layout/Header.tsx
import React, { useState } from 'react';
import {
  Avatar,
  Badge,
  Button,
  Dropdown,
  Space,
  Switch,
  Tooltip,
  Grid,
  Drawer,
  message,
} from 'antd';
import {
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  SyncOutlined,
  MenuUnfoldOutlined,
  MenuFoldOutlined,
  MoreOutlined,
  FilterOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '@/contexts/AuthContext';
import { useComponentLogger } from '@/utils/logger';
import { useAnalyticsStore, selectors } from '@/store/useAnalyticsStore';
import { useScrollDirection, useExport } from '@/hooks';
import styles from './Header.module.css';

const { useBreakpoint } = Grid;

interface HeaderProps {
  onThemeChange?: (isDark: boolean) => void;
  isDarkMode?: boolean;
  onMenuClick?: () => void;
  isSiderVisible?: boolean;
  onFilterClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onThemeChange,
  isDarkMode = false,
  onMenuClick,
  isSiderVisible = false,
  onFilterClick,
}) => {
  const logger = useComponentLogger('Header');
  const { logout } = useAuth();
  const screens = useBreakpoint();
  const [notificationDrawer, setNotificationDrawer] = useState(false);
  const scrollDir = useScrollDirection();

  // --- Store and Hook Selectors ---
  const isCalculating = useAnalyticsStore((state) => state.ui.isLoading);
  const hasData = useAnalyticsStore((state) => !!state.data.fullDataset);
  const lastCalculation = useAnalyticsStore((state) => state.cache.results.timestamp);
  const activeChartFilterCount = useAnalyticsStore((state) => selectors.activeChartFilterCount(state));
  const { quickExportPDF, quickExportCSV, canExport, isExporting } = useExport();

  const isMobile = !screens.md;

  // --- Handlers ---
  const handleThemeToggle = (checked: boolean) => {
    onThemeChange?.(checked);
    logger.action('themeToggle', { isDark: checked });
  };

  const handleLogout = async () => {
    logger.action('menuClick', { item: 'logout' });
    await logout(); // Call the logout function from the context
  };

  const handleExportPDF = async () => {
    logger.action('headerExportPDF');
    const result = await quickExportPDF();
    if (result?.success) {
      message.success(`Successfully generated ${result.fileName}`);
    }
  };

  const handleExportCSV = async () => {
    logger.action('headerExportCSV');
    const result = await quickExportCSV();
    if (result?.success) {
      message.success(`Successfully generated ${result.fileName}`);
    }
  };

  // --- Menu Definitions ---
  const userMenuItems: MenuProps['items'] = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile' },
    { key: 'settings', icon: <SettingOutlined />, label: 'Settings' },
    { type: 'divider' },
    { key: 'help', icon: <QuestionCircleOutlined />, label: 'Help & Documentation' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: handleLogout },
  ];

  const exportMenuItems: MenuProps['items'] = [
    {
      key: 'pdf',
      icon: <FilePdfOutlined />,
      label: 'Export Report (PDF)',
      onClick: handleExportPDF,
    },
    {
      key: 'csv',
      icon: <FileExcelOutlined />,
      label: 'Export Data (CSV)',
      onClick: handleExportCSV,
    },
  ];

  const actionMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export Results',
      disabled: !canExport || isExporting,
      children: exportMenuItems,
    },
    {
      key: 'refresh',
      icon: <SyncOutlined spin={isCalculating} />,
      label: isCalculating ? 'Calculating...' : 'Refresh Data',
      disabled: !hasData || isCalculating,
    },
  ];

  // --- Render Logic ---
  if (isMobile) {
    const mobileMenuItems: MenuProps['items'] = [
      ...actionMenuItems,
      {
        key: 'filters',
        label: 'Filters',
        icon: (
          <Badge count={activeChartFilterCount} size="small">
            <FilterOutlined />
          </Badge>
        ),
        onClick: onFilterClick,
      },
      { type: 'divider' },
      { key: 'theme', label: isDarkMode ? 'Light theme' : 'Dark theme', icon: isDarkMode ? <SunOutlined /> : <MoonOutlined />, onClick: () => onThemeChange?.(!isDarkMode) },
      { key: 'notifications', label: 'Notifications', icon: <BellOutlined />, onClick: () => setNotificationDrawer(true) },
      { type: 'divider' },
      { key: 'logout', danger: true, label: 'Logout', icon: <LogoutOutlined />, onClick: handleLogout },
    ];

    return (
      <>
        <div className={`${styles.mobileHeader} ${scrollDir === 'down' ? styles.hidden : ''}`}>
          <Button
            type="text"
            aria-label={isSiderVisible ? 'Hide Controls' : 'Show Controls'}
            icon={isSiderVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={onMenuClick}
          />
          <div className={styles.mobileTitle} title="Regional Road Analytics Dashboard">
            RMO Dashboard
          </div>
          <Dropdown menu={{ items: mobileMenuItems }} trigger={['click']}>
            <Button type="text" aria-label="More options"><MoreOutlined /></Button>
          </Dropdown>
        </div>
        <Drawer title="Notifications" placement="right" onClose={() => setNotificationDrawer(false)} open={notificationDrawer} />
      </>
    );
  }

  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <Tooltip title={isSiderVisible ? 'Hide Controls' : 'Show Controls'}>
          <Button type="text" icon={isSiderVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />} onClick={onMenuClick} />
        </Tooltip>
        <img src="/img/RMO_Logo.png" alt="RMO Logo" className={styles.logo} />
        <h1 className={styles.title}>RMO Regional Road Survey</h1>
        {lastCalculation && <span className={styles.lastUpdate}>Last updated: {new Date(lastCalculation).toLocaleTimeString()}</span>}
      </div>
      <div className={styles.headerRight}>
        <Space size="middle">
          <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
            <Button type="text" icon={<SettingOutlined />}>Actions</Button>
          </Dropdown>
          <div className={styles.themeToggle}>
            <SunOutlined style={{ marginRight: 8 }} />
            <Switch checked={isDarkMode} onChange={handleThemeToggle} size="small" />
            <MoonOutlined style={{ marginLeft: 8 }} />
          </div>
          <Tooltip title="Notifications">
            <Badge count={3}>
              <Button type="text" shape="circle" icon={<BellOutlined />} onClick={() => setNotificationDrawer(true)} />
            </Badge>
          </Tooltip>
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              <span className={styles.userName}>Admin User</span>
            </Space>
          </Dropdown>
        </Space>
      </div>
      <Drawer title="Notifications" placement="right" onClose={() => setNotificationDrawer(false)} open={notificationDrawer} />
    </div>
  );
};