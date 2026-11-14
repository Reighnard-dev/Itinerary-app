import { defineConfig } from '@playwright/test';
import path from 'node:path';
export default defineConfig({
 testDir:'./tests/e2e',testIgnore:'supabase.spec.ts',timeout:45000,workers:1,fullyParallel:false,
 use:{baseURL:'http://127.0.0.1:3101',headless:true,channel:'chrome',screenshot:'only-on-failure',trace:'retain-on-failure'},
 webServer:{command:`"${process.execPath}" node_modules/vite/bin/vite.js build --outDir data/e2e-dist && "${process.execPath}" dist-server/server/index.js`,url:'http://127.0.0.1:3101/api/health',reuseExistingServer:false,timeout:120000,env:{PORT:'3101',DATA_DIR:path.resolve('data/e2e'),STATIC_DIR:path.resolve('data/e2e-dist'),SUPABASE_URL:'',SUPABASE_ANON_KEY:'',VITE_SUPABASE_URL:'',VITE_SUPABASE_ANON_KEY:''}},
});
