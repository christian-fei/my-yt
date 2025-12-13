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

    const id = new Date().toISOString()
    connection.write('id: ' + id + '\n')
    connection.write('data: ' + data + '\n\n')
  })
}
