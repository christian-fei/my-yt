/* eslint-disable no-async-promise-executor */
import spawn from 'nano-spawn'
import fs from 'fs'
import * as ytdlp from './yt-dlp.js'
import { execSync } from 'child_process'
import { Worker } from 'worker_threads'

export const ytUrlRegExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/(?:watch\?v=)?)([\w-]+)/

const fetchYoutubeHeaders = {
  'Accept-Language': 'en',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36'
}

function runVideoInWorker (id, quality, callback) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./lib/workers/video.js', {
      workerData: { id, quality }
    })

    worker.on('message', (message) => {
      if (message.status === 'done') {
        resolve({ location: message.location, format: message.format })
      }
      if (message.status === 'error') {
        reject(message.error)
      }
      if (message.status === 'info') {
        callback(message)
      }
      if (message.status === 'progress') {
        callback(message)
      }
    })

    worker.on('error', (error) => {
      reject(error)
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}

function runFfmpegInWorker (location, format, callback) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./lib/workers/ffmpeg.js', {
      workerData: { location, format }
    })

    worker.on('message', (message) => {
      if (message.status === 'done') {
        resolve()
      }
      if (message.status === 'error') {
        reject(message.error)
      }
      if (message.status === 'info') {
        callback(message)
      }
    })

    worker.on('error', (error) => {
      reject(error)
    })

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker stopped with exit code ${code}`))
      }
    })
  })
}
export async function downloadVideo (id, repo, callback = () => {}) {
  return new Promise(async (resolve, reject) => {
    if (isUnsupportedUrl(id)) return reject(new Error('unsupported url'))
    if (isYouTubeUrl(id)) id = extractIdFromUrl(id)
    try {
      if (!repo.getVideo(id)) {
        repo.upsertVideos([await getVideo(id)])
      }
      const quality = repo.getVideoQualitySetting()
      let location, format

      await runVideoInWorker(id, quality, (message) => {
        if (message.status === 'info') {
          console.log(message.line)
          callback(message)
        } else {
          callback(message)
        }
      })
        .then((result) => {
          console.log('Video processing completed', result)
          location = result.location
          format = result.format
        })
        .catch((error) => {
          console.error(`Error: ${error.message}`)
        })

      const video = repo.updateVideo(id, { location, format })

      if (repo.getTranscodeVideosSetting() && video.location && video.format) {
        await runFfmpegInWorker(video.location, video.format, (message) => {
          console.log(message.line)
          callback(message)
        })
        execSync(`mv ${location.replace(format, 'tmp.' + format)} ${location}`)

        console.log(`successfully transcoded video ${video.location}`)
        callback(`successfully transcoded video ${video.location}`) // eslint-disable-line
      }

      repo.updateVideo(id, { downloaded: true })

      normalizeSubtitleFiles(id)
      resolve(id)
    } catch (error) {
      console.error(error)
      console.error('Error downloading video:', error.message)
      reject(error)
    }
  })
}

export async function getVideoSubtitles (id, callback = () => {}) {
  return new Promise(async (resolve, reject) => {
    try {
      const transcriptPath = `./data/videos/${id}.en.srt`
      if (!fs.existsSync(transcriptPath)) {
        for await (const line of ytdlp.subtitles(id)) {
          console.log(line)
          callback(line)
        }
      }
      normalizeSubtitleFiles(id)
      const transcript = fs.readFileSync(transcriptPath, 'utf-8')
      resolve(transcript)
    } catch (error) {
      console.error('Error downloading video subtitles:', error.message)
      reject(error)
    }
  })
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
export async function getVideosFor (channelName) {
  try {
    const response = await fetch(`https://www.youtube.com/${channelWithAt(channelName)}/videos`, {
      headers: fetchYoutubeHeaders
    })
    const text = await response.text()
    const match = text.match(/var ytInitialData = (.+?);<\/script>/)
    if (!match || !match[1]) {
      console.log('no match for', channelName)
      return null
    }

    const json = JSON.parse(match[1].trim())
    const videoTab = json.contents.twoColumnBrowseResultsRenderer.tabs.find(t => t.tabRenderer?.title === 'Videos')
    const videoContents = videoTab.tabRenderer.content.richGridRenderer.contents
    return videoContents
      .map(toInternalVideo)
      .filter(Boolean)
      .filter(v => v.publishedAt > new Date(Date.now() - 6 * 31 * 24 * 60 * 60 * 1000))
      // .filter((_,i) => i < 10)
  } catch (error) {
    console.error('Error fetching latest video:', error.message)
    return null
  }

  function channelWithAt (channelName = '') {
    return channelName.startsWith('@') ? channelName : '@' + channelName
  }

  function toInternalVideo (v) {
    if (!v || !v.richItemRenderer) return
    const data = v.richItemRenderer.content.videoRenderer
    if (!data.viewCountText?.simpleText) return
    // comments contain yt-dlp info downloaded with -J
    return {
      channelName,
      title: data.title?.runs[0].text, // .title
      url: `https://www.youtube.com/watch?v=${data.videoId}`, // .url
      thumbnail: `https://img.youtube.com/vi/${data.videoId}/mq2.jpg`,
      description: data.descriptionSnippet?.runs[0].text, // .description
      id: data.videoId, // .id
      publishedTime: data.publishedTimeText?.simpleText,
      publishedAt: parseRelativeTime(data.publishedTimeText?.simpleText),
      viewCount: data.viewCountText?.simpleText, // .view_count
      duration: data.lengthText?.simpleText // .duration_string
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

function parseRelativeTime (relativeTime) {
  if (!relativeTime) return
  const now = new Date()
  let match

  const regexes = [
    { regex: /(\d+)\s+seconds? ago/, unit: 'seconds' },
    { regex: /(\d+)\s+minutes? ago/, unit: 'minutes' },
    { regex: /(\d+)\s+hours? ago/, unit: 'hours' },
    { regex: /(\d+)\s+days? ago/, unit: 'days' },
    { regex: /(\d+)\s+weeks? ago/, unit: 'weeks' },
    { regex: /(\d+)\s+months? ago/, unit: 'months' },
    { regex: /(\d+)\s+years? ago/, unit: 'years' }
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
