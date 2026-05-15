/* global HTMLElement, customElements */
import { ENDPOINTS } from '../../lib/api.js'

class VideoQualityForm extends HTMLElement {
  connectedCallback () {
    this.render()
    this.registerEvents()

    fetch(ENDPOINTS.VIDEO_QUALITY)
      .then(response => response.json())
      .then((videoQuality) => {
        this.querySelector('#video-quality').value = +videoQuality
      })
      .catch(error => console.error('Error:', error))
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  registerEvents () {
    this.querySelector('#video-quality').addEventListener('change', this.setVideoQualityHandler.bind(this))
  }

  unregisterEvents () {
    this.querySelector('#video-quality').removeEventListener('change', this.setVideoQualityHandler.bind(this))
  }

  render () {
    this.innerHTML = /* html */`
      <form>
        <div class="flex space-between">
          <div>
            Video quality
          </div>
          <select name="video-quality" id="video-quality">
            <option value="360">360</option>
            <option value="480">480</option>
            <option value="720">720</option>
            <option value="1080">1080</option>
            <option value="1440">1440</option>
            <option value="2160">2160</option>
          </select>
        </div>
      </form>
    `
  }

  setVideoQualityHandler (event) {
    event.preventDefault()
    fetch(ENDPOINTS.VIDEO_QUALITY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: event.target.value
    })
  }
}
customElements.define('video-quality-form', VideoQualityForm)
