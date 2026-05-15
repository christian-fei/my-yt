import { parseBody } from '../_helpers.js'

export function getVideoQualityHandler (req, res, repo, connections = [], state = {}) {
  const videoQuality = repo.getVideoQualitySetting()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(videoQuality))
}

export async function setVideoQualityHandler (req, res, repo, connections = [], state = {}) {
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

export function getTranscodeVideosHandler (req, res, repo) {
  const transcodeVideos = repo.getTranscodeVideosSetting()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(transcodeVideos))
}

export async function setTranscodeVideosHandler (req, res, repo) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const transcodeVideos = parsed

  repo.setTranscodeVideosSetting(transcodeVideos)
  res.writeHead(200)
  res.end()
}

export async function getExcludedTermsHandler (req, res, repo, connections = [], state = {}) {
  const excludedTerms = repo.getExcludedTerms()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(excludedTerms))
}

export async function addExcludedTermHandler (req, res, repo) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const term = parsed.term
  repo.addExcludedTerm(term)
  res.writeHead(200)
  res.end()
}

export async function removeExcludedTermHandler (req, res, repo) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const term = parsed.term
  repo.removeExcludedTerm(term)
  res.writeHead(200)
  res.end()
}

export default { getVideoQualityHandler, setVideoQualityHandler, getTranscodeVideosHandler, setTranscodeVideosHandler, getExcludedTermsHandler, addExcludedTermHandler, removeExcludedTermHandler }
