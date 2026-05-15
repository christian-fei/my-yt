import { downloadVideo, isUnsupportedUrl, extractIdFromUrl, isYouTubeUrl } from '../../../lib/youtube.js'
import { broadcastMessage, parseBody } from '../_helpers.js'

export async function downloadVideoHandler (req, res, repo, connections = [], state = {}) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  let { id, external } = parsed

  if (isUnsupportedUrl(id)) {
    console.log('unsupported url', id)
    res.writeHead(400)
    return res.end()
  }
  if (isYouTubeUrl(id)) { id = extractIdFromUrl(id) }

  state.downloading = state.downloading || {}
  state.downloading[id] = { lines: [] }

  let broadcastNewVideoOnce = false
  downloadVideo(id, repo, (message) => {
    if (external && !broadcastNewVideoOnce) {
      broadcastMessage('new-videos', { videos: [repo.getVideo(id)] }, connections)
      broadcastNewVideoOnce = true
    }
    if (message.status === 'info') {
      broadcastMessage('download-log-line', { line: message.line }, connections)
    }
    if (message.status === 'progress') {
      const progressPayload = Object.assign({}, message)
      if (!progressPayload.id) progressPayload.id = id
      if (!progressPayload.phase) progressPayload.phase = (progressPayload.frame || (progressPayload.time && progressPayload.time.indexOf(':') >= 0 && !progressPayload.total)) ? 'transcode' : 'download'
      if (progressPayload.phase === 'transcode') {
        broadcastMessage('transcode-progress', { progress: progressPayload }, connections)
      } else {
        broadcastMessage('download-progress', { progress: progressPayload }, connections)
      }
    }
  })
    .then(() => {
      const video = repo.getVideo(id)
      broadcastMessage('downloaded', { videoId: id, downloaded: true, video }, connections)
    })
    .catch((error) => {
      broadcastMessage('download-log-line', { line: error.stderr }, connections)
    })
    .finally(() => {
      delete state.downloading[id]
    })

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Download started')
}

export default { downloadVideoHandler }
