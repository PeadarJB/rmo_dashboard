// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import './index.css';

// Note: Amplify Storage configuration will be added in Phase 7
// when we implement S3 integration with Cognito credentials.
// For now, we're focusing on authentication flow only.

// If you need to initialize Amplify for future use, uncomment below:
/*
import { Amplify } from 'aws-amplify';

// AWS Amplify v6 configuration structure
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
      identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
      loginWith: {
        oauth: {
          domain: import.meta.env.VITE_COGNITO_DOMAIN?.replace('https://', '').replace('http://', ''),
          scopes: ['openid', 'email', 'profile'],
          redirectSignIn: [import.meta.env.VITE_COGNITO_REDIRECT_URI],
          redirectSignOut: [import.meta.env.VITE_COGNITO_LOGOUT_URI],
          responseType: 'code'
        }
      }
    }
  },
  // Storage configuration will be added in Phase 7
  // Storage: {
  //   S3: {
  //     bucket: import.meta.env.VITE_S3_BUCKET_NAME,
  //     region: import.meta.env.VITE_S3_BUCKET_REGION,
  //   }
  // }
});
*/

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);