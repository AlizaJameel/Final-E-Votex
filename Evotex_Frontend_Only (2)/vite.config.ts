import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Named Cloudflare tunnel serves https://evotex.bintysafdar.com -> Vite :5173.
// Vite proxies /api -> Express :5001 (single origin for WebAuthn).
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
