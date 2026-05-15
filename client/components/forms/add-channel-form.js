/* global HTMLElement, customElements, alert */
import { ENDPOINTS } from '../../lib/api.js'

class AddChannelForm extends HTMLElement {
  connectedCallback () {
    this.render()
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  registerEvents () {
    this.querySelector('form').addEventListener('submit', this.addChannelHandler.bind(this))
  }

  unregisterEvents () {
    this.querySelector('form').removeEventListener('submit', this.addChannelHandler.bind(this))
  }

  render () {
    this.innerHTML = /* html */`
      <form id="add-channel-form">
        <div class="flex space-between">
          <label for="channel-name">Add a new channel</label>
          <input type="text" id="channel-name" placeholder="Channel Name" required>
          <button type="submit">Add Channel<span class="loader"></span></button>
        </div>
        <div class="status"></div>
      </form>
    `

    this.registerEvents()
  }

  addChannelHandler (event) {
    event.preventDefault()

    const form = event.target
    const input = form.querySelector('input')
    const loader = form.querySelector('.loader')
    const status = form.querySelector('.status')

    const channelName = document.getElementById('channel-name').value
    if (!channelName) return alert('empty channel name')

    freezeForm()

    fetch(ENDPOINTS.CHANNELS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: channelName })
    })
      .then(res => res.text())
      .then((text) => {
        form.reset()
        status.innerText = text // `Successfully added ${channelName}`
      })
      .catch(error => {
        console.error('Error adding channel:', error)
        status.innerText = `There was an error adding the channel ${channelName}, please check your application logs`
      })
      .finally(unfreezeForm)

    function freezeForm () {
      input.disabled = true
      loader.classList.add('show')
    }
    function unfreezeForm () {
      input.disabled = false
      loader.classList.remove('show')
    }
  }
}
customElements.define('add-channel-form', AddChannelForm)
