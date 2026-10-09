import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Social clips play via official platform embeds (iframe). No CDN video proxy.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    // Allow public tunnels (localhost.run / cloudflare / localtunnel)
    allowedHosts: true,
  },
})
