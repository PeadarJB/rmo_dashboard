import { CognitoIdentityClient, GetIdCommand, GetCredentialsForIdentityCommand } from '@aws-sdk/client-cognito-identity';
import { getTokens } from '@/utils/tokenManager';
import { logger } from '@/utils/logger';

const IDENTITY_POOL_ID = import.meta.env.VITE_IDENTITY_POOL_ID;
const REGION = import.meta.env.VITE_AWS_REGION;

// This service will exchange your Cognito ID token for temporary AWS credentials