// src/theme/ThemeTokenBridge.tsx
import { theme } from 'antd';
import { useLayoutEffect } from 'react';

export const ThemeTokenBridge: React.FC = () => {
  const { token } = theme.useToken(); // get current theme tokens from context

  useLayoutEffect(() => {
    // Set each token as a CSS variable on :root (skip private tokens starting with "_")
    Object.entries(token).forEach(([name, value]) => {
      if (name.startsWith('_')) return;
      const varName = `--ant-${name.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      
      // Use value directly, adding "px" for numeric tokens except those that should be unitless
      let cssValue: string | number = value;
      if (typeof value === 'number') {
        const lowerCaseName = name.toLowerCase();
        const needsUnit = !lowerCaseName.includes('lineheight') &&
                          !lowerCaseName.includes('opacity') &&
                          !lowerCaseName.includes('zindex') &&
                          !lowerCaseName.includes('weight'); // Font weight is also unitless
                          
        cssValue = needsUnit ? `${value}px` : value;
      }
      document.documentElement.style.setProperty(varName, String(cssValue));
    });
  }, [token]);

  return null; // This component only has side-effects, no UI
};