import fs from 'fs'
import { URL } from 'url'
import querystring from 'querystring'
import { summarizeVideo } from '../../lib/subtitles-summary.js'
import { broadcastSSE } from '../sse.js'
import { downloadVideo, extractIdFromUrl, isUnsupportedUrl, isYouTubeUrl } from '../../lib/youtube.js'
import { updateAndPersistVideosForChannel } from '../../lib/update-videos.js'

const llmDefaults = {
  model: 'meta-llama-3.1-8b-instruct',
  host: 'http://127.0.0.1:1234',
  endpoint: '/v1/chat/completions',
  apiKey: '',
  temperature: 0
}

const llmSettings = {
  model: process.env.AI_MODEL ?? llmDefaults.model,
  host: process.env.AI_HOST ?? llmDefaults.host,
  endpoint: process.env.AI_ENDPOINT ?? llmDefaults.endpoint,
  apiKey: process.env.AI_APIKEY ?? llmDefaults.apiKey,
  temperature: process.env.AI_TEMPERATURE ?? llmDefaults.temperature
}

const routeTable = [
  { path: '/api/channels', method: 'GET', handler: getChannelHandler, nargs: 3 },
  { path: '/api/channels', method: 'POST', handler: addChannelHandler, nargs: 4 },
  { path: '/api/channels', method: 'DELETE', handler: deleteChannelHandler, nargs: 3 },
  { path: '/api/download-video', method: 'POST', handler: downloadVideoHandler, nargs: 5 },
  { path: '/api/summarize-video', method: 'POST', handler: summarizeVideoHandler, nargs: 6 },
  { path: '/api/ignore-video', method: 'POST', handler: ignoreVideoHandler, nargs: 4 },
  { path: '/api/delete-video', method: 'POST', handler: deleteVideoHandler, nargs: 4 },
  { path: '/api/videos', method: 'GET', handler: searchVideosHandler, nargs: 3 },
  { path: '/api/video-quality', method: 'GET', handler: getVideoQualityHandler, nargs: 3 },
  { path: '/api/video-quality', method: 'POST', handler: setVideoQualityHandler, nargs: 3 },
  { path: '/api/disk-usage', method: 'GET', handler: diskUsageHandler, nargs: 3 },
  { path: '/api/reclaim-disk-space', method: 'POST', handler: reclaimDiskSpaceHandler, nargs: 4 },
  { path: '/api/transcode-videos', method: 'GET', handler: getTranscodeVideosHandler, nargs: 3 },
  { path: '/api/transcode-videos', method: 'POST', handler: setTranscodeVideosHandler, nargs: 3 },
  { path: '/api/excluded-terms', method: 'GET', handler: getExcludedTermsHandler, nargs: 3 },
  { path: '/api/excluded-terms', method: 'POST', handler: addExcludedTermHandler, nargs: 3 },
  { path: '/api/excluded-terms', method: 'DELETE', handler: removeExcludedTermHandler, nargs: 3 },
  { pathRegex: /\/api\/videos\//, method: 'GET', handler: watchVideoHandler, nargs: 4 },
  { pathRegex: /\/api\/captions\//, method: 'GET', handler: captionsHandler, nargs: 2 }
]

export default function apiHandler (req, res, repo, connections = [], state = {}) {
  const url = new URL(req.url, `http://${req.headers.host}`)

  const match = routeTable.find(r => {
    if (r.path !== undefined && url.pathname !== r.path) return false
    if (r.pathRegex && !r.pathRegex.test(url.pathname)) return false
    if (req.method !== r.method) return false
    return true
  })

  if (!match) { res.writeHead(404); return res.end() }

  const handler = match.handler
  switch (match.nargs) {
    case 2: return handler(req, res)
    case 3: return handler(req, res, repo)
    case 4: return handler(req, res, repo, connections)
    case 5: return handler(req, res, repo, connections, state)
    case 6: return handler(req, res, repo, connections, state, llmSettings)
    default: return handler(req, res, repo, connections, state)
  }
}

async function getChannelHandler (req, res, repo) {
  const channels = repo.getChannels()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(channels))
}

async function addChannelHandler (req, res, repo, connections = []) {
  const body = await getBody(req)
  let { name } = JSON.parse(body)
  name = name.trim()
  name = name.startsWith('@') ? name.substring(1) : name

  if (repo.channelExists(name)) {
    res.writeHead(409)
    return res.end('Channel already added')
  }

  const videos = await updateAndPersistVideosForChannel(name, repo)
  if (Array.isArray(videos)) {
    repo.addChannel(name)
    broadcastSSE(JSON.stringify({ type: 'new-videos', name, videos }), connections)
    res.writeHead(201)
    return res.end('Channel added')
  }

  res.writeHead(404)
  return res.end('Channel not found')
}

async function deleteChannelHandler (req, res, repo) {
  const body = await getBody(req)
  let { name } = JSON.parse(body)
  name = name.trim()

  if (!repo.channelExists(name)) {
    res.writeHead(409, { 'Content-Type': 'text/plain' })
    return res.end('Channel does not exist')
  }

  repo.deleteChannel(name)
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  return res.end('Channel deleted')
}

async function downloadVideoHandler (req, res, repo, connections = [], state = {}) {
  const body = await getBody(req)
  let { id, external } = JSON.parse(body)

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
      broadcastSSE(JSON.stringify({ type: 'new-videos', videos: [repo.getVideo(id)] }), connections)
      broadcastNewVideoOnce = true
    }
    if (message.status === 'info') {
      broadcastSSE(JSON.stringify({ type: 'download-log-line', line: message.line }), connections)
    }
    if (message.status === 'progress') {
      const progressPayload = Object.assign({}, message)
      if (!progressPayload.id) progressPayload.id = id
      if (!progressPayload.phase) progressPayload.phase = (progressPayload.frame || (progressPayload.time && progressPayload.time.indexOf(':') >= 0 && !progressPayload.total)) ? 'transcode' : 'download'
      if (progressPayload.phase === 'transcode') {
        broadcastSSE(JSON.stringify({ type: 'transcode-progress', progress: progressPayload }), connections)
      } else {
        broadcastSSE(JSON.stringify({ type: 'download-progress', progress: progressPayload }), connections)
      }
    }
  })
    .then(() => {
      const video = repo.getVideo(id)
      broadcastSSE(JSON.stringify({ type: 'downloaded', videoId: id, downloaded: true, video }), connections)
    })
    .catch((error) => {
      broadcastSSE(JSON.stringify({ type: 'download-log-line', line: error.stderr }), connections)
    })
    .finally(() => {
      delete state.downloading[id]
    })

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Download started')
}

