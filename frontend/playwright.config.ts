import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    trace: 'on-first-retry',
    launchOptions: process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
      : undefined
  },
  webServer: [
    { command: 'npm --prefix admin run dev -- --host 127.0.0.1', port: 3001, reuseExistingServer: !process.env.CI },
    { command: 'npm --prefix user run dev -- --host 127.0.0.1', port: 3002, reuseExistingServer: !process.env.CI }
  ],
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 } } },
    { name: 'portrait-tablet', use: { viewport: { width: 900, height: 1180 } } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 800 } } }
  ]
});
