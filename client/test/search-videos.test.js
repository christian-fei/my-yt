/* global describe, it */
import sinon from 'sinon'
import { fixture, html, assert } from '@open-wc/testing'

import '../components/search-videos.js'
import { ENDPOINTS } from '../lib/api.js'

describe('search-videos', () => {
  it('makes HTTP request to API with search term', async () => {
    const el = await fixture(html`
      <search-videos></search-videos>
    `)

    const fetchStub = sinon.stub(window, 'fetch')
    window.fetch.resolves({ json: () => Promise.resolve([]) })

    const $search = el.querySelector('[type="search"]')

    $search.value = 'test'
    $search.dispatchEvent(new Event('input'))

    assert.equal(fetchStub.callCount, 1)
    assert.equal(fetchStub.args[0][0], ENDPOINTS.VIDEOS + '?filter=test')
  })
})
