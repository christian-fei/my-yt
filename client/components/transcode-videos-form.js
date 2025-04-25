class TranscodeVideosForm extends HTMLElement {
  // This is the constructor for the TranscodeVideosForm class.
  constructor() {
    super();
  }
  // This function is called when the element is connected to the DOM.
  connectedCallback() {
    this.render();
    this.registerEvents();

    fetch("/api/transcode-videos")
      .then((response) => response.json())
      .then((transcodeVideos) => {
        this.querySelector("#transcode-videos").checked = transcodeVideos;
      })
      .catch((error) => console.error("Error:", error));
  }
  // This function is called when the element is disconnected from the DOM.
  disconnectedCallback() {
    this.unregisterEvents();
  }
  // This function registers the event listeners for the transcode videos form.
  registerEvents() {
    this.querySelector("#transcode-videos").addEventListener(
      "change",
      this.setTranscodeVideosHandler.bind(this)
    );
  }
  // This function unregisters the event listeners for the transcode videos form.
  unregisterEvents() {
    this.querySelector("#transcode-videos").removeEventListener(
      "change",
      this.setTranscodeVideosHandler.bind(this)
    );
  }
  // This function renders the HTML for the transcode videos form.
  render() {
    this.innerHTML = /*html*/ `
      <form>
        <div class="flex space-between">
          <div>
            <label for="transcode-videos">Transcode videos to h264</label>
          </div>
          <input type="checkbox" id="transcode-videos"/>
        </div>
        <div><small>Maximize compatibility across devices</small></div>
        <div><small>The download of videos will be slower, transcoding is quite resource intensive</small></div>
      </form>
    `;
  }

  // This function handles setting the transcode videos option.
  setTranscodeVideosHandler(event) {
    event.preventDefault();
    fetch("/api/transcode-videos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event.target.checked),
    });
  }
}
customElements.define("transcode-videos-form", TranscodeVideosForm);
