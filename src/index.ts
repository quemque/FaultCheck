import { serve } from 'bun'
import index from './index.html'

const BACKEND = process.env.BACKEND_URL ?? 'http://127.0.0.1:8000'

const server = serve({
   routes: {
      '/api/*': async (req) => {
         const url = new URL(req.url)
         const path = url.pathname.replace(/^\/api/, '')
         try {
            const upstream = await fetch(BACKEND + path + url.search, {
               method: req.method,
            })
            return new Response(upstream.body, {
               status: upstream.status,
               headers: {
                  'content-type':
                     upstream.headers.get('content-type') ?? 'application/json',
               },
            })
         } catch {
            return Response.json(
               { error: 'Backend unavailable' },
               { status: 502 },
            )
         }
      },
      '/*': index,
   },
   development: process.env.NODE_ENV !== 'production' && {
      hmr: true,
      console: true,
   },
})

console.log(`🚀 ${server.url}`)
