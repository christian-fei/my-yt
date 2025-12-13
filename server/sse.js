export function handleSSE (res, connections = []) {
  connections.push(res)
  res.on('close', () => {
    connections.splice(connections.findIndex(c => res === c), 1)
  })
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
}

export function broadcastSSE (data, connections = []) {
  connections.forEach(connection => {
    if (!connection) return
    // Log broadcast attempts for debugging SSE delivery
    try {
      const parsed = (() => {
        try { return JSON.parse(data) } catch (err) { return null }
      })()
      if (parsed && parsed.type) {
        console.log(`[sse] broadcasting type=${parsed.type} to ${connections.length} connection(s)`)
      } else {
        console.log('[sse] broadcasting data to', connections.length, 'connection(s)')
      }
    } catch (err) {
      console.log('[sse] broadcast log error', err && err.message)
    }

    const id = new Date().toISOString()
    connection.write('id: ' + id + '\n')
    connection.write('data: ' + data + '\n\n')
  })
}
