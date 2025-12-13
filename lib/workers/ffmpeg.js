// ffmpegWorker.js
import { spawn } from 'child_process'
import { parentPort, workerData } from 'worker_threads'

const { location, format, duration } = workerData

function transcode (location, format) {
  return spawn('ffmpeg', [
    '-i',
    location,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '28',
    '-x264-params',
    'opencl=true',
    '-vf',
    'format=yuv420p',
    '-profile:v',
    'main',
    '-movflags',
    '+faststart',
    '-c:a',
    'copy',
    location.replace(format, 'tmp.' + format)
  ])
}

// Helper: parse time like "00:00:44.40" to seconds
function parseTime (str) {
  if (!str) return null
  const m = String(str).trim().match(/^(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)$/)
  if (!m) return null
  const hours = parseInt(m[1], 10)
  const minutes = parseInt(m[2], 10)
  const seconds = parseFloat(m[3])
  return hours * 3600 + minutes * 60 + seconds
}

const process = transcode(location, format)

function handleLine (raw, stream = 'stdout') {
  const line = String(raw).replace(/\r?\n/g, '')

  parentPort.postMessage({ status: 'info', line, stream })

  // Try to parse ffmpeg progress lines like:
  // frame= 1112 fps=441 q=33.0 size=    2304KiB time=00:00:44.40 bitrate= 425.1kbits/s speed=17.6x elapsed=0:00:02.52
  const progressRegex = /frame=\s+(\d+)\s+fps=\s*(\d+)\s+q=\s*([\d.]+)\s+size=\s+([\d.]+KiB)\s+time=\s*([\d:]+(?:\.\d+)?)\s+bitrate=\s*([\d.]+kbits\/s)\s+speed=\s*([\d.]+x)/
  const m = line.match(progressRegex)
  if (m) {
    const frame = parseInt(m[1], 10)
    const fps = parseInt(m[2], 10)
    const timeRaw = m[5]
    const currentTime = parseTime(timeRaw)
    const percent = duration && currentTime != null ? Math.round((currentTime / duration) * 100) : null

    console.log('[ffmpeg worker] Progress:', {
      frame,
      fps,
      currentTime,
      duration,
      percent
    })

    parentPort.postMessage({
      status: 'progress',
      frame,
      fps,
      q: parseFloat(m[3]),
      size: m[4],
      time: timeRaw,
      currentTime,
      bitrate: m[6],
      speed: m[7],
      percent,
      line,
      stream
    })
  }
}

process.stdout.on('data', (data) => {
  String(data).split(/\r?\n/).forEach((l) => { if (l) handleLine(l, 'stdout') })
})

process.stderr.on('data', (data) => {
  String(data).split(/\r?\n/).forEach((l) => { if (l) handleLine(l, 'stderr') })
})

process.on('close', (code) => {
  parentPort.postMessage({ status: 'done', code })
})

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Worker error:', error)
  parentPort.postMessage({ status: 'error', error: error.message })
})
