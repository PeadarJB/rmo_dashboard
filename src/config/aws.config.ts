// src/config/aws.config.ts

/**
 * Centralized AWS configuration.
 * This file consolidates all AWS service configurations and provides validation.
 */
export const AWS_CONFIG = {
  // Authentication settings from environment variables
  auth: {
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolWebClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID, // Use the consistent name
    identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
    
    // Add the missing Hosted UI settings
    domain: import.meta.env.VITE_COGNITO_DOMAIN,
    redirectSignIn: import.meta.env.VITE_COGNITO_REDIRECT_URI,
    redirectSignOut: import.meta.env.VITE_COGNITO_LOGOUT_URI,
    responseType: 'code', // This should be constant
    scope: (import.meta.env.VITE_COGNITO_SCOPE || 'openid email profile').split(' '),
  },

  // Storage settings
  storage: {
    AWSS3: {
      bucket: import.meta.env.VITE_S3_BUCKET_NAME,
      region: import.meta.env.VITE_S3_BUCKET_REGION,
    },
  },

  // Feature flags
  features: {
    skipAuth: import.meta.env.VITE_SKIP_AUTH === 'true',
    enableMonitoring: import.meta.env.VITE_ENABLE_MONITORING === 'true',
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  },
} as const;

/**
 * Validates that all essential environment variables have been loaded.
 * @returns An object containing the validation status and any errors.
 */
export const validateAWSConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const { auth, storage } = AWS_CONFIG;

  if (!auth.userPoolId || auth.userPoolId.includes('your_user_pool_id'))
    errors.push('VITE_USER_POOL_ID is not configured.');
  if (!auth.userPoolWebClientId || auth.userPoolWebClientId.includes('your_app_client_id'))
    errors.push('VITE_USER_POOL_CLIENT_ID is not configured.');
  if (!auth.identityPoolId || auth.identityPoolId.includes('your_identity_pool_id'))
    errors.push('VITE_IDENTITY_POOL_ID is not configured.');
  if (!auth.domain || auth.domain.includes('your-domain'))
    errors.push('VITE_COGNITO_DOMAIN is not configured.');
  if (!auth.redirectSignIn || !auth.redirectSignIn.startsWith('http'))
    errors.push('VITE_COGNITO_REDIRECT_URI is not configured.');
  if (!auth.redirectSignOut || !auth.redirectSignOut.startsWith('http'))
    errors.push('VITE_COGNITO_LOGOUT_URI is not configured.');
  if (!storage.AWSS3.bucket || storage.AWSS3.bucket.includes('your-bucket-name'))
    errors.push('VITE_S3_BUCKET_NAME is not configured.');

  return {
    valid: errors.length === 0,
    errors,
  };
};