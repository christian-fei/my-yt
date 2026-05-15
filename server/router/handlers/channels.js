import { updateAndPersistVideosForChannel } from '../../../lib/update-videos.js'
import { broadcastMessage, parseBody } from '../_helpers.js'

export function getChannelHandler (req, res, repo, connections = [], state = {}) {
  const channels = repo.getChannels()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(channels))
}

export async function addChannelHandler (req, res, repo, connections = []) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  let { name } = parsed
  name = name.trim()
  name = name.startsWith('@') ? name.substring(1) : name

  if (repo.channelExists(name)) {
    res.writeHead(409)
    return res.end('Channel already added')
  }

  const videos = await updateAndPersistVideosForChannel(name, repo)
  if (Array.isArray(videos)) {
    repo.addChannel(name)
    broadcastMessage('new-videos', { name, videos }, connections)
    res.writeHead(201)
    return res.end('Channel added')
  }

  res.writeHead(404)
  return res.end('Channel not found')
}

export async function deleteChannelHandler (req, res, repo, connections = [], state = {}) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  let { name } = parsed
  name = name.trim()

  if (!repo.channelExists(name)) {
    res.writeHead(409, { 'Content-Type': 'text/plain' })
    return res.end('Channel does not exist')
  }

  repo.deleteChannel(name)
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  return res.end('Channel deleted')
}

export async function ignoreVideoHandler (req, res, repo, connections = [], state = {}) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const { id, ignore } = parsed
  const ignored = ignore ? repo.ignoreVideo(id) : repo.unignoreVideo(id)
  broadcastMessage('ignored', { videoId: id, ignored }, connections)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(ignored))
}

export async function deleteVideoHandler (req, res, repo, connections = [], state = {}) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const { id } = parsed
  repo.deleteVideo(id)
  broadcastMessage('downloaded', { videoId: id, downloaded: false }, connections)
  res.writeHead(200)
  res.end()
}

export default { getChannelHandler, addChannelHandler, deleteChannelHandler, ignoreVideoHandler, deleteVideoHandler }
