import { test } from 'node:test'
import fs from 'fs'
import assert from 'assert'
import { searchVideosHandler } from '../server/router/index.js'
import Repository from '../lib/repository.js'

const req = {}
const assertRes = (assertionCb) => ({
  writeHead: () => {},
  end: assertionCb
})

let repo
test.beforeEach(() => {
  if (fs.existsSync('./test/data')) {
    fs.rmSync('./test/data', { recursive: true })
  }
  repo = new Repository('./test/data')
  repo.upsertVideos([
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
test('gets all videos without filters, show only not ignored videos', () => {
  searchVideosHandler(req, assertRes(data => {
    assert.deepEqual(JSON.parse(data).length, 1)
  }), repo)
})
test('filters videos by channel name', () => {
  searchVideosHandler({ url: '?filter=@SomeChannel' }, assertRes(data => {
    assert.deepEqual(JSON.parse(data).length, 1)
  }), repo)
})
test('filters videos by title', () => {
  searchVideosHandler({ url: '?filter=A+video+title' }, assertRes(data => {
    assert.deepEqual(JSON.parse(data).length, 1)
  }), repo)
})
