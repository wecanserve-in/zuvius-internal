import { defineConfig, devices } from '@playwright/test'

const PORT = 5180

/**
 * End-to-end flow test against the LIVE Firebase project from .env.local.
 * Creates a throw-away "QA Test" department and test employees, then deactivates them.
 * Run: npm run test:e2e   (needs .env.e2e.local with an admin login)
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.e2e\.ts$/,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 20 * 60 * 1000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  outputDir: 'e2e-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1366, height: 900 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 900 } } }],
  webServer: {
    // Production build + preview: stable under several browsers, same code users get.
    command: `npx vite build --outDir e2e-dist && npx vite preview --outDir e2e-dist --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 300_000,
  },
})
