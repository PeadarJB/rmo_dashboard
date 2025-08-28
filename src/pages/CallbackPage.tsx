// src/pages/CallbackPage.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { exchangeCodeForTokens } from '../services/authService';
import { saveTokens, AuthTokens } from '../utils/tokenManager';
import { LoadingScreen } from '../components/layout';
import { logger } from '../utils/logger';
import { useAnalyticsStore } from '../store/useAnalyticsStore';
import { jwtDecode } from 'jwt-decode';
import { message } from 'antd';

interface DecodedToken {
  exp: number;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  'cognito:username'?: string;
}

const CallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const login = useAnalyticsStore((state) => state.login);

  const exchangeAttempted = useRef(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (exchangeAttempted.current) {
        return;
      }
      exchangeAttempted.current = true;
      
      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const error = params.get('error');
      const errorDescription = params.get('error_description');

      // Handle OAuth2 error responses from Cognito
      if (error) {
        const errorMsg = errorDescription || error;
        logger.error('CallbackPage', `OAuth2 error from Cognito: ${errorMsg}`);
        setError(errorMsg);
        message.error(`Authentication failed: ${errorMsg}`);
        
        // Wait a moment before redirecting to show the error
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }

      if (!code) {
        logger.error('CallbackPage', 'No authorization code found in callback URL.');
        setError('No authorization code received');
        message.error('Authentication failed: No authorization code');
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
        return;
      }

      try {
        logger.info('CallbackPage', 'Authorization code found, attempting exchange.');
        
        // Exchange authorization code for tokens
        const tokens = await exchangeCodeForTokens(code);
        
        // Validate that we received all required tokens
        if (!tokens.id_token || !tokens.access_token) {
          throw new Error('Invalid token response: missing required tokens');
        }

        // Save tokens to sessionStorage
        const authTokens: AuthTokens = {
          id_token: tokens.id_token,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expires_in: tokens.expires_in || 3600,
          token_type: tokens.token_type || 'Bearer'
        };
        saveTokens(authTokens);
        logger.info('CallbackPage', 'Tokens saved successfully.');

        // Decode the ID token to get user information
        const decoded: DecodedToken = jwtDecode(tokens.id_token);
        const expiresAt = decoded.exp * 1000; // Convert to milliseconds

        // Extract user information
        const userEmail = decoded.email || decoded['cognito:username'] || 'User';
        const userName = decoded.name || 
                        (decoded.given_name && decoded.family_name 
                          ? `${decoded.given_name} ${decoded.family_name}`
                          : decoded.given_name || decoded.family_name || undefined);

        // Update the auth state in Zustand store
        login({
          profile: {
            email: userEmail,
            name: userName,
          },
          idToken: tokens.id_token,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || '',
          expiresAt,
        });
        
        logger.info('CallbackPage', 'Authentication state updated successfully.');
        message.success('Successfully logged in!');

        // Check if there's a return path (from protected route redirect)
        // First check sessionStorage (survives OAuth redirect), then location state
        const storedReturnPath = sessionStorage.getItem('auth_return_path');
        const returnTo = storedReturnPath || location.state?.from?.pathname || '/';
        
        // Clear the stored return path
        if (storedReturnPath) {
          sessionStorage.removeItem('auth_return_path');
        }
        
        // Navigate to the originally requested page or dashboard
        navigate(returnTo, { replace: true });
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        logger.error('CallbackPage', `Error during authentication: ${errorMessage}`);
        setError(errorMessage);
        message.error(`Authentication failed: ${errorMessage}`);

        // Clear any partial state
        useAnalyticsStore.getState().logout();
        
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      }
    };

    handleAuthCallback();
  }, [location, navigate, login]);

  // Show error state if there's an error
  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#ff4d4f', marginBottom: '16px' }}>Authentication Failed</h2>
        <p style={{ marginBottom: '24px', maxWidth: '400px' }}>{error}</p>
        <p style={{ color: '#8c8c8c' }}>Redirecting to login page...</p>
      </div>
    );
  }

  return <LoadingScreen />;
};

export default CallbackPage;