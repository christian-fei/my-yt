import http from 'http'
import { URL } from 'url'
import { handleSSE, broadcastSSE } from './sse.js'
import apiHandler from './router/index.js'
import appHandler from './router/app.js'
export function createServer ({ connections = [], state }) {
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)

      if (req.headers.accept && req.headers.accept.indexOf('text/event-stream') >= 0) {
        handleSSE(res, connections)
        return broadcastSSE(JSON.stringify({ type: 'state', state }), connections)
      }

      if (url.pathname.startsWith('/api/')) return apiHandler(req, res, connections, state)

      return appHandler(req, res)
    } catch (error) {
      console.error(error)
    }
  })
}
