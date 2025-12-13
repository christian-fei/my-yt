import { Worker } from 'worker_threads'

export function runWorkerVideoDownload (id, quality, callback) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./lib/workers/video.js', {
      workerData: { id, quality }
    })

    worker.on('message', (message) => {
      if (message.status === 'done') {
        resolve({ location: message.location, format: message.format })
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
