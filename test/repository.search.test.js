import os from 'os'
import path from 'path'
import { test, describe } from 'node:test'
import fs from 'fs'
import assert from 'assert'
import { initRepository, resetForTesting } from '../server/service-container.js'

const testDir = path.join(os.tmpdir(), 'my-yt-repo-search-test')
let repo

test.beforeEach(() => {
  resetForTesting(testDir)
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true })
  }
  repo = initRepository(testDir)
})

test.afterEach(() => {
  resetForTesting(testDir)
})

const video1 = { id: '12345', channelName: 'tester', title: 'The Code', description: 'some description in common' }
const video2 = { id: '67890', channelName: 'programmer', title: 'The Error', description: 'some description' }

describe('search', () => {
  test('searches videos by title', async () => {
    repo.upsertVideos([video1, video2])
    const results = await repo.getVideos({ filter: 'The Error' })
    assert.equal(results.length, 1)
    assert.deepEqual(results, [video2])
  })

  test('searches videos by channel name', async () => {
    repo.upsertVideos([video1, video2])
    const results = await repo.getVideos({ filter: '@tester' })
    assert.equal(results.length, 1)
    assert.deepEqual(results, [video1])
  })

  test('searches videos by description', async () => {
    repo.upsertVideos([video1, video2])
    const results = await repo.getVideos({ filter: 'some description' })
    assert.equal(results.length, 2)
  })
})
