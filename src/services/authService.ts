/**
 * @fileoverview Service for handling OAuth2/OIDC authentication with AWS Cognito.
 */

import { logger } from '../utils/logger';

// Helper to get environment variables safely
const getEnvVar = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    const errorMessage = `Missing environment variable: ${key}`;
    // Corrected logger call
    logger.error('authService', errorMessage);
    throw new Error(errorMessage);
  }
  return value;
};

// Configuration object for Cognito endpoints and client details
const cognitoConfig = {
  domain: getEnvVar('VITE_COGNITO_DOMAIN'),
  clientId: getEnvVar('VITE_USER_POOL_CLIENT_ID'),
  redirectUri: getEnvVar('VITE_COGNITO_REDIRECT_URI'),
  logoutUri: getEnvVar('VITE_COGNITO_LOGOUT_URI'),
  responseType: getEnvVar('VITE_COGNITO_RESPONSE_TYPE'),
  scope: getEnvVar('VITE_COGNITO_SCOPE'),
};

/**
 * Initiates the sign-in process by redirecting the user to the Cognito Hosted UI.
 */
export const redirectToHostedUI = async () => {
  // Corrected logger call
  logger.info('authService', 'Redirecting to Cognito Hosted UI for sign-in...');
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    response_type: cognitoConfig.responseType,
    scope: cognitoConfig.scope,
    redirect_uri: cognitoConfig.redirectUri,
  });

  const loginUrl = `${cognitoConfig.domain}/login?${params.toString()}`;
  window.location.assign(loginUrl);
};

/**
 * Exchanges an authorization code for tokens.
 * @param {string} code - The authorization code received from Cognito.
 * @returns {Promise<object>} A promise that resolves with the token data.
 */
export const exchangeCodeForTokens = async (code: string) => {
  // Corrected logger call
  logger.info('authService', 'Exchanging authorization code for tokens...');
  const tokenUrl = `${cognitoConfig.domain}/oauth2/token`;

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cognitoConfig.clientId,
    code: code,
    redirect_uri: cognitoConfig.redirectUri,
  });

  try {
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!response.ok) {
      const errorData = await response.json();
      logger.error(
        'authService',
        'Failed to exchange code for tokens:',
        errorData,
      );
      throw new Error('Could not exchange authorization code for tokens.');
    }

    const tokens = await response.json();
    logger.info('authService', 'Successfully received tokens.');
    return tokens;
  } catch (error) {
    // Correctly handle unknown error type
    const errorMessage =
      error instanceof Error ? error.message : 'An unknown error occurred';
    logger.error(
      'authService',
      `Error during token exchange: ${errorMessage}`,
    );
    throw error;
  }
};

/**
 * Redirects the user to the Cognito Hosted UI logout endpoint.
 */
export const signOut = () => {
  // Corrected logger call
  logger.info('authService', 'Redirecting to Cognito Hosted UI for sign-out...');
  const params = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.logoutUri,
  });

  const logoutUrl = `${cognitoConfig.domain}/logout?${params.toString()}`;
  window.location.assign(logoutUrl);
};
