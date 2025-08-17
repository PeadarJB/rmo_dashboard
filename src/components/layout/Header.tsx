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
  MenuUnfoldOutlined, // Correct icon for opening
  MenuFoldOutlined,   // Correct icon for closing
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useComponentLogger } from '@/utils/logger';
import { useAnalyticsStore } from '@/store/useAnalyticsStore';
import styles from './Header.module.css';

const { useBreakpoint } = Grid;

interface HeaderProps {
  onThemeChange?: (isDark: boolean) => void;
  isDarkMode?: boolean;
  onMenuClick?: () => void;
  isSiderVisible?: boolean; // New prop to control the icon
}

export const Header: React.FC<HeaderProps> = ({
  onThemeChange,
  isDarkMode = false,
  onMenuClick,
  isSiderVisible = false,
}) => {
  const logger = useComponentLogger('Header');
  const screens = useBreakpoint();
  const [notificationDrawer, setNotificationDrawer] = useState(false);

  const setAuthenticated = useAnalyticsStore((state) => state.setAuthenticated);
  const isCalculating = useAnalyticsStore(state => state.ui.isLoading);
  const hasData = useAnalyticsStore(state => !!state.data.fullDataset);
  const lastCalculation = useAnalyticsStore(state => state.cache.results.timestamp);

  const isMobile = !screens.md;

  const handleThemeToggle = (checked: boolean) => {
    onThemeChange?.(checked);
    logger.action('themeToggle', { isDark: checked });
  };

  const handleLogout = () => {
    logger.action('menuClick', { item: 'logout' });
    setAuthenticated(false);
  };
  
  // ... (userMenuItems and actionMenuItems remain the same)
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => logger.action('menuClick', { item: 'profile' }),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Settings',
      onClick: () => logger.action('menuClick', { item: 'settings' }),
    },
    {
      type: 'divider',
    },
    {
      key: 'help',
      icon: <QuestionCircleOutlined />,
      label: 'Help & Documentation',
      onClick: () => logger.action('menuClick', { item: 'help' }),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      danger: true,
      onClick: handleLogout,
    },
  ];

  const actionMenuItems: MenuProps['items'] = [
    {
      key: 'export',
      icon: <DownloadOutlined />,
      label: 'Export Results',
      disabled: !lastCalculation,
      onClick: () => logger.action('export', { timestamp: lastCalculation }),
    },
    {
      key: 'refresh',
      icon: <SyncOutlined spin={isCalculating} />,
      label: isCalculating ? 'Calculating...' : 'Refresh Data',
      disabled: !hasData || isCalculating,
      onClick: () => logger.action('refresh', { hasData }),
    },
  ];


  // Mobile header content
  if (isMobile) {
    // Mobile implementation will be in the next step
    return (
      <div className={styles.mobileHeader}>
        {/* ... existing mobile header code ... */}
      </div>
    );
  }

  // Desktop header content
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        {/* New Sider Toggle Button */}
        <Tooltip title={isSiderVisible ? 'Hide Controls' : 'Show Controls'}>
          <Button
            type="text"
            icon={isSiderVisible ? <MenuFoldOutlined /> : <MenuUnfoldOutlined />}
            onClick={onMenuClick}
          />
        </Tooltip>
        <h1 className={styles.title}>Regional Road Analytics Dashboard</h1>
        {lastCalculation && (
          <span className={styles.lastUpdate}>
            Last updated: {new Date(lastCalculation).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className={styles.headerRight}>
        <Space size="middle">
          <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
            <Button type="text" icon={<SettingOutlined />}>
              Actions
            </Button>
          </Dropdown>

          <div className={styles.themeToggle}>
            <SunOutlined style={{ marginRight: 8 }} />
            <Switch
              checked={isDarkMode}
              onChange={handleThemeToggle}
              size="small"
            />
            <MoonOutlined style={{ marginLeft: 8 }} />
          </div>

          <Tooltip title="Notifications">
            <Badge count={3}>
              <Button
                type="text"
                shape="circle"
                icon={<BellOutlined />}
                onClick={() => {
                  setNotificationDrawer(true);
                  logger.action('openNotifications');
                }}
              />
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

      <Drawer
        title="Notifications"
        placement="right"
        onClose={() => setNotificationDrawer(false)}
        open={notificationDrawer}
      >
        {/* ... existing drawer content ... */}
      </Drawer>
    </div>
  );
};