async function summarizeVideoHandler (req, res, repo, connections = [], state = {}, llmSettings = {}) {
  const body = await getBody(req)
  const { id } = JSON.parse(body)

  state.summarizing = state.summarizing || {}
  state.summarizing[id] = { lines: [] }

  summarizeVideo(id, repo, llmSettings, (line) => {
    broadcastSSE(JSON.stringify({ type: 'download-log-line', line }), connections)
  })
    .then(({ summary, transcript }) =>
      broadcastSSE(JSON.stringify({ type: 'summary', summary, transcript, videoId: id }), connections))
    .catch((error) => {
      broadcastSSE(JSON.stringify({ type: 'download-log-line', line: error.message }), connections)
      broadcastSSE(JSON.stringify({ type: 'summary-error', videoId: id }), connections)
    })
    .finally(() => {
      delete state.summarizing[id]
    })

  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Download started')
}

async function ignoreVideoHandler (req, res, repo, connections = []) {
  const body = await getBody(req)
  const { id, ignore } = JSON.parse(body)
  const ignored = ignore ? repo.ignoreVideo(id) : repo.unignoreVideo(id)
  broadcastSSE(JSON.stringify({ type: 'ignored', videoId: id, ignored }), connections)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  return res.end(JSON.stringify(ignored))
}

async function deleteVideoHandler (req, res, repo, connections = []) {
  const body = await getBody(req)
  const { id } = JSON.parse(body)
  repo.deleteVideo(id)
  broadcastSSE(JSON.stringify({ type: 'downloaded', videoId: id, downloaded: false }), connections)
  res.writeHead(200)
  res.end()
}

export function searchVideosHandler (req, res, repo) {
  const query = getQuery(req)
  const videos = repo.getVideos(query)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(videos))
}

function getVideoQualityHandler (req, res, repo) {
  const videoQuality = repo.getVideoQualitySetting()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(videoQuality))
}

async function setVideoQualityHandler (req, res, repo) {
  const body = await getBody(req)
  const videoQuality = JSON.parse(body)

  const newQuality = repo.setVideoQualitySetting(videoQuality)
  if (!newQuality) {
    res.writeHead(400)
    return res.end()
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(newQuality))
}

function diskUsageHandler (req, res, repo) {
  const onlyIgnored = getQuery(req).onlyIgnored === 'true'
  const videos = repo.getAllVideos()

  const filterFn = onlyIgnored ? video => (video.downloaded || video.transcript) && video.ignored : video => (video.downloaded || video.transcript)

  const diskSpaceUsed = videos.filter(filterFn)
    .reduce((total, video) => {
      try {
        const filenames = fs.readdirSync('./data/videos').filter(f => f.startsWith(video.id))
        return total + filenames.reduce((acc, filename) => acc + fs.statSync(`./data/videos/${filename}`).size / Math.pow(10, 9), 0)
      } catch (err) {
        console.error(err)
        return total
      }
    }, 0)
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end(diskSpaceUsed.toFixed(3) + 'GB')
}

