import fs from 'fs'
import { broadcastMessage, parseBody, getQuery } from '../_helpers.js'

export function diskUsageHandler (req, res, repo, connections = [], state = {}) {
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

export async function reclaimDiskSpaceHandler (req, res, repo, connections = [], state = {}) {
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const { onlyIgnored } = parsed

  const filterFn = (video) => (video.downloaded || video.transcript)
    ? (onlyIgnored ? video.ignored : true)
    : false

  const videos = repo.getAllVideos().filter(filterFn)
  const filenames = await fs.promises.readdir('./data/videos')
  for (const video of videos) {
    try {
      for (const filename of filenames) {
        if (filename.startsWith(video.id)) {
          await fs.promises.unlink(`./data/videos/${filename}`)
          console.log('deleted', filename)
          repo.updateVideo(video.id, { downloaded: false })
          broadcastMessage('download-log-line', { line: `deleted ${filename}` }, connections)
        }
      }
    } catch (err) {
      console.error(`error processing video ${video.id}: ${err.message}`)
      broadcastMessage('download-log-line', { line: `error processing video ${video.id}: ${err.message}` }, connections)
    }
  }

  repo.saveVideos()
  res.writeHead(200)
  res.end()
}

export default { diskUsageHandler, reclaimDiskSpaceHandler }
