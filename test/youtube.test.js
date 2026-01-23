import { test } from 'node:test'
import assert from 'assert'
import { getVideosFor, getVideo, extractIdFromUrl, isYouTubeUrl, isUnsupportedUrl, isVideoId } from '../lib/youtube.js'

if (!process.env.CI) {
  test('gets videos for channel', async () => {
    const videos = await getVideosFor('veritasium')
    const video = videos[0]
    assert.ok(video.channelName)
    assert.ok(video.title)
    assert.ok(video.url)
    assert.ok(video.thumbnail)
    assert.ok(video.description)
    assert.ok(video.id)
    assert.ok(video.publishedTime)
    assert.ok(video.viewCount)
    assert.ok(video.duration)
    assert.ok(videos.length > 0)
  })

  test('excludes members-only videos from channel', async () => {
    // CasualNerdReactions has members-only "early access" videos
    // Fetch raw YouTube data to find members-only video IDs
    const channelName = 'CasualNerdReactions'
    const response = await fetch(`https://www.youtube.com/@${channelName}/videos`, {
      headers: {
        'Accept-Language': 'en',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Cookie: 'CONSENT=YES+cb'
      }
    })
    const text = await response.text()
    const match = text.match(/var ytInitialData = (.+?);<\/script>/)
    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer?.title === 'Videos')
    const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents

    // Find all members-only video IDs from raw data
    const membersOnlyIds = videoContents
      .filter(v => v.richItemRenderer?.content?.videoRenderer?.badges?.some(
        b => b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_MEMBERS_ONLY'
      ))
      .map(v => v.richItemRenderer.content.videoRenderer.videoId)

    assert.ok(membersOnlyIds.length > 0, 'Channel should have at least one members-only video')

    // Now fetch via getVideosFor and verify none of the members-only IDs are included
    const videos = await getVideosFor(channelName)
    const foundMembersOnly = videos.filter(v => membersOnlyIds.includes(v.id))
    assert.equal(foundMembersOnly.length, 0, `Found ${foundMembersOnly.length} members-only videos that should have been filtered: ${foundMembersOnly.map(v => v.id).join(', ')}`)
  })

  test('gets single video', async () => {
  // https://www.youtube.com/watch?v=qJZ1Ez28C-A
    const video = await getVideo('qJZ1Ez28C-A')
    assert.equal(video.channelName, 'veritasium')
    assert.equal(video.title, 'Something Strange Happens When You Trust Quantum Mechanics')
    assert.equal(video.url, 'https://www.youtube.com/watch?v=qJZ1Ez28C-A')
    assert.equal(video.thumbnail, 'https://img.youtube.com/vi/qJZ1Ez28C-A/mq2.jpg')
    assert.ok(video.description, '')
    assert.equal(video.id, 'qJZ1Ez28C-A')
    assert.equal(video.publishedTime, '2025-03-05')
    assert.ok(video.viewCount)
    assert.equal(video.duration, '33:00')
  })
}

test('extracts id from url', () => {
  assert.equal(extractIdFromUrl('https://www.youtube.com/watch?v=SOME_ID&pp=something'), 'SOME_ID')
  assert.equal(extractIdFromUrl('https://www.youtube.com/watch?v=SOME_ID'), 'SOME_ID')
  assert.equal(extractIdFromUrl('https://youtube.com/watch?v=SOME_ID'), 'SOME_ID')
  assert.equal(extractIdFromUrl('https://youtu.be/watch?v=SOME_ID'), 'SOME_ID')
  assert.equal(extractIdFromUrl('https://youtu.be/SOME_ID?si=something'), 'SOME_ID')
})

test('check if url is a youtube url', () => {
  assert.ok(isYouTubeUrl('https://www.youtube.com/watch?v=SOME_ID&pp=something'))
  assert.ok(isYouTubeUrl('https://www.youtube.com/watch?v=SOME_ID'))
  assert.ok(isYouTubeUrl('https://youtube.com/watch?v=SOME_ID'))
  assert.ok(isYouTubeUrl('https://youtu.be/watch?v=SOME_ID'))
  assert.ok(isYouTubeUrl('https://youtu.be/SOME_ID?si=something'))
})

test('checks if url is unsupported', () => {
  assert.ok(isUnsupportedUrl('https://somesite.com/video'))
  assert.ok(!isUnsupportedUrl('qJZ1Ez28C-A'))
})

test('checks if url is a video id', () => {
  assert.ok(isVideoId('qJZ1Ez28C-A'))
  assert.ok(isVideoId('SOME_ID'))
  assert.ok(!isVideoId('https://www.youtube.com/watch?v=SOME_ID'))
  assert.ok(!isVideoId('https://somesite.com/video'))
})
