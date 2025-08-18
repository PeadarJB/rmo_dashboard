// src/theme/appTheme.ts
import { theme, type ThemeConfig } from 'antd';
const { defaultAlgorithm, darkAlgorithm } = theme;

export const lightTheme: ThemeConfig = {
  algorithm: defaultAlgorithm,
  token: {
    colorPrimary: '#1890ff', // primary brand color (blue)
    colorSuccess: '#52c41a', // success color (green)
    colorWarning: '#faad14', // warning color (amber)
    colorError: '#ff4d4f', // error color (red)
    borderRadius: 8, // global border radius
    // You can add more token overrides if needed (e.g. colorBgLayout)
  },
};

export const darkTheme: ThemeConfig = {
  algorithm: darkAlgorithm,
  token: {
    // Use the same brand colors for dark theme (the dark algorithm will adjust usage)
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#ff4d4f',
    borderRadius: 8,
  },
};