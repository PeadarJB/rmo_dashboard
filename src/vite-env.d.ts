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
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}