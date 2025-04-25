class ManageDiskSpaceForm extends HTMLElement {
  // This is the constructor for the ManageDiskSpaceForm class.
  constructor() {
    super();
  }
  // This function is called when the element is connected to the DOM.
  connectedCallback() {
    this.render();
    this.registerEvents();
    this.updateDiskSpaceUsed();
  }
  // This function is called when the element is disconnected from the DOM.
  disconnectedCallback() {
    this.unregisterEvents();
  }
  // This function registers the event listeners for the manage disk space form.
  registerEvents() {
    this.querySelector("#reclaim-disk-space").addEventListener(
      "click",
      this.reclaimDiskSpace.bind(this)
    );
    this.querySelector("#delete-only-ignored").addEventListener(
      "change",
      this.updateDiskSpaceUsed.bind(this)
    );
  }
  // This function unregisters the event listeners for the manage disk space form.
  unregisterEvents() {
    this.querySelector("#reclaim-disk-space").removeEventListener(
      "click",
      this.reclaimDiskSpace.bind(this)
    );
    this.querySelector("#delete-only-ignored").removeEventListener(
      "change",
      this.updateDiskSpaceUsed.bind(this)
    );
  }
  // This function renders the HTML for the manage disk space form.
  render() {
    this.innerHTML = /*html*/ `
      <form>
        <div class="flex space-between">
          <div>
            Delete downloaded videos to reclaim disk space
          </div>
          <div class="user-select-none">
            <label for="delete-only-ignored">
              Only ignored videos
            </label>
            <input type="checkbox" id="delete-only-ignored"/>
            <button id="reclaim-disk-space" type="submit">Delete videos</button>
          </div>
        </div>
        <div><small id="disk-usage"></small></div>
      </form>
    `;
  }

  // This function updates the disk space used.
  updateDiskSpaceUsed() {
    const onlyIgnored = this.querySelector("#delete-only-ignored").checked;
    const $diskUsage = this.querySelector("#disk-usage");
    fetch(onlyIgnored ? "/api/disk-usage?onlyIgnored=true" : "/api/disk-usage")
      .then((response) => response.text())
      .then((diskSpaceUsed) => {
        $diskUsage.innerHTML = /*html*/ `Currently <span id="disk-space-used">${diskSpaceUsed}</span> of disk space used`;
      })
      .catch((err) => console.error(err));
  }

  // This function handles reclaiming disk space.
  reclaimDiskSpace(event) {
    event.preventDefault();
    if (!confirm("About to delete downloaded videos, are you sure?")) return;
    const onlyIgnored = this.querySelector("#delete-only-ignored").checked;
    const $diskUsage = this.querySelector("#disk-usage");
    fetch("/api/reclaim-disk-space", {
      method: "POST",
      body: JSON.stringify({ onlyIgnored }),
    })
      .then(() => {
        $diskUsage.innerText = "Successfully reclaimed disk space";
      })
      .catch((error) => {
        $diskUsage.innerHTML = `Failed to reclaim disk space: <br><pre>${error.message}</pre>`;
      });
  }
}
customElements.define("manage-disk-space-form", ManageDiskSpaceForm);
