import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App.tsx';
// Fixed: Use named import for lightTheme (or darkTheme if you prefer)
import { lightTheme } from './theme/appTheme';
import { ThemeTokenBridge } from './theme/ThemeTokenBridge.tsx';
// Fixed: Use named import for AWS_CONFIG
import { AWS_CONFIG } from './config/aws.config.ts';
import './index.css';

// Configure AWS Amplify
Amplify.configure({
  Storage: {
    // Using the correct key 'S3' for Amplify v6+
    S3: {
      bucket: AWS_CONFIG.storage.AWSS3.bucket,
      region: AWS_CONFIG.storage.AWSS3.region,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={lightTheme}>
        <ThemeTokenBridge />
        <App />
      </ConfigProvider> 
    </BrowserRouter>
  </React.StrictMode>,
);