import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  server: {
    watch: {
      ignored: ['**/data/**', '**/research/**', '**/dist-server/**', '**/shared/*.json', '**/shared/*.gz']
    },
    proxy: {
      '/api': 'http://127.0.0.1:3001'
    }
  }
});
