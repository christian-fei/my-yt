import { getVideosFor } from './youtube.js'
import { getRepository } from '../server/service-container.js'
import { ScraperError } from './scraper-errors.js'

export async function updateAndPersistVideos (callback = () => {}) {
  const repo = getRepository()
  const channels = repo.getChannels()
  for (const channel of channels) {
    await updateAndPersistVideosForChannel(channel.name, callback)
  }
}

export async function updateAndPersistVideosForChannel (name, callback = () => {}) {
  const repo = getRepository()
  try {
    let videos = await getVideosFor(name)
    if (Array.isArray(videos)) {
      videos = videos.map(v => repo.patchVideo(v))
      repo.upsertVideos(videos)
      videos = videos
        .filter(v => !v.ignored)
        .filter(v => repo.filterByExcludedTerms(v))
      callback(null, { name, videos })
    }
    return videos
  } catch (error) {
    if (error instanceof ScraperError) {
      console.error(`[update] Failed updating @${name}: ${error.message}`)
      callback(null, { type: 'update-error', channel: name, error: error.message })
      return // Don't fail the entire batch for one channel
    }
    throw error // Non-scraper errors still propagate
  }
}
