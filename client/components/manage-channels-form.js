import { addClickListener, removeClickListener } from "/lib/utils.js";
class ManageChannelsForm extends HTMLElement {
  // This is the constructor for the ManageChannelsForm class.
  constructor() {
    super();
  }
  // This function is called when the element is connected to the DOM.
  connectedCallback() {
    this.render();
    this.fetchData();
  }
  // This function is called when the element is disconnected from the DOM.
  disconnectedCallback() {
    this.unregisterEvents();
  }
  // This function fetches the channels data from the API.
  fetchData() {
    fetch("/api/channels")
      .then((res) => res.json())
      .then((channels) => {
        const $container = this.querySelector("#manage-channels");
        $container.innerHTML = /*html*/ `
        ${channels
          .map(
            (channel) =>
              /*html*/ `<div style="margin-bottom: 10px" tabindex=0 data-channel="${channel.name}" class="channel">❌ ${channel.name}</div>`
          )
          .join("")}
      `;
      })
      .then(this.registerEvents.bind(this));
  }
  // This function registers the event listeners for the manage channels form.
  registerEvents() {
    this.querySelectorAll("[data-channel]").forEach(($channel) =>
      addClickListener($channel, this.removeChannel.bind(this))
    );
  }
  // This function unregisters the event listeners for the manage channels form.
  unregisterEvents() {
    this.querySelectorAll("[data-channel]").forEach(($channel) =>
      removeClickListener($channel, this.removeChannel.bind(this))
    );
  }
  // This function renders the HTML for the manage channels form.
  render() {
    this.innerHTML = /*html*/ `
      <details>
        <summary>Manage channels</summary>
        <br>
        <div class="flex space-between" style="flex-flow: wrap;" id="manage-channels"></div>
      </details>
    `;
  }

  // This function handles removing a channel.
  removeChannel(event) {
    event.preventDefault();

    const $channel = event.target;
    const channelName = $channel.dataset["channel"];
    if (!channelName) return alert("empty channel name");
    if (!confirm(`Do you want to delete the channel ${channelName}?`)) return;

    fetch("/api/channels", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: channelName }),
    })
      .then(() => {
        $channel.remove();
      })
      .catch((error) => {
        console.error("Error deleting channel:", error);
        status.innerText = `There was an error deleting the channel ${channelName}, please check your application logs`;
      });
  }
}
customElements.define("manage-channels-form", ManageChannelsForm);
