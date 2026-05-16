/* global HTMLElement, customElements, document */
import { addToast } from '../lib/utils.js'
import { ENDPOINTS } from '../lib/api.js'

const searchEventSupported = 'search' in document.createElement('input')
console.log({ searchEventSupported })

class SearchVideos extends HTMLElement {
  constructor () {
    super()
    this.previousSearchTerm = ''
  }

  connectedCallback () {
    this.render()
    this.registerEvents()

    const searchParams = new URLSearchParams(window.location.search)
    const excluded = searchParams.get('excluded') || ''
    const ignored = searchParams.get('ignored') || ''
    const downloaded = searchParams.get('downloaded') || ''
    const summarized = searchParams.get('summarized') || ''
    const unwatched = searchParams.get('unwatched') || ''
    const bookmarked = searchParams.get('bookmarked') || ''
    const searchTerm = searchParams.get('filter') || ''
    this.querySelector('#search').value = searchTerm
    this.querySelector('#excluded').checked = excluded === 'true'
    this.querySelector('#ignored').checked = ignored === 'true'
    this.querySelector('#downloaded').checked = downloaded === 'true'
    this.querySelector('#summarized').checked = summarized === 'true'
    this.querySelector('#unwatched').checked = unwatched === 'true'
    this.querySelector('#bookmarked').checked = bookmarked === 'true'
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  registerEvents () {
    this.querySelector('#search').addEventListener('input', this.searchHandler.bind(this))
    this.querySelector('#excluded').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#ignored').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#downloaded').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#summarized').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#unwatched').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#bookmarked').addEventListener('change', this.searchHandler.bind(this))
  }

  unregisterEvents () {
    this.querySelector('#search').removeEventListener('input', this.searchHandler.bind(this))
    this.querySelector('#excluded').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#ignored').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#downloaded').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#summarized').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#unwatched').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#bookmarked').removeEventListener('change', this.searchHandler.bind(this))
  }

  render () {
    this.innerHTML = /* html */`
      <div class="flex align-start">
        <input type="search" incremental="incremental" id="search" placeholder="🔍 Search videos or paste video url" autofocus>
        <details>
          <summary>Filters</summary>
          <div class="flex " id="search-filters">
            <div class="flex-1">
              <input type="checkbox" id="downloaded"/>
              <label for="downloaded">downloaded</label>
            </div>
            <div class="flex-1">
              <input type="checkbox" id="summarized"/>
              <label for="summarized">summarized</label>
            </div>
            <div class="flex-1">
              <input type="checkbox" id="ignored"/>
              <label for="ignored">ignored</label>
            </div>
            <div class="flex-1">
              <input type="checkbox" id="excluded"/>
              <label for="excluded">excluded</label>
            </div>
            <div class="flex-1">
              <input type="checkbox" id="unwatched"/>
              <label for="unwatched">unwatched</label>
            </div>
            <div class="flex-1">
              <input type="checkbox" id="bookmarked"/>
              <label for="bookmarked">🔖 bookmarked</label>
            </div>
          </div>
        </details>
      </div>
      <div id="filter-results-status"></div>
    `
  }

  searchHandler (event) {
    if (event) event.preventDefault()
    const $search = this.querySelector('#search')
    let searchTerm = $search.value.trim()
    if (event && this.previousSearchTerm === searchTerm && event.target === $search) return
    if (event && event.target === $search) this.previousSearchTerm = searchTerm

    const $status = this.querySelector('#filter-results-status')

    if (searchTerm.match('https?://')) {
      addToast('Downloading video...')
      fetch(ENDPOINTS.DOWNLOAD_VIDEO, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: searchTerm, external: true })
      })
        .catch((error) => console.error('Error starting download:', error))
      $search.value = ''
      return
    }

    searchTerm = searchTerm.toLowerCase()
    document.body.classList.add('searching')
    const excluded = this.querySelector('#excluded').checked
    const ignored = this.querySelector('#ignored').checked
    const downloaded = this.querySelector('#downloaded').checked
    const summarized = this.querySelector('#summarized').checked
    const unwatched = this.querySelector('#unwatched').checked
    const bookmarked = this.querySelector('#bookmarked').checked

    if (excluded) {
      this.querySelector('#ignored').disabled = true
    } else {
      this.querySelector('#ignored').disabled = false
    }
    if (ignored) {
      this.querySelector('#excluded').disabled = true
    } else {
      this.querySelector('#excluded').disabled = false
    }

    const query = `?filter=${encodeURIComponent(searchTerm)}${excluded ? '&excluded=true' : ''}${downloaded ? '&downloaded=true' : ''}${ignored ? '&ignored=true' : ''}${summarized ? '&summarized=true' : ''}${unwatched ? '&unwatched=true' : ''}${bookmarked ? '&bookmarked=true' : ''}`
    window.history.pushState({}, '', query)

    fetch(ENDPOINTS.VIDEOS + query)
      .then(res => res.json())
      .then((videos) => {
        const $videosContainer = document.querySelector('videos-container')
        if (!$videosContainer) return
        $videosContainer.dataset.videos = JSON.stringify(videos)
        console.log('updated videos attribute')

        document.title = `(${videos.length}) my-yt`
        if (event) {
          if (videos.length > 0) {
            $status.innerText = `Found ${videos.length} video${videos.length === 1 ? '' : 's'}`
          } else $status.innerText = 'No videos found'
        }
      })
      .catch(err => {
        console.error(err)
        $status.innerText = `An error occurred: ${err.message}`
      })
      .finally(() => {
        document.body.classList.remove('searching')
      })
  }
}
customElements.define('search-videos', SearchVideos)
