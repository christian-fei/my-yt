import os from 'os'
import path from 'path'
import { test } from 'node:test'
import fs from 'fs'
import assert from 'assert'
import { searchVideosHandler } from '../server/router/index.js'
import { initRepository, resetForTesting } from '../server/service-container.js'

const testDir = path.join(os.tmpdir(), 'my-yt-search-test')
const req = {}
const assertRes = (assertionCb) => ({
  writeHead: () => {},
  end: assertionCb
})

test.beforeEach(() => {
  resetForTesting(testDir)
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true })
  }

  initRepository(testDir).upsertVideos([
    {
      id: '1',
      channelName: 'SomeChannel',
      title: 'A video title',
      description: 'Wow nice description',
      downloaded: true,
      ignored: false,
      summary: 'some summary'
    },
    {
      id: '2',
      channelName: 'AnotherChannel',
      title: 'Another video title',
      description: 'What, another nice description',
      downloaded: false,
      ignored: true,
      summary: 'some summary'
    },
    {
      id: '3',
      channelName: 'AnotherChannel',
      title: 'WOW Another video title',
      description: "What, another nice description, that's cool",
      downloaded: true,
      ignored: true,
      summary: 'some summary'
    }
  ])
})

test.afterEach(() => {
  resetForTesting(testDir)
})

test('gets all videos without filters, show only not ignored videos', () => {
  searchVideosHandler(req, assertRes(data => {
    assert.deepEqual(JSON.parse(data).length, 1)
  }))
})

test('filters videos by channel name', () => {
  searchVideosHandler({ url: '?filter=@SomeChannel' }, assertRes(data => {
    assert.deepEqual(JSON.parse(data).length, 1)
  }))
})

test('filters videos by title', () => {
  searchVideosHandler({ url: '?filter=A+video+title' }, assertRes(data => {
    assert.deepEqual(JSON.parse(data).length, 1)
  }))
})
