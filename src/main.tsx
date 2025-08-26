// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App'; // CORRECTED: Use default import for App
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

import { Amplify } from 'aws-amplify';

// CORRECTED: Updated Amplify Storage configuration for v6
Amplify.configure({
  Storage: {
    bucket: import.meta.env.VITE_S3_BUCKET,
    region: import.meta.env.VITE_AWS_REGION,
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);