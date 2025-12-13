// ffmpegWorker.js
import { spawn } from 'child_process'
import { parentPort, workerData } from 'worker_threads'

const { location, format } = workerData

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

const process = transcode(location, format)

function handleLine (raw, stream = 'stdout') {
  const line = String(raw).replace(/\r?\n/g, '')
  parentPort.postMessage({ status: 'info', line, stream })
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
