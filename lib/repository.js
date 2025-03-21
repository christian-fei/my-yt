import fs from 'fs'

export default class Repository {
  constructor(basePath = './data') {
    this.channels = []
    this.videos = []
    this.basePath = basePath
    this.paths = {
      videos: `${this.basePath}/videos.json`,
      channels: `${this.basePath}/channels.json`,
    }
    
    fs.mkdirSync(`${this.basePath}/videos`, { recursive: true })
    if (!fs.existsSync(this.paths.videos)) {
      console.log('initializing ', this.paths.videos)
      fs.writeFileSync(this.paths.videos, '[]')
    }
    if (!fs.existsSync(this.paths.channels)) {
      console.log('initializing ', this.paths.channels)
      fs.writeFileSync(this.paths.channels, '[]')
    }
  
    try {
      this.videos = JSON.parse(fs.readFileSync(this.paths.videos))
      console.log('read videos', this.videos.length)
      this.channels = JSON.parse(fs.readFileSync(this.paths.channels))
      console.log('read channels', this.channels.length)
    } catch (err) {
      console.error(err)
    }

    fs.readdirSync(`${this.basePath}/videos`).forEach(file => {
      if (!file.endsWith('.mp4') || file.endsWith('.uncut.mp4')) return
      const videoId = file.replace('.mp4', '')
      this.setVideoDownloaded(videoId)
    })
    this.saveVideos()
  }

  getChannels () { return this.channels }
  channelExists (name) {
    return !!this.channels.find(c => c.name === name)
  }
  addChannel (name) {
    this.channels.push({name})
    console.log('adding channel', name)
    this.saveChannels()
  }
  saveChannels() {
    fs.writeFileSync(this.paths.channels, JSON.stringify(this.channels, null, 2))
    console.log('saving channels', this.channels.length)
  }
  getVideos () {
    const videos = this.videos
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .sort((a, b) => (b.ignored ? -1 : 0) + (a.ignored ? 1 : 0))
    .filter((_, i) => i < 500)

    console.log('get videos', videos.length)
    
    return videos
  }
  getVideo(id) {
    return this.videos.find(v => v.id === id)
  }
  getChannelVideos (name) {
    console.log('get channel videos', name)
    return this.videos.filter(v => v.channelName === name)
  }
  upsertVideos(videos) {
    (Array.isArray(videos) ? videos : [videos])
    .forEach(v => {
      const index = this.videos.findIndex(video => video.id === v.id)
      if (index !== -1) {
        this.videos[index] = Object.assign(this.videos[index], v)
      } else {
        this.videos.push(v)
        console.log('upsert video, insert', v.id)
      }
    })
    this.saveVideos()
  }
  updateVideo(id, update) {
    const index = this.videos.findIndex(v => v.id === id)
    if (index !== -1) {
      Object.assign(this.videos[index], update)
      this.saveVideos()
      return this.videos[index]
    } else {
      console.log('cannot update video, video does not exist', id)
    }
  }
  deleteVideo(id) {
    this.videos = this.videos.map(v => {
      if (v.id === id) {
        console.log('deleting video', id)
        return Object.assign(v, {downloaded: false})
      }
      return v
    })
    this.saveVideos()
    
    const files = fs.readdirSync(`${this.basePath}/videos`)
    files.forEach(file => {
      if (file.startsWith(id)) {
        console.log('deleting video file', file)
        fs.unlinkSync(`${this.basePath}/videos/${file}`)
      }
    })
  }
  saveVideos() {
    fs.writeFileSync(this.paths.videos, JSON.stringify(this.videos, null, 2))
  }
  toggleIgnoreVideo(id) {
    const index = this.videos.findIndex(v => v.id === id)
    let ignored = false
    if (index !== -1) {
      ignored = this.videos[index].ignored = !this.videos[index].ignored
      console.log('set video ignored', id, ignored)
    } else {
      console.log('cannot set video ignored, video does not exist', id)
    }
    this.saveVideos()
    return ignored
  }
  setVideoTranscript(id, transcript = '') {
    console.log('set video transcript', id)
    return this.updateVideo(id, {transcript})
  }
  setVideoSummary(id, summary = '') {
    console.log('set video summary', id)
    return this.updateVideo(id, {summary})
  }
  setVideoDownloaded(id, downloaded = true) {
    console.log('set video downloaded', id)
    return this.updateVideo(id, {downloaded})
  }
  patchVideo(video) {
    if (this.getVideo(video.id)) return video
    return Object.assign(video, {addedAt: Date.now()})
  }
}