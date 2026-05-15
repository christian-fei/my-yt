import { test } from 'node:test'
import assert from 'assert'
import { getVideosFor, getVideo } from '../lib/youtube.js'
import { updateAndPersistVideosForChannel } from '../lib/update-videos.js'
import { ScraperError } from '../lib/scraper-errors.js'

test('throws structured error when HTML has no ytInitialData', async () => {
  const originalFetch = global.fetch
  global.fetch = () => Promise.resolve({
    ok: true,
    text: () => Promise.resolve('<html><body>no script tag here</body></html>')
  })

  try {
    await getVideosFor('test_channel')
    assert.fail('Should have thrown ScraperError')
  } catch (error) {
    assert.ok(error instanceof ScraperError, 'Should be a ScraperError')
    assert.strictEqual(error.name, 'ScraperError')
    assert.ok(error.message.includes('YouTube HTML structure changed'))
    assert.strictEqual(error.context.channel, 'test_channel')
  } finally {
    global.fetch = originalFetch
  }
})

test('throws structured error on HTTP failure', async () => {
  const originalFetch = global.fetch
  global.fetch = () => Promise.resolve({
    ok: false,
    status: 404,
    text: () => Promise.resolve('Not Found')
  })

  try {
    await getVideosFor('nonexistent_channel_xyz123')
    assert.fail('Should have thrown ScraperError')
  } catch (error) {
    assert.ok(error instanceof ScraperError, 'Should be a ScraperError')
    assert.strictEqual(error.context.statusCode, 404)
    assert.strictEqual(error.context.channel, 'nonexistent_channel_xyz123')
  } finally {
    global.fetch = originalFetch
  }
})

test('throws structured error on HTTP 500', async () => {
  const originalFetch = global.fetch
  global.fetch = () => Promise.resolve({
    ok: false,
    status: 500,
    text: () => Promise.resolve('Internal Server Error')
  })

  try {
    await getVideosFor('any_channel')
    assert.fail('Should have thrown ScraperError')
  } catch (error) {
    assert.ok(error instanceof ScraperError, 'Should be a ScraperError')
    assert.strictEqual(error.context.statusCode, 500)
  } finally {
    global.fetch = originalFetch
  }
})

test('throws structured error when channel has no Videos tab', async () => {
  // When the HTML structure is valid enough to parse, but lacks a "Videos" tab,
  // the scraper should throw with structured context.
  const mockHtml = '<html><body><script>var ytInitialData = {"broken": true};</script></body></html>'
  const originalFetch = global.fetch
  global.fetch = () => Promise.resolve({
    ok: true,
    text: () => Promise.resolve(mockHtml)
  })

  try {
    await getVideosFor('shorts_only_channel')
    assert.fail('Should have thrown ScraperError')
  } catch (error) {
    assert.ok(error instanceof ScraperError, 'Should be a ScraperError')
  } finally {
    global.fetch = originalFetch
  }
})

test('updateAndPersistVideosForChannel reports error via callback on ScraperError', async () => {
  const originalFetch = global.fetch

  // Track callback calls
  const callbackCalls = []
  const mockCallback = (...args) => { callbackCalls.push(args) }

  // Make scraper throw a ScraperError (HTML structure change)
  global.fetch = () => Promise.resolve({
    ok: true,
    text: () => Promise.resolve('<html><body>no data</body></html>')
  })

  // Use a module-level variable to allow test-time override of getRepository
  const { setRepositoryOverride, resetRepositoryOverride } = await import('../server/service-container.js')
  const mockRepo = {
    getChannels: () => [],
    patchVideo: (v) => v,
    upsertVideos: () => {},
    filterByExcludedTerms: (v) => true
  }

  setRepositoryOverride(mockRepo)

  try {
    await updateAndPersistVideosForChannel('failing_channel', mockCallback)

    // The callback should have been called with an error event
    const errorCall = callbackCalls.find(call => call[1] && call[1].type === 'update-error')
    assert.ok(errorCall, 'Callback should report update-error for ScraperError')
    assert.strictEqual(errorCall[1].channel, 'failing_channel')
  } finally {
    global.fetch = originalFetch
    resetRepositoryOverride()
  }
})

test('ScraperError has structured context', () => {
  const error = new ScraperError('test message', { channel: 'ch1', statusCode: 502 })
  assert.strictEqual(error.name, 'ScraperError')
  assert.strictEqual(error.message, 'test message')
  assert.deepStrictEqual(error.context, { channel: 'ch1', statusCode: 502 })
})

test('getVideo still returns null on failure (not throwing)', async () => {
  // getVideo should NOT be affected — it catches and returns null for yt-dlp failures
  const result = await getVideo('invalid_video_id_that_does_not_exist_12345')
  assert.strictEqual(result, null)
})
