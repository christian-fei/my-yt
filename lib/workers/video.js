// videoWorker.js
import { spawn } from 'child_process'
import { parentPort, workerData } from 'worker_threads'
import { videoYTDLPArgs, buildCookiesOption } from '../yt-dlp-args.js'

function video (id, quality) {
  const cookiesOption = buildCookiesOption()
  return spawn('yt-dlp', [
    '-o',
    `./data/videos/${id}.%(ext)s`,
    ...cookiesOption,
    ...videoYTDLPArgs(quality),
    '--',
    id
  ])
}

const { id, quality } = workerData
let location, format
const process = video(id, quality)
// Helper: parse human readable sizes like "4.99MiB", "1023KiB", "123B"
function parseSize (str) {
  if (!str) return null
  const m = String(str).trim().match(/^([\d.]+)\s*(B|KiB|MiB|GiB|KB|MB|GB)?$/i)
  if (!m) return null
  const val = parseFloat(m[1])
  const unit = (m[2] || 'B').toUpperCase()
  switch (unit) {
    case 'B': return val
    case 'KB': return val * 1e3
    case 'KIB': return val * 1024
    case 'MB': return val * 1e6
    case 'MIB': return val * 1024 * 1024
    case 'GB': return val * 1e9
    case 'GIB': return val * 1024 * 1024 * 1024
    default: return val
  }
}

// Regex to match yt-dlp download progress lines like:
// [download]  12.3% of 50.00MiB at 1.23MiB/s ETA 00:35
// [download] 100% of 4.99MiB in 00:04
const downloadProgressRegex = /\[download\]\s+([\d.]+)%\s+of\s+([^\s]+)(?:\s+at\s+([^\s]+)\/s\s+ETA\s+([^\s]+)|\s+in\s+([^\s]+))?/

function handleLine (raw, stream = 'stdout') {
  const line = String(raw).replace(/\r?\n/g, '')

  parentPort.postMessage({ status: 'info', line })
  // Detect merger output like before
  if (line && line.startsWith('[Merger] Merging formats into')) {
    location = line.substring(line.lastIndexOf(' ') + 1).replace(/"/g, '').replace(/\n/, '')
    format = location.substring(location.lastIndexOf('.') + 1).replace(/\n/, '')
    return
  }

  // Try to parse download progress
  const m = line.match(downloadProgressRegex)
  if (m) {
    const percent = parseFloat(m[1])
    const totalRaw = m[2]
    const speedRaw = m[3] || null
    const eta = m[4] || m[5] || null
    const total = parseSize(totalRaw)
    const downloaded = (total != null && !Number.isNaN(percent)) ? Math.round(total * percent / 100) : null

    parentPort.postMessage({
      status: 'progress',
      id,
      percent,
      downloaded,
      total,
      totalRaw,
      speed: speedRaw,
      eta,
      line,
      stream
    })
  }
}

process.stdout.on('data', (data) => {
  // yt-dlp may emit multiple lines per chunk; split and handle each
  String(data).split(/\r?\n/).forEach((l) => { if (l) handleLine(l, 'stdout') })
})

// yt-dlp often outputs progress to stderr; listen there too
process.stderr.on('data', (data) => {
  String(data).split(/\r?\n/).forEach((l) => { if (l) handleLine(l, 'stderr') })
})

// process.stderr.on('data', (line) => {
//   console.error(`stderr: ${line}`)
// })

process.on('close', (code) => {
  parentPort.postMessage({ status: 'done', code, location, format })
})

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Worker error:', error)
  parentPort.postMessage({ status: 'error', error: error.message })
})
