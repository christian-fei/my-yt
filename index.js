import os from 'os'
import { initRepository } from './server/service-container.js'
import { createServer } from './server/http.js'
import stateFactory from './server/state-factory.js'
import { broadcastSSE } from './server/sse.js'
import { updateAndPersistVideos } from './lib/update-videos.js'

async function main ({ port = 3000 } = {}) {
  initRepository()
  const connections = []
  const state = stateFactory((updatedState) =>
    broadcastSSE(JSON.stringify({ type: 'state', state: updatedState }), connections))

  let lastAdded = Date.now()
  runUpdateVideos(connections)
  setInterval(runUpdateVideos, (+process.env.UPDATE_INTERVAL_MINUTES || 30) * 1000 * 60, connections)

  createServer({ state, connections })
    .listen(port, () => {
      console.log(`Server running at http://${os.hostname()}:${port} (or http://localhost:${port})`)
    })

  function runUpdateVideos (connections) {
    console.log('update videos')
    updateAndPersistVideos((err, data) => {
      if (err) return console.error(err)
      const { name, videos } = data
      const newVideos = videos.filter(v => v.addedAt > lastAdded).filter(v => !v.ignored)
      lastAdded = Date.now()
      if (newVideos.length > 0) {
        console.log('new videos for channel', name, newVideos.length)
        broadcastSSE(JSON.stringify({ type: 'new-videos', name, videos: newVideos }), connections)
        broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `new videos for channel ${name} ${newVideos.length}` }), connections)
      } else {
        broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `no new videos for channel ${name}` }), connections)
      }
    })
  }
}

if (import.meta.url.endsWith('index.js')) {
  main({
    port: +process.env.PORT || 3000
  })
  logMemoryUsage()
  setInterval(logMemoryUsage, 5 * 60 * 1000)
}

function logMemoryUsage () {
  const memUsage = process.memoryUsage()
  console.log(`[memory] rss: ${Math.round(memUsage.rss / 1024 / 1024)} MB, heapTotal: ${Math.round(memUsage.heapTotal / 1024 / 1024)} MB, heapUsed: ${Math.round(memUsage.heapUsed / 1024 / 1024)} MB, external: ${Math.round(memUsage.external / 1024 / 1024)} MB`)
}
