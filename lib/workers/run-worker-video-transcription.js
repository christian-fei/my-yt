import { Worker } from 'worker_threads'

export function runWorkerVideoTranscription (location, format, duration, callback) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./lib/workers/ffmpeg.js', {
      workerData: { location, format, duration }
    })

    worker.on('message', (message) => {
      if (message.status === 'done') {
        resolve()
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
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}
