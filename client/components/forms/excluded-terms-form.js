/* global HTMLElement, customElements, confirm */
import { ENDPOINTS } from '../../lib/api.js'

class ExcludedTermsForm extends HTMLElement {
  connectedCallback () {
    this.render()
    this.registerEvents()

    this.fetchExcludedTermsHandler()
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  registerEvents () {
    this.querySelector('#add-excluded-term').addEventListener('keyup', this.addExcludedTermHandler.bind(this))
  }

  unregisterEvents () {
    this.querySelector('#add-excluded-term').removeEventListener('keyup', this.addExcludedTermHandler.bind(this))
  }

  render () {
    this.innerHTML = /* html */`
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
    `
  }

  addExcludedTermHandler (event) {
    event.preventDefault()
    const term = event.target.value.trim()
    if (event.key === 'Enter' && term) {
      fetch(ENDPOINTS.EXCLUDED_TERMS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term })
      })
        .then(() => {
          event.target.value = ''
        })
        .catch(console.error)
        .finally(this.fetchExcludedTermsHandler.bind(this))
    }
  }

  fetchExcludedTermsHandler () {
    fetch(ENDPOINTS.EXCLUDED_TERMS)
      .then(response => response.json())
      .then(data => {
        const $excludedTerms = this.querySelector('#excluded-terms')
        if (!$excludedTerms) return console.warn('missing #excluded-terms')
        if (data.length > 0) $excludedTerms.innerHTML = ''
        data.forEach(term => {
          const $li = document.createElement('li')
          $li.textContent = term
          $excludedTerms.appendChild($li)
          $li.addEventListener('click', () => {
            if (!confirm('Remove "' + term + '" from excluded terms?')) return
            fetch(ENDPOINTS.EXCLUDED_TERMS, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ term })
            })
              .then(() => $li.remove())
              .catch(error => {
                console.error(error)
              })
          })
        })
      })
  }
}
customElements.define('excluded-terms-form', ExcludedTermsForm)
