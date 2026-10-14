/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_FIREBASE_VAPID_KEY?: string
  readonly VITE_FIREBASE_FUNCTIONS_REGION?: string
  readonly VITE_USE_FIREBASE_EMULATORS?: string
  readonly VITE_UPLOAD_USE_VITE_PROXY?: string
  readonly VITE_UPLOAD_API_BASE?: string
  readonly VITE_FUNCTIONS_EMULATOR_HOST?: string
  readonly VITE_FUNCTIONS_EMULATOR_PORT?: string
  readonly VITE_R2_ACCOUNT_ID?: string
  readonly VITE_R2_BUCKET_NAME?: string
  /** Public CDN / R2 domain for stable file URLs (not secret). Prefer VITE_R2_PUBLIC_URL. */
  readonly VITE_R2_PUBLIC_URL?: string
  readonly VITE_R2_PUBLIC_URL_BASE?: string
  readonly VITE_COMPANY_TIMEZONE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
