import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'
// @ts-expect-error — JS helper; no types for .mjs in tsconfig
import { hydrateR2EnvFromFunctions } from './scripts/hydrateR2EnvFromFunctions.mjs'

export default defineConfig(({ mode }) => {
  const projectId =
    process.env.VITE_FIREBASE_PROJECT_ID ?? 'internal-chat-bc793'
  hydrateR2EnvFromFunctions(projectId, mode)
  const env = loadEnv(mode, process.cwd(), '')
  const resolvedProjectId = env.VITE_FIREBASE_PROJECT_ID ?? projectId
  const region = env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'asia-south1'
  const emulatorHost = env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1'
  const emulatorPort = env.VITE_FUNCTIONS_EMULATOR_PORT ?? '5001'

  return {
    plugins: [react(), tailwindcss()],
    // Vite 8 pre-bundle breaks @aws-sdk → @smithy/core/retry; load SDK on demand instead.
    optimizeDeps: {
      exclude: ['@aws-sdk/client-s3', '@aws-sdk/s3-request-presigner'],
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      // Same-origin proxy to Functions emulator — avoids browser CORS on requestUpload.
      proxy: {
        '/upload-api': {
          target: `http://${emulatorHost}:${emulatorPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/upload-api/, `/${resolvedProjectId}/${region}`),
        },
      },
    },
  }
})
