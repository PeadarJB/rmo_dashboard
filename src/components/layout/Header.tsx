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
} from 'antd';
import {
  UserOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  MenuOutlined,
  SunOutlined,
  MoonOutlined,
  QuestionCircleOutlined,
  DownloadOutlined,
  SyncOutlined,
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
  showMenuButton?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onThemeChange,
  isDarkMode = false,
  onMenuClick,
  showMenuButton = false,
}) => {
  const logger = useComponentLogger('Header');
  const screens = useBreakpoint();
  const [notificationDrawer, setNotificationDrawer] = useState(false);
  
  // Get calculation state from store
  const isCalculating = useAnalyticsStore(state => state.ui.isLoading);
  const hasData = useAnalyticsStore(state => !!state.data.fullDataset);
  const lastCalculation = useAnalyticsStore(state => state.cache.results.timestamp);

  const isMobile = !screens.md;

  const handleThemeToggle = (checked: boolean) => {
    onThemeChange?.(checked);
    logger.action('themeToggle', { isDark: checked });
  };

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
      onClick: () => logger.action('menuClick', { item: 'logout' }),
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
    return (
      <div className={styles.mobileHeader}>
        <div className={styles.mobileLeft}>
          {showMenuButton && (
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={onMenuClick}
              className={styles.menuButton}
            />
          )}
          <span className={styles.mobileTitle}>RMO Analytics</span>
        </div>
        
        <Space size="small">
          <Switch
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
            checked={isDarkMode}
            onChange={handleThemeToggle}
          />
          
          <Badge count={3} size="small">
            <Button
              type="text"
              icon={<BellOutlined />}
              onClick={() => {
                setNotificationDrawer(true);
                logger.action('openNotifications');
              }}
            />
          </Badge>
          
          <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
            <Avatar
              size="small"
              icon={<UserOutlined />}
              className={styles.avatar}
              style={{ cursor: 'pointer' }}
            />
          </Dropdown>
        </Space>

        <Drawer
          title="Notifications"
          placement="right"
          onClose={() => setNotificationDrawer(false)}
          open={notificationDrawer}
          width={280}
        >
          <div className={styles.notificationList}>
            <p>Calculation completed</p>
            <p>New data available</p>
            <p>Report exported successfully</p>
          </div>
        </Drawer>
      </div>
    );
  }

  // Desktop header content
  return (
    <div className={styles.header}>
      <div className={styles.headerLeft}>
        <h1 className={styles.title}>Regional Road Analytics Dashboard</h1>
        {lastCalculation && (
          <span className={styles.lastUpdate}>
            Last updated: {new Date(lastCalculation).toLocaleTimeString()}
          </span>
        )}
      </div>

      <div className={styles.headerRight}>
        <Space size="middle">
          {/* Action buttons */}
          <Dropdown menu={{ items: actionMenuItems }} trigger={['click']}>
            <Button type="text" icon={<SettingOutlined />}>
              Actions
            </Button>
          </Dropdown>

          {/* Theme toggle */}
          <div className={styles.themeToggle}>
            <SunOutlined style={{ marginRight: 8 }} />
            <Switch
              checked={isDarkMode}
              onChange={handleThemeToggle}
              size="small"
            />
            <MoonOutlined style={{ marginLeft: 8 }} />
          </div>

          {/* Notifications */}
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

          {/* User menu */}
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
        <div className={styles.notificationList}>
          <div className={styles.notification}>
            <h4>Calculation Completed</h4>
            <p>Your analysis finished processing 131,871 segments</p>
            <small>2 minutes ago</small>
          </div>
          <div className={styles.notification}>
            <h4>New Data Available</h4>
            <p>2025 survey data has been uploaded</p>
            <small>1 hour ago</small>
          </div>
          <div className={styles.notification}>
            <h4>Export Successful</h4>
            <p>Report exported to PDF format</p>
            <small>3 hours ago</small>
          </div>
        </div>
      </Drawer>
    </div>
  );
};