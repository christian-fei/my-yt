/* global HTMLElement, customElements, confirm */
import { addClickListener, removeClickListener, addToast } from '../lib/utils.js'
import Store from '../lib/store.js'
import { ENDPOINTS } from '../lib/api.js'
const store = new Store()

class VideoElement extends HTMLElement {
  constructor () {
    super()
    this.downloadStartedText = '⚡️ Downloading..'
    this.summaryStartedText = '⚡️ Summarizing..'
    this.transcodeStartedText = '⚙️ Transcoding..'
  }

  connectedCallback () {
    this.video = JSON.parse(this.dataset.data)
    this.render()
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  static get observedAttributes () {
    return ['data-data', 'data-summarizing', 'data-downloading', 'data-progress', 'data-transcode-progress']
  }

  attributeChangedCallback (name, _, newValue) {
    if (name === 'data-downloading' && this.querySelector('.action.download')) {
      this.querySelector('.action.download').innerText = this.downloadStartedText
      return
    }
    if (name === 'data-progress' && this.querySelector('.action.download')) {
      this.querySelector('.action.download').innerText = this.downloadStartedText + ` (${this.dataset.progress}%)`
      return
    }
    if (name === 'data-transcode-progress' && this.querySelector('.action.download')) {
      this.querySelector('.action.download').innerText = this.transcodeStartedText + ` (${this.dataset.transcodeProgress}%)`
      return
    }
    if (name === 'data-summarizing' && this.querySelector('.action.summarize')) {
      this.querySelector('.action.summarize').innerText = this.summaryStartedText
      return
    }
    if (name === 'data-data') {
      this.video = JSON.parse(this.dataset.data)
      this.render()
    }
  }

  render () {
    if (!this.video) return

    this.unregisterEvents()

    this.classList.add('video')
    this.dataset.videoId = this.video.id
    this.dataset.date = this.video.publishedAt
    this.dataset.summarized = this.video.summary ? 'true' : 'false'
    this.dataset.downloaded = this.video.downloaded ? 'true' : 'false'
    this.dataset.ignored = this.video.ignored ? 'true' : 'false'
    this.dataset.progress = this.video.progress

    this.innerHTML = /* html */`
      ${this.video.downloaded
      ? /* html */`
        <div class="video-wrapper">
          <div tabindex="0" class="play video-placeholder" style="background-image: url(${this.video.thumbnail})">
            <div class="play-icon"></div>
            <span class="info-duration">${this.video.duration || 'N/A'}</span>
          </div>
        </div>
        `
      : /* html */`
        <div class="video-wrapper">
          <img title="${this.video.title}" loading="lazy" src="${this.video.thumbnail}"/>
          <span class="info-duration">${this.video.duration || 'N/A'}</span>
        </div>
      `}
      <span class="action ignore" tabindex="0">${this.video.ignored ? 'unignore' : 'ignore'}</span>
      <h4 class="title">${this.video.title}</h4>
      <div class="info">
        <span class="channel-name">${this.video.channelName}</span>
        <div class="flex">
          <span>${this.video.viewCount}</span>
          <span>${tryFormatDate(this.video.publishedAt)}</span>
        </div>
      </div>
      <div class="actions flex">
        ${this.video.downloaded
          ? /* html */`<span tabindex="0"  class="action delete" data-video-id="${this.video.id}">🗑️ Delete</span>`
          : /* html */`<span tabindex="0"  class="action download" data-video-id="${this.video.id}">⬇️ Download</span>`}
        ${store.get(store.useTLDWTubeKey)
          /* html */? `<a target="_blank" href="https://tldw.tube/?v=${this.video.id}">📖 tldw.tube</a>`
          : !this.video.summary
          ? /* html */`<span tabindex="0"  class="action summarize" data-video-id="${this.video.id}">📖 Summarize</span>`
          : /* html */`<span tabindex="0"  class="action show-summary" data-video-id="${this.video.id}">📖 Summary</span>`}
        <a href="https://www.youtube.com/watch?v=${this.video.id}" class="action open-externally" target="_blank">📺 external</a>
        <span tabindex="0" class="action watched" data-video-id="${this.video.id}">${store.isWatched(this.video.id) ? '✅ Watched' : '❌ Unwatched'}</span>
        <span tabindex="0" class="action bookmark" data-video-id="${this.video.id}">🔖 Bookmark</span>
      </div>
    `

    // Show bookmarks panel if video has bookmarks
    if (this.video.bookmarks && this.video.bookmarks.length > 0) {
      const actionContainer = this.querySelector('.actions')
      if (actionContainer && !this.querySelector('.bookmarks-list')) {
        const bookmarksHtml = `<div class="bookmarks-list" style="margin-top: 8px;">
          ${this.video.bookmarks.map(b => `<span tabindex="0" class="bookmark-item" data-bookmark-id="${b.id}" title="${(b.note || '').replace(/"/g, '&quot;')}">📌 ${this.formatTime(b.time)}${b.note ? ' · ' + b.note : ''}</span>`).join('')}
        </div>`
        actionContainer.insertAdjacentHTML('afterend', bookmarksHtml)
      }
    }

    // Add bookmark dialog if not exists
    if (!document.querySelector('dialog#bookmark-dialog')) {
      const dialog = document.createElement('dialog')
      dialog.id = 'bookmark-dialog'
      dialog.innerHTML = /* html */`
        <form method="dialog" id="bookmark-form">
          <label>Time (seconds):</label>
          <input type="number" id="bookmark-time" step="0.1" min="0" value="0" />
          <label>Note:</label>
          <input type="text" id="bookmark-note" placeholder="What's happening here?" />
          <div style="margin-top: 12px; display: flex; gap: 8px;">
            <button type="submit">Save</button>
            <button type="button" id="cancel-bookmark-btn">Cancel</button>
          </div>
        </form>
      `
      document.body.appendChild(dialog)

      dialog.querySelector('#cancel-bookmark-btn').addEventListener('click', () => {
        dialog.close()
      })

      dialog.querySelector('#bookmark-form').addEventListener('submit', (e) => {
        e.preventDefault()
        const time = dialog.querySelector('#bookmark-time').value
        const note = dialog.querySelector('#bookmark-note').value
        this.addBookmarkAtTime(time, note)
      })

      // Also support keyboard shortcut (b key when video is playing)
      document.addEventListener('keydown', this.handleBookmarkKey.bind(this))
    }

    if (window.state && window.state.downloading && window.state.downloading[this.video.id]) {
      this.dataset.downloading = 'true'
    }
    if (window.state && window.state.summarizing && window.state.summarizing[this.video.id]) {
      this.dataset.summarizing = 'true'
    }

    this.registerEvents()
  }

  registerEvents () {
    addClickListener(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    addClickListener(this.querySelector('.action.delete'), this.deleteVideoHandler.bind(this))
    addClickListener(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    addClickListener(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    addClickListener(this.querySelector('.action.ignore'), this.toggleIgnoreVideoHandler.bind(this))
    addClickListener(this.querySelector('.action.open-externally'), this.openExternallyHandler.bind(this))
    addClickListener(this.querySelector('.action.watched'), this.toggleWatchedVideoHandler.bind(this))
    addClickListener(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    addClickListener(this.querySelector('.play.video-placeholder'), this.watchVideoHandler.bind(this))
    addClickListener(this.querySelector('.action.bookmark'), this.toggleBookmarkDialog.bind(this))

    // Register bookmark item clicks to jump in video
    this.querySelectorAll('.bookmark-item').forEach(item => {
      addClickListener(item, this.jumpToBookmarkTime.bind(this))
    })

    // Register SSE bookmark events
    if (typeof window.addEventListenerSSE === 'function') {
      window.addEventListenerSSE('bookmark-added', this.handleBookmarkAdded.bind(this))
    }
  }

  unregisterEvents () {
    removeClickListener(this.querySelector('.action.download'), this.downloadVideoHandler.bind(this))
    removeClickListener(this.querySelector('.action.delete'), this.deleteVideoHandler.bind(this))
    removeClickListener(this.querySelector('.action.summarize'), this.summarizeVideoHandler.bind(this))
    removeClickListener(this.querySelector('.action.show-summary'), this.showSummaryHandler.bind(this))
    removeClickListener(this.querySelector('.action.ignore'), this.toggleIgnoreVideoHandler.bind(this))
    removeClickListener(this.querySelector('.action.open-externally'), this.openExternallyHandler.bind(this))
    removeClickListener(this.querySelector('.action.watched'), this.toggleWatchedVideoHandler.bind(this))
    removeClickListener(this.querySelector('.channel-name'), this.filterByChannelHandler.bind(this))
    removeClickListener(this.querySelector('.play.video-placeholder'), this.watchVideoHandler.bind(this))
    removeClickListener(this.querySelector('.action.bookmark'), this.toggleBookmarkDialog.bind(this))

    this.querySelectorAll('.bookmark-item').forEach(item => {
      removeClickListener(item, this.jumpToBookmarkTime.bind(this))
    })

    if (typeof window.removeEventListenerSSE === 'function') {
      window.removeEventListenerSSE('bookmark-added', this.handleBookmarkAdded.bind(this))
    }

    document.removeEventListener('keydown', this.handleBookmarkKey)
  }

  watchVideoHandler (event) {
    event.preventDefault()
    this.querySelector('.play.video-placeholder').outerHTML = /* html */`
    <video controls playsinline style="user-select: none; width: 100%;">
      <source src="${ENDPOINTS.VIDEOS}/${this.video.id}.${this.video.format || 'mp4'}" type="video/${this.video.format || 'mp4'}" />
      ${store.get(store.showCaptionsKey)
        ? /* html */`<track default kind="captions" srclang="en" src="${ENDPOINTS.CAPTIONS}/${this.video.id}" />`
        : ''}
      <p>
        Your browser does not support the video tag.
        Download the video instead <a href="${ENDPOINTS.VIDEOS}/${this.video.id}" target="_blank">here</a>
      </p>
    </video>`

    this.querySelector('video').play()
    this.registerVideoEvents(this.querySelector('video'))
  }

  downloadVideoHandler (event) {
    event.preventDefault()

    if (this.dataset.downloading === 'true') return
    this.dataset.downloading = 'true'

    const $downloadButton = event.target.classList.contains('.action') ? event.target : this.querySelector('.action.download')
    $downloadButton.innerText = this.downloadStartedText

    addToast('Downloading video...')

    fetch(ENDPOINTS.DOWNLOAD_VIDEO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id })
    })
      .catch((error) => console.error('Error starting download:', error))
  }

  deleteVideoHandler (event) {
    event.preventDefault()
    if (!confirm('About to delete video files, are you sure?')) return
    fetch(ENDPOINTS.DELETE_VIDEO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id })
    })
      .then(() => {
        this.video.downloaded = false
        this.classList.remove('downloading')
        this.classList.remove('big')
        this.querySelector('video') && this.unregisterVideoEvents(this.querySelector('video'))
        this.render()
      })
      .catch((error) => console.error('Error deleting video:', error))
  }

  summarizeVideoHandler (event) {
    event.preventDefault()

    if (this.dataset.summarizing === 'true') return
    this.dataset.summarizing = 'true'

    event.target.innerText = this.summaryStartedText

    addToast('Summarizing video...')

    fetch(ENDPOINTS.SUMMARIZE_VIDEO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id })
    })
      .catch((error) => console.error('Error starting summary:', error))
  }

  showSummaryHandler (event) {
    event.preventDefault()
    const video = this.video
    if (video) {
      document.querySelector('dialog#summary').showModal()
      document.querySelector('dialog#summary div').innerHTML = /* html */`
      <pre>${video.summary}</pre>
      <details>
        <summary>transcript</summary>
        <pre>${video.transcript}</pre>
      </details>
      `
    }
  }

  toggleIgnoreVideoHandler (event) {
    event.preventDefault()

    fetch(ENDPOINTS.IGNORE_VIDEO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id, ignore: !this.video.ignored })
    })
      .then(() => {
        this.remove()
        const videoElementCount = document.querySelectorAll('video-element').length
        document.title = `(${videoElementCount}) my-yt`
      })
      .catch((error) => {
        console.error('Error ignoring video:', error)
        this.classList.remove('hide')
        this.render()
      })
  }

  openExternallyHandler (event) {
    this.querySelector('video') && this.querySelector('video').pause()
  }

  toggleWatchedVideoHandler (event) {
    event.preventDefault()

    fetch(ENDPOINTS.WATCHED_VIDEO, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: this.video.id })
    })
      .then(() => {
        store.toggleWatched(this.video.id)
        this.render()
      })
      .catch((error) => console.error('Error toggling watched status:', error))
  }

  filterByChannelHandler (event) {
    const $searchInput = document.querySelector('#search')
    if (!$searchInput) return
    const channel = `@${this.video.channelName}`
    $searchInput.value = ($searchInput && $searchInput.value !== channel) ? channel : ''
    $searchInput.dispatchEvent(new Event('input'))
  }

  registerVideoEvents (video) {
    video.addEventListener('play', () => {
      this.classList.add('big')
      setTimeout(this.scrollIntoViewWithOffset.bind(this, document.querySelector('body > header').clientHeight, 'smooth'), 110)
      this.pauseOtherVideos(video)
    })
  }

  unregisterVideoEvents (video) {
    video.removeEventListener('play', this.pauseOtherVideos.bind(this, video))
  }

  pauseOtherVideos (video) {
    document.querySelectorAll('video').forEach(v => {
      if (v !== video) {
        v.pause()
        v.parentElement.classList.remove('big')
      }
    })
  }

  scrollIntoViewWithOffset (offset, behavior = 'smooth') {
    const top = this.getBoundingClientRect().top - offset - document.body.getBoundingClientRect().top
    window.scrollTo({ top, behavior })
  }

  // === Bookmark Methods ===

  toggleBookmarkDialog (event) {
    event.preventDefault()
    const dialog = document.querySelector('dialog#bookmark-dialog')
    if (!dialog) return

    // Get current time from playing video, default to 0
    const video = this.querySelector('video')
    dialog.querySelector('#bookmark-time').value = video ? Math.round(video.currentTime * 10) / 10 : 0
    dialog.querySelector('#bookmark-note').value = ''

    // Store current video reference for the dialog submit handler
    dialog.dataset.videoId = this.video.id
    dialog.showModal()

    // Focus the time input for quick entry
    setTimeout(() => dialog.querySelector('#bookmark-time').focus(), 100)
  }

  addBookmarkAtTime (time, note = '') {
    const videoId = this.video.id
    fetch(ENDPOINTS.BOOKMARKS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: videoId, time: parseFloat(time), note })
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to add bookmark')
        return res.json()
      })
      .then(bookmark => {
        addToast(`Bookmark saved at ${this.formatTime(bookmark.time)}`)
        document.querySelector('dialog#bookmark-dialog').close()

        // Refresh this video element to show the new bookmark
        const $videoElement = document.querySelector(`video-element[data-video-id="${videoId}"]`)
        if ($videoElement) {
          $videoElement.dispatchEvent(new CustomEvent('refresh'))
        }
      })
      .catch(error => {
        console.error('Error adding bookmark:', error)
        addToast('Failed to save bookmark')
      })
  }

  jumpToBookmarkTime (event) {
    event.preventDefault()
    const bookmarkId = parseInt(event.target.dataset.bookmarkId)
    const videoElement = document.querySelector(`video-element[data-video-id="${this.video.id}"]`)
    if (!videoElement) return

    // Find the video element's player
    const video = this.querySelector('video')
    if (!video) {
      // Start playing the video first, then seek
      this.watchVideoHandler({ preventDefault: () => {} })
      setTimeout(() => {
        const newVideo = this.querySelector('video')
        if (newVideo) {
          this.seekToBookmark(bookmarkId, newVideo)
        }
      }, 500)
      return
    }

    this.seekToBookmark(bookmarkId, video)
  }

  seekToBookmark (bookmarkId, video) {
    const bookmarks = this.video.bookmarks || []
    const bm = bookmarks.find(b => b.id === bookmarkId)
    if (bm && video) {
      video.currentTime = bm.time
      addToast(`Jumped to ${this.formatTime(bm.time)}`)
    }
  }

  handleBookmarkAdded (data) {
    if (data.videoId !== this.video.id) return
    // Refresh to show new bookmark in list
    const $videoElement = document.querySelector(`video-element[data-video-id="${data.videoId}"]`)
    if ($videoElement) {
      $videoElement.dispatchEvent(new CustomEvent('refresh'))
    }
  }

  handleBookmarkKey (event) {
    // Press 'b' when a video is playing to toggle bookmark dialog
    if (event.key === 'b' && !event.target.closest('input, textarea')) {
      const activeVideo = document.querySelector('video:played') || document.querySelector('video[autoplay]')
      if (activeVideo) {
        const videoEl = activeVideo.closest('video-element')
        if (videoEl) {
          const dialog = document.querySelector('dialog#bookmark-dialog')
          if (dialog && !dialog.open) {
            const time = Math.round(activeVideo.currentTime * 10) / 10
            dialog.querySelector('#bookmark-time').value = time
            dialog.dataset.videoId = videoEl.video.id
            dialog.showModal()
          }
        }
      }
    }

    // Press 'Escape' to close bookmark dialog
    if (event.key === 'Escape') {
      const dialog = document.querySelector('dialog#bookmark-dialog')
      if (dialog && dialog.open) {
        dialog.close()
      }
    }
  }

  formatTime (seconds) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    return `${m}:${String(s).padStart(2, '0')}`
  }
}

customElements.define('video-element', VideoElement)

function tryFormatDate (date) {
  try {
    return new Intl.DateTimeFormat(navigator.language, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    }).format(new Date(date))
  } catch (err) {
    return (date || '').substring(0, 10)
  }
}
