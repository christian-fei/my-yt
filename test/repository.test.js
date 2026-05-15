import os from 'os'
import path from 'path'
import { test, describe } from 'node:test'
import fs from 'fs'
import assert from 'assert'
import { initRepository, resetForTesting } from '../server/service-container.js'

const testDir = path.join(os.tmpdir(), 'my-yt-repo-test')
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

describe('repository', () => {
  test('empty repo provisions data folder', () => {
    assert.ok(repo)
    assert.equal(repo.paths.videos, `${testDir}/videos.json`)
    assert.equal(repo.paths.channels, `${testDir}/channels.json`)
    assert.equal(repo.getVideos().length, 0)
    assert.ok(fs.existsSync(repo.paths.videos))
    assert.ok(fs.existsSync(repo.paths.channels))
  })

  test('adds channel', () => {
    repo.addChannel('veritasium')
    assert.equal(repo.getChannels().length, 1)
    assert.equal(repo.channelExists('veritasium'), true)
  })

  test('delete channel', () => {
    repo.addChannel('veritasium')
    repo.deleteChannel('veritasium')
    assert.equal(repo.getChannels().length, 0)
    assert.equal(repo.channelExists('veritasium'), false)
  })

  test('gets channels', () => {
    repo.addChannel('veritasium')
    const channels = repo.getChannels()
    assert.equal(channels.length, 1)
    assert.equal(channels[0].name, 'veritasium')
  })

  test('upserts videos', () => {
    repo.upsertVideos([video1, video2])
    assert.equal(repo.getVideos().length, 2)
  })

  test('upserts single video', () => {
    repo.upsertVideos(video1)
    assert.equal(repo.getVideos().length, 1)
  })

  test('gets channel videos', () => {
    repo.upsertVideos([video1, video2])
    const videos = repo.getChannelVideos('tester')
    assert.equal(videos.length, 1)
    assert.equal(videos[0].title, 'The Code')
  })

  test('gets single video by id', () => {
    repo.upsertVideos([video1, video2])
    const video = repo.getVideo('12345')
    assert.equal(video.title, 'The Code')
  })

  test('deletes a video by id and sets downloaded true', () => {
    repo.upsertVideos([video1, video2])
    repo.deleteVideo('12345')
    assert.equal(repo.getVideos().length, 2)
    assert.deepEqual(repo.getVideo('12345'), { id: '12345', channelName: 'tester', title: 'The Code', description: 'some description in common', downloaded: false })
  })

  test('set ignored/unignored video', () => {
    repo.upsertVideos([video1, video2])
    repo.ignoreVideo('12345')
    repo.unignoreVideo('67890')
    assert.equal(repo.getVideo('12345').ignored, true)
    assert.equal(repo.getVideo('67890').ignored, false)
  })

  test('marks video as downloaded', () => {
    repo.upsertVideos([video1, video2])
    repo.setVideoDownloaded('12345')
    assert.equal(repo.getVideo('12345').downloaded, true)
  })

  test('sets video transcript', () => {
    repo.upsertVideos([video1, video2])
    repo.setVideoTranscript('12345', 'This is the transcript for The Code')
    assert.equal(repo.getVideo('12345').transcript, 'This is the transcript for The Code')
  })

  test('sets video summary', () => {
    repo.upsertVideos([video1, video2])
    repo.setVideoSummary('12345', 'This is the summary for The Code')
    assert.equal(repo.getVideo('12345').summary, 'This is the summary for The Code')
  })

  test('patches new video with addedAt', () => {
    const patchedVideo = repo.patchVideo(video1)
    assert.ok(patchedVideo.addedAt)
  })

  test('updates single video by id', () => {
    repo.upsertVideos(video1)
    const updatedVideo = repo.updateVideo(video1.id, { title: 'Updated Title' })
    assert.equal(updatedVideo.title, 'Updated Title')
  })

  test('gets video quality', () => {
    assert.equal(repo.getVideoQualitySetting(), 720)
  })

  test('sets video quality', () => {
    assert.ok(repo.setVideoQualitySetting(1080))
    assert.equal(repo.getVideoQualitySetting(), 1080)
  })

  test('gets transcode videos setting', () => {
    assert.equal(repo.getTranscodeVideosSetting(), true)
  })

  test('sets transcode videos setting', () => {
    repo.setTranscodeVideosSetting(false)
    assert.equal(repo.getTranscodeVideosSetting(), false)
    repo.setTranscodeVideosSetting(true)
    assert.equal(repo.getTranscodeVideosSetting(), true)
  })
})

describe('excluded terms', () => {
  test('gets excluded terms', () => {
    assert.deepEqual(repo.getExcludedTerms(), [])
  })

  test('adds excluded term', () => {
    repo.addExcludedTerm('trump')
    assert.deepEqual(repo.getExcludedTerms(), ['trump'])
  })

  test('avoids adding duplicate excluded term', () => {
    repo.addExcludedTerm('trump')
    assert.deepEqual(repo.getExcludedTerms(), ['trump'])
    repo.addExcludedTerm('trump')
    assert.deepEqual(repo.getExcludedTerms(), ['trump'])
  })

  test('removes term', () => {
    repo.addExcludedTerm('trump')
    assert.deepEqual(repo.getExcludedTerms(), ['trump'])
    repo.removeExcludedTerm('trump')
    assert.deepEqual(repo.getExcludedTerms(), [])
  })

  test('returns videos based on excluded terms', async () => {
    repo.addExcludedTerm('trump')
    const videos = [{ title: 'The Trump Show', channel: 'CNN' }, { title: 'The Biden Report', channel: 'NBC' }]
    repo.upsertVideos(videos)
    const results = await repo.getVideos()
    assert.equal(results.length, 1)
    assert.deepEqual(results[0], {
      channel: 'NBC',
      title: 'The Biden Report'
    })
  })
})
