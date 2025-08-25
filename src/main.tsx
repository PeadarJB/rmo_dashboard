// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { Amplify } from 'aws-amplify';
import { AWS_CONFIG, validateAWSConfig } from './config/aws.config';

// Validate configuration in development
if (import.meta.env.DEV) {
  const validation = validateAWSConfig();
  if (!validation.valid) {
    console.error('❌ AWS Configuration Errors:', validation.errors);
  } else {
    console.log('✅ AWS Configuration Valid');
  }
}

// Configure AWS Amplify
const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: AWS_CONFIG.auth.userPoolId,
      userPoolClientId: AWS_CONFIG.auth.userPoolClientId,
      identityPoolId: AWS_CONFIG.auth.identityPoolId,
      loginWith: {
        email: true,
        username: true,
      },
      signUpVerificationMethod: 'code' as const,
      userAttributes: {
        email: {
          required: true,
        },
      },
      passwordFormat: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireNumbers: true,
        requireSpecialCharacters: true,
      },
    },
  },
  Storage: {
    S3: {
      bucket: AWS_CONFIG.storage.AWSS3.bucket,
      region: AWS_CONFIG.storage.AWSS3.region,
      accessLevel: 'guest',
    },
  },
};

Amplify.configure(awsconfig);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);