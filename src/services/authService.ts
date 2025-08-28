/**
 * @fileoverview Service for handling OAuth2/OIDC authentication with AWS Cognito (Hosted UI + PKCE).
 */

import { logger } from '../utils/logger';

/* ------------------------------ Helpers ------------------------------ */

const getEnvVar = (key: string): string => {
  const value = import.meta.env[key] as string | undefined;
  if (!value) {
    const msg = `Missing environment variable: ${key}`;
    logger.error('authService', msg);
    throw new Error(msg);
  }
  return value;
};

// Ensure domain includes https:// and no trailing slash
const normalizeBaseUrl = (domain: string) => {
  const d = domain.trim().replace(/\/+$/, '');
  return d.startsWith('http://') || d.startsWith('https://') ? d : `https://${d}`;
};

// Normalize scopes: remove surrounding quotes and collapse whitespace
const normalizeScope = (s: string) => s.replace(/^"+|"+$/g, '').replace(/\s+/g, ' ').trim();

const randomString = (len: number) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const arr = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  arr.forEach(v => (out += charset[v % charset.length]));
  return out;
};

const base64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256 = async (text: string) => {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return base64url(hash);
};

/* --------------------------- Configuration --------------------------- */

const cognitoConfig = {
  baseUrl: normalizeBaseUrl(getEnvVar('VITE_COGNITO_DOMAIN')), // e.g. https://xxx.auth.eu-north-1.amazoncognito.com
  clientId: getEnvVar('VITE_USER_POOL_CLIENT_ID'),
  redirectUri: getEnvVar('VITE_COGNITO_REDIRECT_URI'),
  logoutUri: getEnvVar('VITE_COGNITO_LOGOUT_URI'),
  responseType: getEnvVar('VITE_COGNITO_RESPONSE_TYPE') || 'code',
  scope: normalizeScope(getEnvVar('VITE_COGNITO_SCOPE') || 'openid email profile'),
};

/* ------------------------------ Sign-in ------------------------------ */
/**
 * Initiates Hosted UI login using Authorization Code + PKCE.
 * Idempotent: reuses existing pkce_verifier/state if already set.
 */
export const redirectToHostedUI = async () => {
  logger.info('authService', 'Redirecting to Cognito Hosted UI for sign-in...');

  // Reuse if a previous initiation already set these (prevents state mismatches)
  let codeVerifier = sessionStorage.getItem('pkce_verifier');
  let state = sessionStorage.getItem('oauth_state');

  if (!codeVerifier) {
    codeVerifier = randomString(64);
    sessionStorage.setItem('pkce_verifier', codeVerifier);
  }
  if (!state) {
    state = randomString(16);
    sessionStorage.setItem('oauth_state', state);
  }

  const codeChallenge = await sha256(codeVerifier);
  sessionStorage.setItem('oauth_redirect_in_progress', '1');

  // Use the /oauth2/authorize endpoint (not /login) for code+PKCE
  const authorize = new URL(`${cognitoConfig.baseUrl}/oauth2/authorize`);
  authorize.search = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    redirect_uri: cognitoConfig.redirectUri,
    response_type: 'code',
    scope: cognitoConfig.scope,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    state: state,
  }).toString();

  window.location.assign(authorize.toString());
};

/* --------------------------- Code Exchange --------------------------- */

export interface TokenResponse {
  id_token: string;
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
}

export const exchangeCodeForTokens = async (code: string): Promise<TokenResponse> => {
  logger.info('authService', 'Exchanging authorization code for tokens...');
  const tokenUrl = `${cognitoConfig.baseUrl}/oauth2/token`;

  const codeVerifier = sessionStorage.getItem('pkce_verifier');
  if (!codeVerifier) {
    const msg = 'Missing PKCE verifier. Please try signing in again.';
    logger.error('authService', msg);
    throw new Error(msg);
  }
  // one-time use
  sessionStorage.removeItem('pkce_verifier');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: cognitoConfig.clientId,
    code,
    code_verifier: codeVerifier,
    redirect_uri: cognitoConfig.redirectUri,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    // try to read more detail
    let detail = '';
    try { detail = await res.text(); } catch {}
    logger.error('authService', `Failed to exchange code: ${res.status} ${detail}`);
    throw new Error('Token exchange failed');
  }

  const tokens = (await res.json()) as TokenResponse;
  logger.info('authService', 'Successfully received tokens.');
  // clear the in-progress flag now that we completed
  sessionStorage.removeItem('oauth_redirect_in_progress');
  return tokens;
};

/* ------------------------------ Sign-out ----------------------------- */

export const signOut = () => {
  logger.info('authService', 'Redirecting to Cognito Hosted UI for sign-out...');
  const url = new URL(`${cognitoConfig.baseUrl}/logout`);
  url.search = new URLSearchParams({
    client_id: cognitoConfig.clientId,
    logout_uri: cognitoConfig.logoutUri,
  }).toString();
  window.location.assign(url.toString());
};
