/* global localStorage */
export default class Store {
  showThumbnailsKey = 'showThumbnails'
  showBigPlayerKey = 'showBigPlayer'
  showOriginalThumbnailKey = 'showOriginalThumbnail'
  showCaptionsKey = 'showCaptions'
  useTLDWTubeKey = 'useTLDWTube'
  lastVideosKey = 'lastVideos'
  ignoreTermsKey = 'ignoreTerms'

  constructor () {
    if (!localStorage.getItem(this.showThumbnailsKey)) localStorage.setItem(this.showThumbnailsKey, 'true')
    if (!localStorage.getItem(this.showBigPlayerKey)) localStorage.setItem(this.showBigPlayerKey, 'true')
    if (!localStorage.getItem(this.showOriginalThumbnailKey)) localStorage.setItem(this.showOriginalThumbnailKey, 'false')
    if (!localStorage.getItem(this.showCaptionsKey)) localStorage.setItem(this.showCaptionsKey, 'true')
    if (!localStorage.getItem(this.useTLDWTubeKey)) localStorage.setItem(this.useTLDWTubeKey, 'false')
    if (!localStorage.getItem(this.lastVideosKey)) localStorage.setItem(this.lastVideosKey, '{}')
    if (!localStorage.getItem(this.ignoreTermsKey)) localStorage.setItem(this.ignoreTermsKey, '[]')
  }

  toggle (key) {
    if (![this.showThumbnailsKey, this.showBigPlayerKey, this.showOriginalThumbnailKey, this.showCaptionsKey, this.useTLDWTubeKey].includes(key)) return console.error('invalid key', key)
    localStorage.setItem(key, localStorage.getItem(key) === 'true' ? 'false' : 'true')
  }

  get (key) {
    if (![this.showThumbnailsKey, this.showBigPlayerKey, this.showOriginalThumbnailKey, this.showCaptionsKey, this.useTLDWTubeKey, this.lastVideosKey, this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    return JSON.parse(localStorage.getItem(key))
  }

  set (key, value) {
    if (typeof value === 'string') {
      localStorage.setItem(key, value)
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  }

  push (key, item) {
    if (![this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    const list = this.get(key)
    list.push(item)
    this.set(key, list)
    return item
  }

  remove (key, item) {
    if (![this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    let list = this.get(key)
    list = list.filter(i => i !== item)
    this.set(key, list)
    return item
  }

  includes (key, item) {
    if (![this.ignoreTermsKey].includes(key)) return console.error('invalid key', key)
    const list = this.get(key)
    return list.includes(item)
  }
}
