/* global MutationObserver, history, PopStateEvent, location, dispatchEvent */
import { applyShowBigPlayer, applyShowThumbnails } from '../lib/utils.js'
import Store from '../lib/store.js'
import { ENDPOINTS } from '../lib/api.js'
const store = new Store()

const routes = {
  '/': {
    template: document.getElementById('main-template'),
    async initialize () {
      document.getElementById('home-link').classList.add('hide')

      document.querySelector('search-videos #search').removeAttribute('disabled', 'disabled')
      document.querySelector('search-videos').classList.remove('hide')

      document.querySelector('search-videos').searchHandler()

      const channels = await fetch(ENDPOINTS.CHANNELS).then(res => res.json())
      document.querySelector('channels-list').dataset.list = JSON.stringify(channels.map(c => c.name).filter(Boolean))

      document.querySelector('empty-state').dataset.hasChannels = channels.length > 0
      handleEmptyState()

      new MutationObserver((mutationList, observer) => {
        handleEmptyState()
      }).observe(document.querySelector('videos-container'), { attributes: false, childList: true, subtree: true })

      applyShowThumbnails(store.get(store.showThumbnailsKey))
      applyShowBigPlayer(store.get(store.showBigPlayerKey))
    }
  },
  '/settings': {
    template: document.getElementById('settings-template'),
    async initialize () {
      document.getElementById('home-link').classList.remove('hide')

      document.querySelector('search-videos #search').setAttribute('disabled', 'disabled')
      document.querySelector('search-videos').classList.add('hide')

      const $showThumbnails = document.getElementById('show-thumbnails')
      store.get(store.showThumbnailsKey) ? $showThumbnails.setAttribute('checked', 'true') : $showThumbnails.removeAttribute('checked')

      $showThumbnails.addEventListener('click', (event) => {
        store.toggle(store.showThumbnailsKey)
        applyShowThumbnails(store.get(store.showThumbnailsKey))
      })

      const $showBigPlayer = document.getElementById('show-big-player')
      store.get(store.showBigPlayerKey) ? $showBigPlayer.setAttribute('checked', 'true') : $showBigPlayer.removeAttribute('checked')

      $showBigPlayer.addEventListener('click', (event) => {
        store.toggle(store.showBigPlayerKey)
        applyShowBigPlayer(store.get(store.showBigPlayerKey))
      })

      const $showOriginalThumbnail = document.getElementById('show-original-thumbnail')
      store.get(store.showOriginalThumbnailKey) ? $showOriginalThumbnail.setAttribute('checked', 'true') : $showOriginalThumbnail.removeAttribute('checked')

      $showOriginalThumbnail.addEventListener('click', (event) => {
        store.toggle(store.showOriginalThumbnailKey)
      })

      const $useTLDWTube = document.getElementById('use-tldw-tube')
      store.get(store.useTLDWTubeKey) ? $useTLDWTube.setAttribute('checked', 'true') : $useTLDWTube.removeAttribute('checked')

      $useTLDWTube.addEventListener('click', (event) => {
        store.toggle(store.useTLDWTubeKey)
      })

      const $showCaptions = document.getElementById('show-captions')
      store.get(store.showCaptionsKey) ? $showCaptions.setAttribute('checked', 'true') : $showCaptions.removeAttribute('checked')

      $showCaptions.addEventListener('click', (event) => {
        store.toggle(store.showCaptionsKey)
      })
    }
  },
  '/404': {
    template: document.getElementById('not-found-template'),
    async initialize () {
      document.querySelector('search-videos #search').setAttribute('disabled', 'disabled')
      document.querySelector('search-videos').classList.add('hide')
      window.alert(window.location.pathname + ' not found')
    }
  }
}

handleRoute()
window.addEventListener('popstate', handleRoute)
document.querySelectorAll('[href="/"],[href="/settings"]').forEach(($el) => {
  $el.addEventListener('click', (event) => {
    event.preventDefault()
    const path = new URL($el.href, location.origin).pathname
    history.pushState({}, '', path)
    const popStateEvent = new PopStateEvent('popstate', {})
    dispatchEvent(popStateEvent)
  })
})

function handleRoute () {
  let route = location.pathname
  if (route === '/index.html') route = '/'
  if (routes[route]) {
    document.querySelector('main').replaceChildren(routes[route].template.content.cloneNode(true))
    routes[route].initialize && routes[route].initialize()
  } else {
    document.querySelector('main').replaceChildren(routes['/404'].template.content.cloneNode(true))
    routes['/404'].initialize && routes['/404'].initialize()
  }
}

function handleEmptyState () {
  if (document.querySelectorAll('video-element').length === 0) {
    document.querySelector('empty-state').style.display = ''
  } else {
    document.querySelector('empty-state').style.display = 'none'
  }
}
