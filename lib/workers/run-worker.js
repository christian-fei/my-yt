import { Worker } from 'worker_threads'

export function runWorker (workerPath, workerData, callback) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData })

    worker.on('message', (message) => {
      if (message.status === 'done') {
        resolve(message)
      }
      if (message.status === 'error') {
        reject(message.error)
      }
      if (message.status === 'info') {
        callback(message)
      }
      if (message.status === 'progress') {
        callback(message)
      }
    })

    worker.on('error', (error) => {
      reject(error)
    })

    worker.on('exit', (code) => {
      if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`))
    })
  })
}

export function runWorkerDownload (id, quality, callback) {
  return runWorker('./lib/workers/video.js', { id, quality }, callback)
}

export function runWorkerTranscode (location, format, duration, callback) {
  return runWorker('./lib/workers/ffmpeg.js', { location, format, duration }, callback)
}
