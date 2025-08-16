import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward any request starting with /api to our FastAPI backend
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        // Optional but recommended: remove /api prefix before sending to backend
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    }
  }
})
