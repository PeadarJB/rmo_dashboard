import React from 'react';
import ReactDOM from 'react-dom/client';
import { Amplify } from 'aws-amplify';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import App from './App.tsx';
import { appTheme } from './theme/appTheme'; // Corrected import path
import { ThemeTokenBridge } from './theme/ThemeTokenBridge.tsx';
import { awsExports } from './config/aws.config.ts'; // Corrected named import
import './index.css';

// Configure AWS Amplify
Amplify.configure({
  Storage: {
    // Corrected configuration key from AWSS3 to S3
    S3: {
      bucket: awsExports.aws_s3_bucket_name,
      region: awsExports.aws_s3_bucket_region,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={appTheme}>
        <ThemeTokenBridge />
        <App />
      </Config-Provider>
    </BrowserRouter>
  </React.StrictMode>,
);
