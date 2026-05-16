import spawn from 'nano-spawn'
import fs from 'fs'
import * as ytdlp from './yt-dlp.js'
import { runWorkerDownload, runWorkerTranscode } from './workers/run-worker.js'
import { getRepository } from '../server/service-container.js'
import { ScraperError } from './scraper-errors.js'

export const ytUrlRegExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/(?:watch\?v=)?)([\w-]+)/

const fetchYoutubeHeaders = {
  'Accept-Language': 'en',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
}

function parseDuration (durationStr) {
  if (!durationStr) return null
  const parts = durationStr.split(':').map(Number)
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  }
  return null
}

export async function downloadVideo (id, callback = () => {}) {
  const repo = getRepository()
  if (isUnsupportedUrl(id)) throw new Error('unsupported url')

  const videoId = isYouTubeUrl(id) ? extractIdFromUrl(id) : id
  if (!repo.getVideo(videoId)) {
    repo.upsertVideos([await getVideo(videoId)])
  }

  const quality = repo.getVideoQualitySetting()
  console.log('Video processing completed', await runWorkerDownload(videoId, quality, (message) => {
    callback(message)
  }))

  const video = repo.updateVideo(videoId, { location: null, format: null })
  if (repo.getTranscodeVideosSetting() && video.location && video.format) {
    await runWorkerTranscode(video.location, video.format, parseDuration(video.duration), (message) => {
      callback(message)
    })

    const tmpLocation = video.location.replace(video.format, 'tmp.' + video.format)
    fs.renameSync(tmpLocation, video.location)

    console.log(`successfully transcoded video ${video.location}`)
  }

  repo.updateVideo(videoId, { downloaded: true })
  normalizeSubtitleFiles(videoId)

  return videoId
}

export async function getVideoSubtitles (id, callback = () => {}) {
  const transcriptPath = `./data/videos/${id}.en.srt`
  if (!fs.existsSync(transcriptPath)) {
    for await (const line of ytdlp.subtitles(id)) {
      console.log(line)
      callback(line)
    }
  }

  normalizeSubtitleFiles(id)

  try {
    const transcript = fs.readFileSync(transcriptPath, 'utf-8')
    return transcript
  } catch (error) {
    console.error('Error downloading video subtitles:', error.message)
    throw error
  }
}

function normalizeSubtitleFiles (id) {
  const files = fs.readdirSync('./data/videos')
  files.forEach(file => {
    if (file.startsWith(id) && file.endsWith('.srt')) {
      if (!file.endsWith('.en.srt')) {
        fs.renameSync(`./data/videos/${file}`, `./data/videos/${id}.en.srt`)
      }
    }
    if (file.startsWith(id) && file.endsWith('.vtt')) {
      if (!file.endsWith('.en.vtt')) {
        fs.renameSync(`./data/videos/${file}`, `./data/videos/${id}.en.vtt`)
      }
    }
  })
}
export async function getVideosFor (channelName, { includeMembersOnly = false } = {}) {
  const channelUrl = `https://www.youtube.com/${channelWithAt(channelName)}/videos`
  const response = await fetch(channelUrl, {
    headers: fetchYoutubeHeaders
  })

  if (!response.ok) {
    throw new ScraperError(`HTTP ${response.status} fetching channel page for @${channelName}`, {
      statusCode: response.status,
      channel: channelName
    })
  }

  const text = await response.text()
  const match = text.match(/var ytInitialData = (.+?);<\/script>/)

  if (!match || !match[1]) {
    console.error(`[scraper] No ytInitialData found for @${channelName}`)
    console.error(`[scraper] Last 200 chars of response: "${text.slice(-200)}"`)
    throw new ScraperError('YouTube HTML structure changed — scraper regex no longer matches', {
      channel: channelName
    })
  }

  try {
    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer?.title === 'Videos')
    if (!videoTab || !videoTab.tabRenderer) {
      throw new ScraperError('YouTube channel page has no "Videos" tab — structure may have changed', {
        channel: channelName
      })
    }
    const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents
    return videoContents
      .map(toInternalVideo)
      .filter(Boolean)
      .filter(v => includeMembersOnly || !v.isMembersOnly)
      .filter(v => v.publishedAt > new Date(Date.now() - 6 * 31 * 24 * 60 * 60 * 1000))
      // .filter((_,i) => i < 10)
  } catch (error) {
    if (error instanceof ScraperError) throw error
    // Unexpected parse errors — wrap as scraper failure
    console.error(`[scraper] Failed to parse channel data for @${channelName}: ${error.message}`)
    throw new ScraperError('Failed to parse YouTube channel data', {
      channel: channelName
    })
  }

  function channelWithAt (channelName = '') {
    return channelName.startsWith('@') ? channelName : '@' + channelName
  }

  function toInternalVideo (v) {
    if (!v || !v.richItemRenderer) return
    const data = v.richItemRenderer.content.lockupViewModel
    if (!data) return

    const isMembersOnly = data.badges?.some(badge =>
      badge.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_MEMBERS_ONLY'
    )

    const metadataParts = data.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows?.[0]?.metadataParts || []
    const part0 = metadataParts[0]?.text?.content
    const part1 = metadataParts[1]?.text?.content

    // YouTube sometimes swaps views and relative time positions
    const [views, publishedTime] = isRelativeTimeString(part0) ? [part1, part0] : [part0, part1]

    return {
      channelName,
      title: data.metadata?.lockupMetadataViewModel?.title?.content || 'Unparsable title',
      url: `https://www.youtube.com/watch?v=${data.contentId}`,
      thumbnail: `https://img.youtube.com/vi/${data.contentId}/mq2.jpg`,
      description: 'No description',
      id: data.contentId,
      viewCount: views || 'Unparsable views',
      publishedTime: publishedTime || 'Unknown time',
      publishedAt: parseRelativeTime(publishedTime),
      duration: data.contentImage?.thumbnailViewModel?.overlays?.[0]?.thumbnailBottomOverlayViewModel?.badges?.[0]?.thumbnailBadgeViewModel?.rendererContext?.accessibilityContext?.label || 'Unknown duration',
      isMembersOnly
    }
  }
}

