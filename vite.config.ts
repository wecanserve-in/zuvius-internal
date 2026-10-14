import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const projectId = env.VITE_FIREBASE_PROJECT_ID ?? 'internal-chat-bc793'
  const region = env.VITE_FIREBASE_FUNCTIONS_REGION ?? 'asia-south1'
  const emulatorHost = env.VITE_FUNCTIONS_EMULATOR_HOST ?? '127.0.0.1'
  const emulatorPort = env.VITE_FUNCTIONS_EMULATOR_PORT ?? '5001'

  return {
    plugins: [react(), tailwindcss()],
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
          rewrite: (p) => p.replace(/^\/upload-api/, `/${projectId}/${region}`),
        },
      },
    },
  }
})
