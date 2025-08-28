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
      if (exchangeAttempted.current) return;
      exchangeAttempted.current = true;

      const params = new URLSearchParams(location.search);
      const code = params.get('code');
      const state = params.get('state');
      const oauthError = params.get('error');
      const oauthErrorDescription = params.get('error_description');

      if (oauthError) {
        const errorMsg = oauthErrorDescription || oauthError;
        logger.error('CallbackPage', `OAuth2 error from Cognito: ${errorMsg}`);
        setError(errorMsg);
        message.error(`Authentication failed: ${errorMsg}`);
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      if (!code) {
        logger.error('CallbackPage', 'No authorization code found in callback URL.');
        setError('No authorization code received');
        message.error('Authentication failed: No authorization code');
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }

      // Validate state to mitigate CSRF
      const storedState = sessionStorage.getItem('oauth_state');
      if (!state || !storedState || state !== storedState) {
        logger.error('CallbackPage', 'State mismatch or missing.');
        setError('Invalid state parameter');
        message.error('Authentication failed: Invalid state');
        // hard reset any partial auth state
        useAnalyticsStore.getState().logout();
        setTimeout(() => navigate('/login', { replace: true }), 2000);
        return;
      }
      // Clear it once used
      sessionStorage.removeItem('oauth_state');

      try {
        logger.info('CallbackPage', 'Authorization code found, attempting exchange.');
        const tokens = await exchangeCodeForTokens(code);

        if (!tokens.id_token || !tokens.access_token) {
          throw new Error('Invalid token response: missing required tokens');
        }

        const authTokens: AuthTokens = {
          id_token: tokens.id_token,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || '',
          expires_in: tokens.expires_in || 3600,
          token_type: tokens.token_type || 'Bearer',
        };
        saveTokens(authTokens);
        logger.info('CallbackPage', 'Tokens saved successfully.');

        const decoded: DecodedToken = jwtDecode(tokens.id_token);
        const expiresAt = decoded.exp * 1000;

        const userEmail = decoded.email || decoded['cognito:username'] || 'User';
        const userName =
          decoded.name ||
          (decoded.given_name && decoded.family_name
            ? `${decoded.given_name} ${decoded.family_name}`
            : decoded.given_name || decoded.family_name || undefined);

        login({
          profile: { email: userEmail, name: userName },
          idToken: tokens.id_token,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || '',
          expiresAt,
        });

        logger.info('CallbackPage', 'Authentication state updated successfully.');
        message.success('Successfully logged in!');

        const storedReturnPath = sessionStorage.getItem('auth_return_path');
        const returnTo = storedReturnPath || (location.state as any)?.from?.pathname || '/';
        if (storedReturnPath) sessionStorage.removeItem('auth_return_path');

        navigate(returnTo, { replace: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'An unknown error occurred';
        logger.error('CallbackPage', `Error during authentication: ${msg}`);
        setError(msg);
        message.error(`Authentication failed: ${msg}`);

        useAnalyticsStore.getState().logout();
        setTimeout(() => navigate('/login', { replace: true }), 2000);
      }
    };

    handleAuthCallback();
  }, [location, navigate, login]);

  if (error) {
    return (
      <div
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '20px', textAlign: 'center'
        }}
      >
        <h2 style={{ color: '#ff4d4f', marginBottom: '16px' }}>Authentication Failed</h2>
        <p style={{ marginBottom: '24px', maxWidth: '400px' }}>{error}</p>
        <p style={{ color: '#8c8c8c' }}>Redirecting to login page...</p>
      </div>
    );
  }

  return <LoadingScreen />;
};

export default CallbackPage;
