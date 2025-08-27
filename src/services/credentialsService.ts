// src/services/credentialsService.ts
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand
} from '@aws-sdk/client-cognito-identity';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts'; // Import STS Client
import { getTokens } from '@/utils/tokenManager';
import { logger } from '@/utils/logger';

const IDENTITY_POOL_ID = import.meta.env.VITE_IDENTITY_POOL_ID;
const REGION = import.meta.env.VITE_AWS_REGION;
const USER_POOL_ID = import.meta.env.VITE_USER_POOL_ID;

// Cache for AWS credentials
let cachedCredentials: {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  expiration?: Date;
} | null = null;

// Initialize the Cognito Identity client
const cognitoIdentityClient = new CognitoIdentityClient({ region: REGION });

/**
 * Get AWS credentials for S3 access
 * This exchanges the Cognito ID token for temporary AWS credentials
 */
export async function getAWSCredentials() {
  try {
    // Check if we have valid cached credentials
    if (cachedCredentials && cachedCredentials.expiration) {
      const now = new Date();
      const expirationTime = new Date(cachedCredentials.expiration);
      // Refresh if less than 5 minutes remaining
      if (expirationTime.getTime() - now.getTime() > 5 * 60 * 1000) {
        logger.info('credentialsService', 'Using cached AWS credentials');
        return cachedCredentials;
      }
    }

    // Get the ID token from session storage
    const tokens = getTokens();
    if (!tokens || !tokens.id_token) {
      throw new Error('No valid authentication tokens found');
    }

    logger.info('credentialsService', 'Exchanging ID token for AWS credentials...');

    // Step 1: Get Identity ID from the Identity Pool
    const getIdCommand = new GetIdCommand({
      IdentityPoolId: IDENTITY_POOL_ID,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: tokens.id_token
      }
    });

    const identityResponse = await cognitoIdentityClient.send(getIdCommand);
    
    if (!identityResponse.IdentityId) {
      throw new Error('Failed to get identity ID from Cognito Identity Pool');
    }

    logger.info('credentialsService', 'Identity ID obtained:', {
      identityId: identityResponse.IdentityId.substring(0, 10) + '...'
    });

    // Step 2: Get temporary AWS credentials
    const getCredentialsCommand = new GetCredentialsForIdentityCommand({
      IdentityId: identityResponse.IdentityId,
      Logins: {
        [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: tokens.id_token
      }
    });

    const credentialsResponse = await cognitoIdentityClient.send(getCredentialsCommand);
    
    if (!credentialsResponse.Credentials) {
      throw new Error('Failed to get AWS credentials from Identity Pool');
    }

    // Cache the credentials
    cachedCredentials = {
      accessKeyId: credentialsResponse.Credentials.AccessKeyId!,
      secretAccessKey: credentialsResponse.Credentials.SecretKey!,
      sessionToken: credentialsResponse.Credentials.SessionToken,
      expiration: credentialsResponse.Credentials.Expiration
    };

    logger.info('credentialsService', 'AWS credentials obtained successfully', {
      expiresAt: credentialsResponse.Credentials.Expiration?.toISOString()
    });

    // =================================================================
    // NEW: Use STS to get and log the ARN of the assumed role
    // =================================================================
    try {
      const stsClient = new STSClient({
        region: REGION,
        credentials: {
          accessKeyId: cachedCredentials.accessKeyId,
          secretAccessKey: cachedCredentials.secretAccessKey,
          sessionToken: cachedCredentials.sessionToken,
        }
      });
      const callerIdentity = await stsClient.send(new GetCallerIdentityCommand({}));
      logger.info('credentialsService', 'Successfully assumed IAM Role:', { arn: callerIdentity.Arn });
    } catch (stsError) {
      logger.error('credentialsService', 'Failed to get caller identity from STS', { stsError });
    }
    // =================================================================

    return cachedCredentials;

  } catch (error) {
    logger.error('credentialsService', 'Failed to get AWS credentials', { error });
    // Clear cached credentials on error
    cachedCredentials = null;
    throw error;
  }
}

/**
 * Clear cached credentials (useful on logout)
 */
export function clearAWSCredentials() {
  cachedCredentials = null;
  logger.info('credentialsService', 'Cached AWS credentials cleared');
}

/**
 * Check if we have valid credentials
 */
export function hasValidCredentials(): boolean {
  if (!cachedCredentials || !cachedCredentials.expiration) {
    return false;
  }
  
  const now = new Date();
  const expirationTime = new Date(cachedCredentials.expiration);
  return expirationTime > now;
}