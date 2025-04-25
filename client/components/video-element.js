import { addClickListener, removeClickListener } from "/lib/utils.js";
import Store from "/lib/store.js";
import { addToast } from "/lib/utils.js";
const store = new Store();

class VideoElement extends HTMLElement {
  // This is the constructor for the VideoElement class.
  constructor() {
    super();
    this.downloadStartedText = "⚡️ Downloading..";
    this.summaryStartedText = "⚡️ Summarizing..";
  }

  // This function is called when the element is connected to the DOM.
  connectedCallback() {
    this.video = JSON.parse(this.dataset["data"]);
    this.render();
  }
  // This function is called when the element is disconnected from the DOM.
  disconnectedCallback() {
    this.unregisterEvents();
  }
  // This function returns the list of observed attributes.
  static get observedAttributes() {
    return ["data-data", "data-summarizing", "data-downloading"];
  }

  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  // This function is called when an observed attribute changes.
  attributeChangedCallback(name, _, newValue) {
    if (name === "data-data") {
      this.video = JSON.parse(this.dataset["data"]);
      this.render();
    }
    if (name === "data-downloading" && this.querySelector(".action.download")) {
      this.querySelector(".action.download").innerText =
        this.downloadStartedText;
    }
    if (
      name === "data-summarizing" &&
      this.querySelector(".action.summarize")
    ) {
      this.querySelector(".action.summarize").innerText =
        this.summaryStartedText;
    }
  }
  render() {
    if (!this.video) return;

    this.unregisterEvents();

    this.classList.add("video");
    this.dataset["videoId"] = this.video.id;
    this.dataset["date"] = this.video.publishedAt;
    this.dataset["summarized"] = this.video.summary ? "true" : "false";
    this.dataset["downloaded"] = this.video.downloaded ? "true" : "false";
    this.dataset["ignored"] = this.video.ignored ? "true" : "false";

    this.innerHTML = /*html*/ `
      ${
        this.video.downloaded
          ? /*html*/ `
        <div class="video-wrapper">
          <div class="play video-placeholder" style="background-image: url(${
            this.video.thumbnail
          })">
            <div class="play-icon"></div>
            <span class="info-duration">${this.video.duration || "N/A"}</span>
          </div>
        </div>
        `
          : /*html*/ `
        <div class="video-wrapper">
          <img title="${this.video.title}" loading="lazy" src="${
              this.video.thumbnail
            }"/>
          <span class="info-duration">${this.video.duration || "N/A"}</span>
        </div>
      `
      }
      <span class="action ignore" tabindex="0">${
        this.video.ignored ? "unignore" : "ignore"
      }</span>
      <h4 class="title">${this.video.title}</h4>
      <div class="info">
        <span class="channel-name">${this.video.channelName}</span>
        <div class="flex">
          <span>${this.video.viewCount}</span>
          <span>${tryFormatDate(this.video.publishedAt)}</span>
        </div>
      </div>
      <div class="actions flex">
        ${
          this.video.downloaded
            ? /*html*/ `<span tabindex="0"  class="action delete" data-video-id="${this.video.id}">🗑️ Delete</span>`
            : /*html*/ `<span tabindex="0"  class="action download" data-video-id="${this.video.id}">⬇️ Download</span>`
        }
        ${
          store.get(store.useTLDWTubeKey)
            ? /*html*/ `<a target="_blank" href="https://tldw.tube/?v=${this.video.id}">📖 tldw.tube</a>`
            : !this.video.summary
            ? /*html*/ `<span tabindex="0"  class="action summarize" data-video-id="${this.video.id}">📖 Summarize</span>`
            : /*html*/ `<span tabindex="0"  class="action show-summary" data-video-id="${this.video.id}">📖 Summary</span>`
        }
        <a href="https://www.youtube.com/watch?v=${
          this.video.id
        }" class="action open-externally" target="_blank">📺 external</a>
      </div>
    `;

    if (
      window.state &&
      window.state.downloading &&
      window.state.downloading[this.video.id]
    ) {
      this.dataset["downloading"] = "true";
    }
    if (
      window.state &&
      window.state.summarizing &&
      window.state.summarizing[this.video.id]
    ) {
      this.dataset["summarizing"] = "true";
    }

    this.registerEvents();
  }
  registerEvents() {
    addClickListener(
      this.querySelector(".action.download"),
      this.downloadVideoHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".action.delete"),
      this.deleteVideoHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".action.summarize"),
      this.summarizeVideoHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".action.show-summary"),
      this.showSummaryHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".action.ignore"),
      this.toggleIgnoreVideoHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".action.open-externally"),
      this.openExternallyHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".channel-name"),
      this.filterByChannelHandler.bind(this)
    );
    addClickListener(
      this.querySelector(".play.video-placeholder"),
      this.watchVideoHandler.bind(this)
    );
  }
  unregisterEvents() {
    removeClickListener(
      this.querySelector(".action.download"),
      this.downloadVideoHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".action.delete"),
      this.deleteVideoHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".action.summarize"),
      this.summarizeVideoHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".action.show-summary"),
      this.showSummaryHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".action.ignore"),
      this.toggleIgnoreVideoHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".action.open-externally"),
      this.openExternallyHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".channel-name"),
      this.filterByChannelHandler.bind(this)
    );
    removeClickListener(
      this.querySelector(".play.video-placeholder"),
      this.watchVideoHandler.bind(this)
    );
    this.querySelector("video") &&
      this.unregisterVideoEvents(this.querySelector("video"));
  }
  watchVideoHandler(event) {
    event.preventDefault();
    this.querySelector(".play.video-placeholder").outerHTML = /*html*/ `
    <video controls playsinline style="user-select: none; width: 400px; width: -webkit-fill-available;">
      <source src="/api/videos/${this.video.id}.${
      this.video.format || "mp4"
    }" type="video/${this.video.format || "mp4"}" />
      ${
        store.get(store.showCaptionsKey)
          ? /*html*/ `
        <track default kind="captions" srclang="en" src="/api/captions/${this.video.id}" />
      `
          : ""
      }
      <p>
        Your browser does not support the video tag.
        Download the video instead <a href="/api/videos/${
          this.video.id
        }" target="_blank">here</a>
      </p>
    </video>`;

    this.querySelector("video").play();
    this.registerVideoEvents(this.querySelector("video"));
  }
  downloadVideoHandler(event) {
    event.preventDefault();

    if (this.dataset["downloading"] === "true") return;
    this.dataset["downloading"] = "true";

    let $downloadButton = event.target.classList.contains(".action")
      ? event.target
      : this.querySelector(".action.download");
    $downloadButton.innerText = this.downloadStartedText;

    addToast("Downloading video...");

    fetch("/api/download-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: this.video.id }),
    }).catch((error) => console.error("Error starting download:", error));
  }
  deleteVideoHandler(event) {
    event.preventDefault();
    if (!confirm("About to delete video files, are you sure?")) return;
    fetch("/api/delete-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: this.video.id }),
    })
      .then(() => {
        this.video.downloaded = false;
        this.classList.remove("downloading");
        this.classList.remove("big");
        this.querySelector("video") &&
          this.unregisterVideoEvents(this.querySelector("video"));
        this.render();
      })
      .catch((error) => console.error("Error deleting video:", error));
  }
  summarizeVideoHandler(event) {
    event.preventDefault();

    if (this.dataset["summarizing"] === "true") return;
    this.dataset["summarizing"] = "true";

    event.target.innerText = this.summaryStartedText;

    addToast("Summarizing video...");

    fetch("/api/summarize-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: this.video.id }),
    }).catch((error) => console.error("Error starting summary:", error));
  }
  showSummaryHandler(event) {
    event.preventDefault();
    const video = this.video;
    if (video) {
      document.querySelector("dialog#summary").showModal();
      document.querySelector("dialog#summary div").innerHTML = /*html*/ `
      <pre>${video.summary}</pre>
      <details>
        <summary>transcript</summary>
        <pre>${video.transcript}</pre>
      </details>
      `;
    }
  }
  toggleIgnoreVideoHandler(event) {
    event.preventDefault();

    fetch("/api/ignore-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: this.video.id }),
    })
      .then(() => this.remove())
      .catch((error) => {
        console.error("Error ignoring video:", error);
        this.classList.remove("hide");
        this.render();
      });
  }
  openExternallyHandler(event) {
    this.querySelector("video") && this.querySelector("video").pause();
  }
  filterByChannelHandler(event) {
    const $searchInput = document.querySelector("#search");
    const channel = `@${this.video.channelName}`;
    $searchInput.value =
      $searchInput && $searchInput.value !== channel ? channel : "";
    $searchInput.dispatchEvent(new Event("input"));
  }
  registerVideoEvents(video) {
    video.addEventListener("play", () => {
      this.classList.add("big");
      setTimeout(
        this.scrollIntoViewWithOffset.bind(
          this,
          document.querySelector("body > header").clientHeight,
          "smooth"
        ),
        110
      );
      this.pauseOtherVideos(video);
    });
  }
  unregisterVideoEvents(video) {
    video.removeEventListener("play", this.pauseOtherVideos.bind(this, video));
  }
  pauseOtherVideos(video) {
    document.querySelectorAll("video").forEach((v) => {
      if (v !== video) {
        v.pause();
        v.parentElement.classList.remove("big");
      }
    });
  }

  scrollIntoViewWithOffset(offset, behavior = "smooth") {
    const top =
      this.getBoundingClientRect().top -
      offset -
      document.body.getBoundingClientRect().top;
    scrollTo({ top, behavior });
  }
}

customElements.define("video-element", VideoElement);

function tryFormatDate(date) {
  try {
    return new Intl.DateTimeFormat(navigator.language, {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    }).format(new Date(date));
  } catch (err) {
    return (date || "").substring(0, 10);
  }
}
