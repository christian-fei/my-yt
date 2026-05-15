/* global HTMLElement, customElements, alert, confirm */
import { addClickListener, removeClickListener } from '../../lib/utils.js'
import { ENDPOINTS } from '../../lib/api.js'
class ManageChannelsForm extends HTMLElement {
  connectedCallback () {
    this.render()
    this.fetchData()
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  fetchData () {
    fetch(ENDPOINTS.CHANNELS)
      .then(res => res.json())
      .then(channels => {
        const $container = this.querySelector('#manage-channels')
        $container.innerHTML = /* html */`
        ${channels.map(channel =>
          /* html */`<div style="margin-bottom: 10px" tabindex=0 data-channel="${channel.name}" class="channel">❌ ${channel.name}</div>`).join('')}
      `
      })
      .then(this.registerEvents.bind(this))
  }

  registerEvents () {
    this.querySelectorAll('[data-channel]')
      .forEach($channel => addClickListener($channel, this.removeChannel.bind(this)))
  }

  unregisterEvents () {
    this.querySelectorAll('[data-channel]')
      .forEach($channel => removeClickListener($channel, this.removeChannel.bind(this)))
  }

  render () {
    this.innerHTML = /* html */`
      <details>
        <summary>Manage channels</summary>
        <br>
        <div class="flex space-between" style="flex-flow: wrap;" id="manage-channels"></div>
      </details>
    `
  }

  removeChannel (event) {
    event.preventDefault()

    const $channel = event.target
    const channelName = $channel.dataset.channel
    if (!channelName) return alert('empty channel name')
    if (!confirm(`Do you want to delete the channel ${channelName}?`)) return

    fetch(ENDPOINTS.CHANNELS, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: channelName })
    })
      .then(() => {
        $channel.remove()
      })
      .catch(error => {
        console.error('Error deleting channel:', error)
        // status.innerText = `There was an error deleting the channel ${channelName}, please check your application logs`
      })
  }
}
customElements.define('manage-channels-form', ManageChannelsForm)
