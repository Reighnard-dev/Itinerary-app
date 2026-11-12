import { defineConfig } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
 testDir: './tests/e2e', testMatch: 'supabase.spec.ts', timeout: 45000, workers: 1,
 use: { baseURL: 'http://127.0.0.1:3102', headless: true, channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
 webServer: {
  command: '"' + process.execPath + '" dist-server/server/index.js',
  url: 'http://127.0.0.1:3102/api/health', reuseExistingServer: false, timeout: 30000,
  env: { PORT: '3102', DATA_DIR: path.resolve('data/e2e-cloud'), SUPABASE_URL: '', SUPABASE_ANON_KEY: '' },
 },
});
