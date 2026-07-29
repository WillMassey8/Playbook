import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    // Allow public tunnels (localhost.run / cloudflare / localtunnel)
    allowedHosts: true,
    proxy: {
      // Dev-only: resolve X syndication without CORS (playback URL only — not stored)
      '/tw-syndication': {
        target: 'https://cdn.syndication.twimg.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tw-syndication/, ''),
      },
    },
  },
})
