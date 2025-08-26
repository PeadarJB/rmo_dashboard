/**
 * @fileoverview Manages the storage and retrieval of authentication tokens.
 * Tokens are stored in sessionStorage to ensure they are cleared when the browser tab is closed.
 */

import { logger } from './logger';

const TOKEN_STORAGE_KEY = 'rmo_dashboard_auth_tokens';

export interface AuthTokens {
  id_token: string;
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

/**
 * Saves the authentication tokens to sessionStorage.
 * @param {AuthTokens} tokens - The token object received from Cognito.
 */
export const saveTokens = (tokens: AuthTokens): void => {
  try {
    const tokenData = JSON.stringify(tokens);
    sessionStorage.setItem(TOKEN_STORAGE_KEY, tokenData);
    logger.info('tokenManager', 'Tokens saved successfully.');
  } catch (error) {
    logger.error('tokenManager', 'Failed to save tokens to sessionStorage.', { error });
  }
};

/**
 * Retrieves the authentication tokens from sessionStorage.
 * @returns {AuthTokens | null} The stored tokens, or null if not found or invalid.
 */
export const getTokens = (): AuthTokens | null => {
  try {
    const tokenData = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    if (!tokenData) {
      return null;
    }
    const tokens: AuthTokens = JSON.parse(tokenData);
    return tokens;
  } catch (error) {
    logger.error('tokenManager', 'Failed to retrieve tokens from sessionStorage.', { error });
    return null;
  }
};

/**
 * Clears the authentication tokens from sessionStorage.
 */
export const clearTokens = (): void => {
  try {
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    logger.info('tokenManager', 'Tokens cleared successfully.');
  } catch (error) {
    logger.error('tokenManager', 'Failed to clear tokens from sessionStorage.', { error });
  }
};
