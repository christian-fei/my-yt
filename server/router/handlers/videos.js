import fs from 'fs'
import { broadcastMessage, getQuery } from '../_helpers.js'

export function searchVideosHandler (req, res, repo, connections = [], state = {}) {
  const query = getQuery(req)
  const videos = repo.getVideos(query)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(videos))
}

export function watchVideoHandler (req, res, repo, connections = []) {
  const id = req.url.replace('/api/videos/', '').replace(/\.(webm|mp4)$/, '')
  const video = repo.getVideo(id)
  const location = video.location || `./data/videos/${id}.mp4`
  const contentType = video.format ? `video/${video.format}` : 'video/mp4'
  if (!fs.existsSync(location)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Video not found')
    broadcastMessage('download-log-line', { line: `video does not exist ${location}` }, connections)
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

  broadcastMessage('download-log-line', { line: `video range requested ${location} ${start || 0}-${end || (contentLength - 1)}/${contentLength}` }, connections)

  const fileStream = fs.createReadStream(location, options)
  fileStream.on('error', error => {
    console.error(`Error reading file ${location}.`, error)
    broadcastMessage('download-log-line', { line: `video stream error ${location}: ${error.message}` }, connections)

    res.writeHead(500)
    res.end()
  })

  fileStream.pipe(res)
}

export function captionsHandler (req, res) {
  const captionsPath = './data' + req.url.replace('api/captions', 'videos') + '.en.vtt'
  if (!fs.existsSync(captionsPath)) {
    res.writeHead(404)
    res.end()
  } else {
    const fileStream = fs.createReadStream(captionsPath)
    fileStream.pipe(res)
  }
}

export default { searchVideosHandler, watchVideoHandler, captionsHandler }
