import { parseBody, broadcastMessage } from '../_helpers.js'
import { getRepository } from '../../service-container.js'

export function getVideoQualityHandler (req, res, connections = [], state = {}) {
  const repo = getRepository()
  const videoQuality = repo.getVideoQualitySetting()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(videoQuality))
}

export async function setVideoQualityHandler (req, res, connections = [], state = {}) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const videoQuality = parsed

  const newQuality = repo.setVideoQualitySetting(videoQuality)
  if (!newQuality) {
    res.writeHead(400)
    return res.end()
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(newQuality))
}

export function getTranscodeVideosHandler (req, res) {
  const repo = getRepository()
  const transcodeVideos = repo.getTranscodeVideosSetting()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(transcodeVideos))
}

export async function setTranscodeVideosHandler (req, res) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const transcodeVideos = parsed

  repo.setTranscodeVideosSetting(transcodeVideos)
  res.writeHead(200)
  res.end()
}

export async function getExcludedTermsHandler (req, res, connections = [], state = {}) {
  const repo = getRepository()
  const excludedTerms = repo.getExcludedTerms()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(excludedTerms))
}

export async function addExcludedTermHandler (req, res) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const term = parsed.term
  repo.addExcludedTerm(term)
  res.writeHead(200)
  res.end()
}

export async function removeExcludedTermHandler (req, res) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const term = parsed.term
  repo.removeExcludedTerm(term)
  res.writeHead(200)
  res.end()
}

export async function toggleWatchedVideoHandler (req, res, connections = [], state = {}) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const videoId = parsed.id
  repo.toggleWatched(videoId)

  // Broadcast SSE to update all connected clients
  const updated = repo.isWatched(videoId)
  broadcastMessage('watched', { videoId, watched: updated }, connections)

  res.writeHead(200)
  res.end()
}

export default { getVideoQualityHandler, setVideoQualityHandler, getTranscodeVideosHandler, setTranscodeVideosHandler, getExcludedTermsHandler, addExcludedTermHandler, removeExcludedTermHandler, toggleWatchedVideoHandler }
