import { parseBody, broadcastMessage } from '../_helpers.js'
import { getRepository } from '../../service-container.js'

export function getBookmarksHandler (req, res, connections = [], state = {}) {
  const repo = getRepository()
  const id = req.url.replace('/api/bookmarks/', '').split('?')[0]
  if (!id) { res.writeHead(400); return res.end('Missing video ID') }
  const bookmarks = repo.getVideoBookmarks(id)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(bookmarks))
}

export async function addBookmarkHandler (req, res, connections = []) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const { id: videoId, time, note } = parsed
  if (!videoId) { res.writeHead(400); return res.end('Missing video ID') }
  const bookmark = repo.addBookmark(videoId, { time: parseFloat(time) || 0, note })
  if (!bookmark) { res.writeHead(404); return res.end('Video not found') }

  // Broadcast SSE to update all connected clients
  broadcastMessage('bookmark-added', { videoId, bookmark }, connections)

  res.writeHead(201, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(bookmark))
}

export async function deleteBookmarkHandler (req, res) {
  const repo = getRepository()
  const parsed = await parseBody(req, res)
  if (parsed === null) return
  const { id: videoId, bookmarkId } = parsed
  if (!videoId || !bookmarkId) { res.writeHead(400); return res.end('Missing video/bookmark ID') }
  const success = repo.deleteBookmark(videoId, bookmarkId)
  res.writeHead(success ? 200 : 404)
  res.end()
}

export function searchBookmarksHandler (req, res, connections = []) {
  const repo = getRepository()
  const urlParts = req.url.split('?')
  const query = new URLSearchParams(urlParts[1] || '').get('q') || ''
  const results = repo.searchBookmarks(query)
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(results))
}

export default { getBookmarksHandler, addBookmarkHandler, deleteBookmarkHandler, searchBookmarksHandler }
