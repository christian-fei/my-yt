import { addClickListener, removeClickListener } from "/lib/utils.js";
class ChannelsList extends HTMLElement {
  // This is the constructor for the ChannelsList class.
  constructor() {
    super();
    this.channels = [];
  }
  // This function is called when the element is connected to the DOM.
  connectedCallback() {
    this.render();
  }
  // This function is called when the element is disconnected from the DOM.
  disconnectedCallback() {
    this.unregisterEvents();
  }
  // This function returns the list of observed attributes.
  static get observedAttributes() {
    return ["data-list"];
  }

  // This function is called when an observed attribute changes.
  attributeChangedCallback(name, _, newValue) {
    if (name === "data-list") {
      this.channels = JSON.parse(this.dataset["list"]);
      this.render();
    }
  }

  // This function renders the HTML for the channels list.
  render() {
    if (this.channels.length === 0) this.classList.add("hide");
    else this.classList.remove("hide");
    this.unregisterEvents();

    this.innerHTML = /*html*/ `
      <details class="channels-container">
        <summary>Channels</summary>
        <div>${this.channels
          .map(
            (channel) =>
              /*html*/ `<span tabindex=0 data-channel="${channel}" class="channel">${channel}</span>`
          )
          .join("")}</div>
      </details>
    `;

    this.registerEvents();
  }
  // This function registers the event listeners for the channels.
  registerEvents() {
    const channels = this.querySelectorAll(".channel");
    channels.forEach((channel) =>
      addClickListener(channel, this.channelClick.bind(this))
    );
  }
  // This function unregisters the event listeners for the channels.
  unregisterEvents() {
    const channels = this.querySelectorAll(".channel");
    channels.forEach((channel) =>
      removeClickListener(channel, this.channelClick.bind(this))
    );
  }
  // This function handles the click event for a channel.
  channelClick(event) {
    const $searchInput = document.querySelector("#search");
    if (!$searchInput) return;
    const channel = `@${event.target.innerText}`;

    const channels = this.querySelectorAll(".channel");
    if ($searchInput.value === channel) {
      $searchInput.value = "";
      event.target.classList.remove("active");
    } else {
      $searchInput.value = channel;
      channels.forEach((c) => c.classList.remove("active"));
      event.target.classList.add("active");
    }
    $searchInput.dispatchEvent(new Event("input"));
    setTimeout(
      () => document.body.scrollIntoView({ top: 0, behavior: "smooth" }),
      10
    );
  }
}
customElements.define("channels-list", ChannelsList);
