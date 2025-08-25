/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
  readonly VITE_SENTRY_DSN?: string
  readonly VITE_AWS_REGION?: string
  readonly VITE_AUTH_BYPASS?: string
  
  // Existing Cognito variables
  readonly VITE_USER_POOL_ID: string
  readonly VITE_USER_POOL_CLIENT_ID: string
  readonly VITE_IDENTITY_POOL_ID: string

  // New Cognito Hosted UI variables
  readonly VITE_COGNITO_DOMAIN: string
  readonly VITE_COGNITO_REDIRECT_URI: string
  readonly VITE_COGNITO_LOGOUT_URI: string
  readonly VITE_COGNITO_RESPONSE_TYPE: string
  readonly VITE_COGNITO_SCOPE: string

  // S3 and other variables
  readonly VITE_S3_BUCKET_NAME: string
  readonly VITE_S3_BUCKET_REGION: string
  readonly VITE_S3_DATA_PREFIX: string
  readonly VITE_SKIP_AUTH: string
  readonly VITE_LOG_LEVEL: string
  readonly VITE_ENABLE_MONITORING: string
  readonly VITE_API_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