async function reclaimDiskSpaceHandler (req, res, repo, connections = []) {
  const body = await getBody(req)
  const { onlyIgnored } = JSON.parse(body)
  const videos = repo.getAllVideos()

  const filterFn = onlyIgnored ? video => (video.downloaded || video.transcript) && video.ignored : video => (video.downloaded || video.transcript)

  videos.filter(filterFn)
    .forEach((video) => {
      try {
        fs.readdir('./data/videos', (err, filenames) => {
          if (err) {
            broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `error reading dir data/video: ${err.message}` }), connections)
            return console.error(err)
          }
          for (const filename of filenames) {
            if (filename.startsWith(video.id)) {
              fs.unlink(`./data/videos/${filename}`, err => {
                if (err) {
                  console.error(err)
                  broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `error deleting ${filename}: ${err.message}` }), connections)
                } else {
                  console.log('deleted', filename)
                  repo.updateVideo(video.id, { downloaded: false })
                  broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `deleted ${filename}` }), connections)
                }
              })
            }
          }
        })
      } catch (err) {
        console.error(err.message)
      }
    })
  repo.saveVideos()
  res.writeHead(200)
  res.end()
}

async function getExcludedTermsHandler (req, res, repo) {
  const excludedTerms = repo.getExcludedTerms()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(excludedTerms))
}
async function addExcludedTermHandler (req, res, repo) {
  const body = await getBody(req)
  const term = JSON.parse(body).term
  repo.addExcludedTerm(term)
  res.writeHead(200)
  res.end()
}
async function removeExcludedTermHandler (req, res, repo) {
  const body = await getBody(req)
  const term = JSON.parse(body).term
  repo.removeExcludedTerm(term)
  res.writeHead(200)
  res.end()
}
async function getTranscodeVideosHandler (req, res, repo) {
  const transcodeVideos = repo.getTranscodeVideosSetting()
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(transcodeVideos))
}
async function setTranscodeVideosHandler (req, res, repo) {
  const body = await getBody(req)
  const transcodeVideos = JSON.parse(body)

  repo.setTranscodeVideosSetting(transcodeVideos)
  res.writeHead(200)
  res.end()
}

function watchVideoHandler (req, res, repo, connections = []) {
  const id = req.url.replace('/api/videos/', '').replace(/\.(webm|mp4)$/, '')
  const video = repo.getVideo(id)
  const location = video.location || `./data/videos/${id}.mp4`
  const contentType = video.format ? `video/${video.format}` : 'video/mp4'
  if (!fs.existsSync(location)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Video not found')
    broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `video does not exist ${location}` }), connections)
    return
  }

  // https://github.com/bootstrapping-microservices/video-streaming-example/blob/master/index.js
  // https://blog.logrocket.com/streaming-video-in-safari/

  const options = {}

  let start
  let end

  const range = req.headers.range
  if (range) {
    const bytesPrefix = 'bytes='
    if (range.startsWith(bytesPrefix)) {
      const bytesRange = range.substring(bytesPrefix.length)
      const parts = bytesRange.split('-')
      if (parts.length === 2) {
        const rangeStart = parts[0] && parts[0].trim()
        if (rangeStart && rangeStart.length > 0) {
          options.start = start = parseInt(rangeStart)
        }
        const rangeEnd = parts[1] && parts[1].trim()
        if (rangeEnd && rangeEnd.length > 0) {
          options.end = end = parseInt(rangeEnd)
        }
      }
    }
  }

  res.setHeader('content-type', contentType)

  const stat = fs.statSync(location)

  const contentLength = stat.size

  if (req.method === 'HEAD') {
    res.statusCode = 200
    res.setHeader('accept-ranges', 'bytes')
    res.setHeader('content-length', contentLength)
    return res.end()
  }
  let retrievedLength = contentLength
  if (start !== undefined && end !== undefined) {
    retrievedLength = end - start + 1
  } else if (start !== undefined) {
    retrievedLength = contentLength - start
  }

  res.statusCode = (start !== undefined || end !== undefined) ? 206 : 200

  res.setHeader('content-length', retrievedLength)

  if (range !== undefined) {
    res.setHeader('accept-ranges', 'bytes')
    res.setHeader('content-range', `bytes ${start || 0}-${end || (contentLength - 1)}/${contentLength}`)
  }

  broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `video range requested ${location} ${start || 0}-${end || (contentLength - 1)}/${contentLength}` }), connections)

  const fileStream = fs.createReadStream(location, options)
  fileStream.on('error', error => {
    console.error(`Error reading file ${location}.`, error)
    broadcastSSE(JSON.stringify({ type: 'download-log-line', line: `video stream error ${location}: ${error.message}` }), connections)

    res.writeHead(500)
    res.end()
  })

  fileStream.pipe(res)
}

function captionsHandler (req, res) {
  const captionsPath = './data' + req.url.replace('api/captions', 'videos') + '.en.vtt'
  if (!fs.existsSync(captionsPath)) {
    res.writeHead(404)
    res.end()
  } else {
    const fileStream = fs.createReadStream(captionsPath)
    fileStream.pipe(res)
  }
}

async function getBody (req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

function getQuery (req) {
  return (req.url && req.url.indexOf('?') >= 0)
    ? querystring.parse(req.url.substring(req.url.indexOf('?') + 1))
    : {}
}