export async function getVideo (id) {
  if (isUnsupportedUrl(id)) return null
  if (isYouTubeUrl(id)) id = extractIdFromUrl(id)
  try {
    let { output } = await spawn('yt-dlp', ['-j', '--', id])
    output = output.split('\n').filter(l => l.startsWith('{'))
    const json = JSON.parse(output)
    return {
      channelName: json.uploader_id.replace(/^@/, ''),
      title: json.title,
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://img.youtube.com/vi/${id}/mq2.jpg`,
      description: json.description,
      id,
      publishedTime: json.upload_date.substring(0, 4) + '-' + json.upload_date.substring(4, 6) + '-' + json.upload_date.substring(6, 8),
      publishedAt: new Date(json.timestamp * 1000),
      viewCount: json.view_count,
      duration: json.duration_string
    }
  } catch (err) {
    console.error(err)
    return null
  }
}

function isRelativeTimeString (str) {
  return typeof str === 'string' && /\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)\s*ago/.test(str)
}

function parseRelativeTime (relativeTime) {
  if (!relativeTime) return
  const now = new Date()
  let match

  const regexes = [
    { regex: /(\d+)\s*(?:seconds?|s)\s*ago/, unit: 'seconds' },
    { regex: /(\d+)\s*(?:minutes?|m)\s*ago/, unit: 'minutes' },
    { regex: /(\d+)\s*(?:hours?|h)\s*ago/, unit: 'hours' },
    { regex: /(\d+)\s*(?:days?|d)\s*ago/, unit: 'days' },
    { regex: /(\d+)\s*(?:weeks?|w)\s*ago/, unit: 'weeks' },
    { regex: /(\d+)\s*(?:months?|mo)\s*ago/, unit: 'months' },
    { regex: /(\d+)\s*(?:years?|y)\s*ago/, unit: 'years' }
  ]

  for (let i = 0; i < regexes.length; i++) {
    match = relativeTime.match(regexes[i].regex)
    if (match) {
      const amount = parseInt(match[1], 10)
      switch (regexes[i].unit) {
        case 'seconds': now.setSeconds(now.getSeconds() - amount); break
        case 'minutes': now.setMinutes(now.getMinutes() - amount); break
        case 'hours': now.setHours(now.getHours() - amount); break
        case 'days': now.setDate(now.getDate() - amount); break
        case 'weeks': now.setDate(now.getDate() - amount * 7); break
        case 'months': now.setMonth(now.getMonth() - amount); break
        case 'years': now.setFullYear(now.getFullYear() - amount); break
      }
      return now
    }
  }
  console.error('Invalid relative time format', relativeTime)
  return null
}

export function extractIdFromUrl (url) {
  if (isYouTubeUrl(url)) {
    const match = url.match(ytUrlRegExp)
    return match ? match[1] : null // Extract the first capture group
  }
}

export function isYouTubeUrl (url) {
  return ytUrlRegExp.test(url)
}

export function isUnsupportedUrl (url) {
  return !isYouTubeUrl(url) && !isVideoId(url)
}

export function isVideoId (url) {
  return !/^https?/.test(url)
}
