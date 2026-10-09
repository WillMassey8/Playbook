import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Dev-only passthrough so the browser can muted-autoplay X CDN clips.
 * iOS AVPlayer talks to video.twimg.com directly; browsers need this relay.
 * Bytes are not written to disk.
 */
function twitterVideoProxy(): Plugin {
  return {
    name: 'twitter-video-proxy',
    configureServer(server) {
      server.middlewares.use('/tw-video', async (req, res) => {
        const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url')
        if (!target || !/^https:\/\/video\.twimg\.com\//.test(target)) {
          res.statusCode = 400
          res.end('invalid url')
          return
        }
        try {
          const upstream = await fetch(target, {
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://x.com/',
              ...(req.headers.range ? { Range: String(req.headers.range) } : {}),
            },
          })
          res.statusCode = upstream.status
          for (const header of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
            const value = upstream.headers.get(header)
            if (value) res.setHeader(header, value)
          }
          res.setHeader('cache-control', 'public, max-age=3600')
          if (!upstream.body) {
            res.end()
            return
          }
          const reader = upstream.body.getReader()
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            res.write(value)
          }
          res.end()
        } catch {
          res.statusCode = 502
          res.end('upstream failed')
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), twitterVideoProxy()],
  server: {
    host: true,
    port: 5174,
    strictPort: true,
    allowedHosts: true,
    proxy: {
      '/tw-syndication': {
        target: 'https://cdn.syndication.twimg.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/tw-syndication/, ''),
      },
    },
  },
})
