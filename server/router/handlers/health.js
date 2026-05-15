import { ScraperError } from '../../../lib/scraper-errors.js'

/**
 * Reports the scraper health status for each channel.
 * A channel is "healthy" if it has a video from the last 48 hours,
 * otherwise "stale". Returns summary per channel.
 */
export async function scraperStatusHandler (req, res, connections = [], state = {}) {
  const repo = state.repo
  if (!repo) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Repository not available' }))
    return
  }

  const channels = repo.getChannels()
  const status = {}

  for (const channel of channels) {
    try {
      // Check if there's a recent video from this channel (last 48 hours)
      const videos = repo.getVideos({ filter: `@${channel.name}` })
      const lastVideo = videos.sort((a, b) => new Date(b.date) - new Date(a.date))[0]

      const now = Date.now()
      const recentThreshold = 48 * 3600 * 1000 // 48 hours
      const isHealthy = lastVideo && (now - new Date(lastVideo.date).getTime()) < recentThreshold

      status[channel.name] = {
        lastVideoDate: lastVideo?.date,
        videoCount: videos.length,
        status: isHealthy ? 'healthy' : 'stale'
      }

      // Attempt a lightweight scraper probe for stale channels
      if (!isHealthy) {
        const { getVideosFor } = await import('../../lib/youtube.js')
        const videosResult = await getVideosFor(channel.name)
        if (Array.isArray(videosResult) && videosResult.length > 0) {
          status[channel.name].status = 'needs-update'
        }
      }
    } catch (error) {
      status[channel.name] = {
        error: 'probe-failed',
        message: error instanceof ScraperError ? error.message : String(error)
      }
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(status))
}
