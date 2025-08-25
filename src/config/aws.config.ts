// src/config/aws.config.ts
/**
 * Centralized AWS configuration
 * This file consolidates all AWS service configurations
 */

export const AWS_CONFIG = {
  // Authentication
  auth: {
    region: import.meta.env.VITE_AWS_REGION,
    userPoolId: import.meta.env.VITE_USER_POOL_ID,
    userPoolClientId: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    identityPoolId: import.meta.env.VITE_IDENTITY_POOL_ID,
  },
  
  // Storage
  storage: {
    AWSS3: {
      bucket: import.meta.env.VITE_S3_BUCKET_NAME,
      region: import.meta.env.VITE_S3_BUCKET_REGION,
      prefix: import.meta.env.VITE_S3_DATA_PREFIX,
    },
  },
  
  // Data file paths in S3
  dataFiles: {
    summaryFile: 'road_network_summary_2.json',
    fullDataset: 'road_network_full_2.json',
  },
  
  // Feature flags
  features: {
    skipAuth: import.meta.env.VITE_SKIP_AUTH === 'true',
    enableMonitoring: import.meta.env.VITE_ENABLE_MONITORING === 'true',
    logLevel: import.meta.env.VITE_LOG_LEVEL || 'info',
  },
} as const;

// Helper function to get full S3 path
export const getS3Path = (filename: string): string => {
  const prefix = AWS_CONFIG.storage.AWSS3.prefix;
  return `${prefix}${filename}`;
};

// Validation to ensure all required env vars are present
export const validateAWSConfig = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (!AWS_CONFIG.auth.userPoolId) {
    errors.push('Missing VITE_USER_POOL_ID');
  }
  if (!AWS_CONFIG.auth.userPoolClientId) {
    errors.push('Missing VITE_USER_POOL_CLIENT_ID');
  }
  if (!AWS_CONFIG.auth.identityPoolId) {
    errors.push('Missing VITE_IDENTITY_POOL_ID');
  }
  if (!AWS_CONFIG.storage.AWSS3.bucket) {
    errors.push('Missing VITE_S3_BUCKET_NAME');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};