import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { exchangeCodeForTokens } from '../services/authService';
import { LoadingScreen } from '../components/layout';
import { logger } from '../utils/logger';

const CallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const params = new URLSearchParams(location.search);
      const code = params.get('code');

      if (code) {
        try {
          // Corrected logger call
          logger.info(
            'CallbackPage',
            'Authorization code found, attempting exchange.',
          );
          const tokens = await exchangeCodeForTokens(code);
          // In the next phase, we will store these tokens securely.
          logger.info('CallbackPage', 'Tokens received successfully.', tokens);

          navigate('/', { replace: true });
        } catch (error) {
          // Correctly handle unknown error type
          const errorMessage =
            error instanceof Error ? error.message : 'An unknown error occurred';
          logger.error('CallbackPage', `Error exchanging code for tokens: ${errorMessage}`);

          navigate('/login', { replace: true });
        }
      } else {
        // Corrected logger call
        logger.error(
          'CallbackPage',
          'No authorization code found in callback URL.',
        );
        navigate('/login', { replace: true });
      }
    };

    handleAuthCallback();
  }, [location, navigate]);

  return <LoadingScreen />;
};

export default CallbackPage;
