import channels from './handlers/channels.js'
import videos from './handlers/videos.js'
import downloads from './handlers/downloads.js'
import summaries from './handlers/summaries.js'
import settings from './handlers/settings.js'
import diskSpace from './handlers/disk-space.js'
import bookmarks from './handlers/bookmarks.js'
import { scraperStatusHandler } from './handlers/health.js'

const routeMap = {
  // Channels: GET, POST, DELETE
  'GET /api/channels': channels.getChannelHandler,
  'POST /api/channels': channels.addChannelHandler,
  'DELETE /api/channels': channels.deleteChannelHandler,

  // Download: POST
  'POST /api/download-video': downloads.downloadVideoHandler,

  // Summarize: POST
  'POST /api/summarize-video': summaries.summarizeVideoHandler,

  // Ignore video: POST
  'POST /api/ignore-video': channels.ignoreVideoHandler,

  // Delete video: POST
  'POST /api/delete-video': channels.deleteVideoHandler,

  // Videos: GET (search)
  'GET /api/videos': videos.searchVideosHandler,

  // Video quality: GET, POST
  'GET /api/video-quality': settings.getVideoQualityHandler,
  'POST /api/video-quality': settings.setVideoQualityHandler,

  // Disk usage: GET
  'GET /api/disk-usage': diskSpace.diskUsageHandler,

  // Reclaim: POST
  'POST /api/reclaim-disk-space': diskSpace.reclaimDiskSpaceHandler,

  // Transcode: GET, POST
  'GET /api/transcode-videos': settings.getTranscodeVideosHandler,
  'POST /api/transcode-videos': settings.setTranscodeVideosHandler,

  // Excluded terms: GET, POST, DELETE
  'GET /api/excluded-terms': settings.getExcludedTermsHandler,
  'POST /api/excluded-terms': settings.addExcludedTermHandler,
  'DELETE /api/excluded-terms': settings.removeExcludedTermHandler,

  // Watched videos: POST
  'POST /api/watched-video': settings.toggleWatchedVideoHandler,

  // Scraper health: GET
  'GET /api/scraper-status': scraperStatusHandler,

  // Bookmarks: GET, POST
  'GET /api/bookmarks': bookmarks.searchBookmarksHandler,
  'POST /api/bookmarks': bookmarks.addBookmarkHandler,

  // Video Bookmarks: GET
  'GET /api/bookmarks/:id': bookmarks.getBookmarksHandler,

  // Delete Bookmark: POST
  'POST /api/delete-bookmark': bookmarks.deleteBookmarkHandler

} // route map ends here

export default function apiHandler (req, res, connections = [], state = {}) {
  const path = req.url.split('?')[0]

  // Exact match with method
  const key = `${req.method} ${path}`
  if (routeMap[key]) {
    return routeMap[key](req, res, connections, state)
  }

  // Regex-style matches (path-based patterns with method check)
  if (req.method === 'GET' && path.startsWith('/api/videos/')) {
    return videos.watchVideoHandler(req, res, connections)
  }
  if (req.method === 'GET' && path.startsWith('/api/captions/')) {
    return videos.captionsHandler(req, res)
  }
  if (req.method === 'GET' && path.startsWith('/api/bookmarks/')) {
    return bookmarks.getBookmarksHandler(req, res, connections)
  }

  // 404 fallback
  res.writeHead(404)
  return res.end()
}

// Re-export individual handlers for tests that import them directly
export { searchVideosHandler } from './handlers/videos.js'
