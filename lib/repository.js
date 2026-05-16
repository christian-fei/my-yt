import fs from 'fs'

export default class Repository {
  constructor (basePath = './data') {
    this.channels = []
    this.videos = []
    this.basePath = basePath
    this.paths = {
      videos: `${this.basePath}/videos.json`,
      channels: `${this.basePath}/channels.json`,
      settings: `${this.basePath}/settings.json`
    }

    fs.mkdirSync(`${this.basePath}/videos`, { recursive: true })
    if (!fs.existsSync(this.paths.videos)) {
      fs.writeFileSync(this.paths.videos, '[]')
    }
    if (!fs.existsSync(this.paths.channels)) {
      fs.writeFileSync(this.paths.channels, '[]')
    }
    if (!fs.existsSync(this.paths.settings)) {
      fs.writeFileSync(this.paths.settings, JSON.stringify({
        videoQuality: 720,
        transcodeVideos: true,
        excludedTerms: [],
        watchedVideos: []
      }, null, 2))
    }

    try {
      this.videos = JSON.parse(fs.readFileSync(this.paths.videos))
      this.channels = JSON.parse(fs.readFileSync(this.paths.channels))
      this.settings = JSON.parse(fs.readFileSync(this.paths.settings))
    } catch (err) {
      console.error(err)
    }
    if (this.settings.transcodeVideos === undefined) { this.setTranscodeVideosSetting(true) }
    if (this.settings.excludedTerms === undefined) {
      this.settings.excludedTerms = []
      this.saveSettings()
    }
    if (this.settings.watchedVideos === undefined) {
      this.settings.watchedVideos = []
      this.saveSettings()
    }

    fs.readdirSync(`${this.basePath}/videos`).forEach(file => {
      const format = file.substring(file.lastIndexOf('.') + 1)
      if (!['mp4', 'webm'].includes(format)) return
      const videoId = file.replace(/\.(webm|mp4)$/, '')
      const location = `${this.basePath}/videos/${file}`
      this.updateVideo(videoId, { downloaded: true, location, format })
    })
    this.saveVideos()
  }

  getChannels () { return this.channels }
  channelExists (name) {
    return !!this.channels.find(c => c.name === name)
  }

  addChannel (name) {
    this.channels.push({ name })
    this.saveChannels()
  }

  deleteChannel (name) {
    this.channels.splice(this.channels.findIndex(c => c.name === name), 1)
    this.saveChannels()
  }

  saveChannels () {
    fs.writeFileSync(this.paths.channels, JSON.stringify(this.channels, null, 2))
  }

  saveSettings () {
    fs.writeFileSync(this.paths.settings, JSON.stringify(this.settings, null, 2))
  }

  getAllVideos () {
    return this.videos
  }

  filterByExcludedTerms (v, excludedTerms = this.getExcludedTerms()) {
    if (v.summary) return true
    if (v.downloaded) return true
    const searchBase = v.title?.toLowerCase() + v.description?.toLowerCase()
    return !excludedTerms.some(term => searchBase.includes(term.toLowerCase()))
  }

