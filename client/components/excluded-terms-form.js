class ExcludedTermsForm extends HTMLElement {
  // This is the constructor for the ExcludedTermsForm class.
  constructor() {
    super();
  }
  // This function is called when the element is connected to the DOM.
  connectedCallback() {
    this.render();
    this.registerEvents();

    this.fetchExcludedTermsHandler();
  }
  // This function is called when the element is disconnected from the DOM.
  disconnectedCallback() {
    this.unregisterEvents();
  }
  // This function registers the event listeners for the excluded terms form.
  registerEvents() {
    this.querySelector("#add-excluded-term").addEventListener(
      "keyup",
      this.addExcludedTermHandler.bind(this)
    );
  }
  // This function unregisters the event listeners for the excluded terms form.
  unregisterEvents() {
    this.querySelector("#add-excluded-term").removeEventListener(
      "keyup",
      this.addExcludedTermHandler.bind(this)
    );
  }
  // This function renders the HTML for the excluded terms form.
  render() {
    this.innerHTML = /*html*/ `
      <div>
        <div class="flex space-between">
          <div>
            Excluded terms
          </div>
          <div id="excluded-terms">None currently</div>
        </div>
        <br>
        <div class="flex space-between">
          <label for="add-excluded-term">
            Add more terms to exclude
          </label>
          <input type="text" id="add-excluded-term" placeholder="Add excluded term" required />
        </div>
      </div>
    `;
  }

  // This function handles adding an excluded term.
  addExcludedTermHandler(event) {
    event.preventDefault();
    const term = event.target.value.trim();
    if (event.key === "Enter" && term) {
      fetch("/api/excluded-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      })
        .then(() => {
          event.target.value = "";
        })
        .catch(console.error)
        .finally(this.fetchExcludedTermsHandler.bind(this));
    }
  }
  // This function fetches the excluded terms.
  fetchExcludedTermsHandler() {
    fetch("/api/excluded-terms")
      .then((response) => response.json())
      .then((data) => {
        const $excludedTerms = this.querySelector("#excluded-terms");
        if (!$excludedTerms) return console.warn("missing #excluded-terms");
        if (data.length > 0) $excludedTerms.innerHTML = "";
        data.forEach((term) => {
          const $li = document.createElement("li");
          $li.textContent = term;
          $excludedTerms.appendChild($li);
          $li.addEventListener("click", () => {
            if (!confirm('Remove "' + term + '" from excluded terms?')) return;
            fetch(`/api/excluded-terms`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ term }),
            })
              .then(() => $li.remove())
              .catch((error) => {
                console.error(error);
              });
          });
        });
      });
  }
}
customElements.define("excluded-terms-form", ExcludedTermsForm);
