// Shared API client abstraction — eliminates hardcoded /api/* strings across all components.

export const ENDPOINTS = {
  CHANNELS: '/api/channels',
  CAPTIONS: '/api/captions',
  DOWNLOAD_VIDEO: '/api/download-video',
  SUMMARIZE_VIDEO: '/api/summarize-video',
  IGNORE_VIDEO: '/api/ignore-video',
  DELETE_VIDEO: '/api/delete-video',
  VIDEOS: '/api/videos',
  VIDEO_QUALITY: '/api/video-quality',
  DISK_USAGE: '/api/disk-usage',
  RECLAIM_DISK_SPACE: '/api/reclaim-disk-space',
  TRANSCODE_VIDEOS: '/api/transcode-videos',
  EXCLUDED_TERMS: '/api/excluded-terms',
  BOOKMARKS: '/api/bookmarks',
  GET_BOOKMARKS: '/api/bookmarks/:id',
  DELETE_BOOKMARK: '/api/delete-bookmark'
}

export class ApiClient {
  constructor (base = '') { this.base = base }

  get (path, params = {}) {
    const query = new URLSearchParams(params).toString()
    const url = query ? `${this.base}${path}?${query}` : `${this.base}${path}`
    return fetch(url).then(r => r.json())
  }

  post (path, body) {
    return fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(r => r.json())
  }
}

export const api = new ApiClient() // singleton exported to all components via import
