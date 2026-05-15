import { summarizeVideo } from '../../../lib/subtitles-summary.js'
import { broadcastMessage, parseBody, llmSettings } from '../_helpers.js'
export async function summarizeVideoHandler (req, res, connections = [], state = {}) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const { id } = parsed

  state.summarizing = state.summarizing || {}
  state.summarizing[id] = { lines: [] }

  summarizeVideo(id, llmSettings, (line) => {
    broadcastMessage('download-log-line', { line }, connections)
  })
    .then(({ summary, transcript }) =>
      broadcastMessage('summary', { summary, transcript, videoId: id }, connections))
    .catch((error) => {
      broadcastMessage('download-log-line', { line: error.message }, connections)
      broadcastMessage('summary-error', { videoId: id }, connections)
    })
    .finally(() => {
      delete state.summarizing[id]
    })

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Download started')
}

export default { summarizeVideoHandler }