  getVideos (query = {}) {
    const filterKeys = Object.keys(query).filter(k => k !== 'filter')

    let videos = this.videos
      .filter(v => query.excluded === 'true' ? !this.filterByExcludedTerms(v) : this.filterByExcludedTerms(v))

    if (query.filter) {
      const searchTerm = query.filter.toLowerCase()
      if (searchTerm.startsWith('@')) {
        videos = videos
          .filter(v => v.channelName)
          .filter(v => {
            return v.channelName.toLowerCase().includes(searchTerm.substring(1))
          })
      } else {
        videos = videos.filter(v => {
          return v.channelName?.toLowerCase().includes(searchTerm) ||
          v.title?.toLowerCase().includes(searchTerm) ||
          v.description?.toLowerCase().includes(searchTerm)
        })
      }
    }

    if (query.downloaded === 'true') {
      videos = videos.filter(v => v.downloaded)
    }
    if (query.ignored === 'true') {
      videos = videos.filter(v => v.ignored)
    }
    if (query.summarized === 'true') {
      videos = videos.filter(v => v.summary)
    }

    if (query.bookmarked === 'true') {
      videos = videos.filter(v => v.bookmarks && v.bookmarks.length > 0)
    }

    const watchedVideos = this.getWatchedVideos()
    if (query.unwatched === 'true') {
      videos = videos.filter(v => !watchedVideos.includes(v.id))
    } else if (filterKeys.length === 0) {
      videos = videos.filter(v => !v.ignored)
    }

    videos.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))

    videos = videos.filter((_, i) => i < 100)

    return videos
  }

  getVideo (id) {
    return this.videos.find(v => v.id === id)
  }

  getChannelVideos (name) {
    return this.videos.filter(v => v.channelName === name)
  }

  upsertVideos (videos) {
    (Array.isArray(videos) ? videos : [videos])
      .forEach(v => {
        const index = this.videos.findIndex(video => video.id === v.id)
        if (index !== -1) {
          this.videos[index] = Object.assign(this.videos[index], v)
        } else {
          this.videos.push(v)
        }
      })
    this.saveVideos()
  }

  updateVideo (id, update) {
    const index = this.videos.findIndex(v => v.id === id)
    if (index !== -1) {
      Object.assign(this.videos[index], update)
      this.saveVideos()
      return this.videos[index]
    }
  }

  deleteVideo (id) {
    this.videos = this.videos.map(v => {
      if (v.id === id) {
        return Object.assign(v, { downloaded: false })
      }
      return v
    })
    this.saveVideos()

    const files = fs.readdirSync(`${this.basePath}/videos`)
    files.forEach(file => {
      if (file.startsWith(id)) {
        fs.unlink(`${this.basePath}/videos/${file}`, err => {
          if (err) return console.error('failed to delete file', file)
          console.log('deleted video file', file)
        })
      }
    })
  }

  saveVideos () {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }

  ignoreVideo (id) {
    this.updateVideo(id, { ignored: true })
    return true
  }

  unignoreVideo (id) {
    this.updateVideo(id, { ignored: false })
    return false
  }

  setVideoTranscript (id, transcript = '') {
    return this.updateVideo(id, { transcript })
  }

  setVideoSummary (id, summary = '') {
    return this.updateVideo(id, { summary })
  }

  setVideoDownloaded (id, downloaded = true) {
    return this.updateVideo(id, { downloaded })
  }

  patchVideo (video) {
    const savedVideo = this.getVideo(video.id)
    if (savedVideo) return Object.assign(video, savedVideo)
    return Object.assign(video, { addedAt: Date.now() })
  }

  getVideoQualitySetting () {
    return this.settings.videoQuality
  }

  setVideoQualitySetting (videoQuality) {
    if ([360, 480, 720, 1080, 1440, 2160].includes(videoQuality)) {
      this.settings.videoQuality = videoQuality
      this.saveSettings()
    } else {
      console.log('Invalid video quality', videoQuality)
    }
    return this.settings.videoQuality
  }

  getTranscodeVideosSetting () {
    return this.settings.transcodeVideos
  }

  setTranscodeVideosSetting (value) {
    this.settings.transcodeVideos = !!value
    this.saveSettings()
    return this.settings.transcodeVideos
  }

  getExcludedTerms () {
    return (this.settings.excludedTerms || []).map(t => t.toLowerCase())
  }

  addExcludedTerm (term = '') {
    if (!term) return
    term = term.trim()
    const excludedTerms = this.getExcludedTerms()
    if (!excludedTerms.includes(term) && term) {
      excludedTerms.push(term)
      this.settings.excludedTerms = excludedTerms
      this.saveSettings()
    }
  }

  removeExcludedTerm (term) {
    const excludedTerms = this.getExcludedTerms()
    const index = excludedTerms.indexOf(term)
    if (index >= 0) {
      excludedTerms.splice(index, 1)
      this.settings.excludedTerms = excludedTerms
      this.saveSettings()
    }
  }

  getWatchedVideos () {
    return (this.settings.watchedVideos || [])
  }

  isWatched (videoId) {
    return this.getWatchedVideos().includes(videoId)
  }

  toggleWatched (videoId) {
    const watched = this.getWatchedVideos()
    if (watched.includes(videoId)) {
      watched.splice(watched.indexOf(videoId), 1)
    } else {
      watched.push(videoId)
    }
    this.settings.watchedVideos = watched
    this.saveSettings()
  }

  getVideoBookmarks (videoId) {
    const video = this.getVideo(videoId)
    return (video && video.bookmarks) || []
  }

  addBookmark (videoId, bookmark) {
    const video = this.getVideo(videoId)
    if (!video) return null
    if (!video.bookmarks) { video.bookmarks = [] }
    const newBookmark = Object.assign({ id: Date.now(), createdAt: Date.now() }, bookmark)
    video.bookmarks.push(newBookmark)
    this.saveVideos()
    return newBookmark
  }

  deleteBookmark (videoId, bookmarkId) {
    const video = this.getVideo(videoId)
    if (!video || !video.bookmarks) return false
    const index = video.bookmarks.findIndex(b => b.id === bookmarkId)
    if (index >= 0) {
      video.bookmarks.splice(index, 1)
      this.saveVideos()
      return true
    }
    return false
  }

  updateBookmark (videoId, bookmarkId, updates) {
    const video = this.getVideo(videoId)
    if (!video || !video.bookmarks) return null
    const bookmark = video.bookmarks.find(b => b.id === bookmarkId)
    if (!bookmark) return null
    Object.assign(bookmark, updates, { updatedAt: Date.now() })
    this.saveVideos()
    return bookmark
  }

  getVideoWithBookmarks (videoId) {
    const video = this.getVideo(videoId)
    if (!video) return null
    const result = Object.assign({}, video, { bookmarks: this.getVideoBookmarks(videoId) })
    return result
  }

  searchBookmarks (query = '') {
    const searchTerm = query.toLowerCase()
    const results = []
    for (const video of this.videos) {
      if (video.bookmarks && video.bookmarks.length > 0) {
        if (!searchTerm || video.bookmarks.some(b => (b.note || '').toLowerCase().includes(searchTerm))) {
          results.push(Object.assign({}, video, { bookmarks: this.getVideoBookmarks(video.id) }))
        }
      }
    }
    return results
  }
}
