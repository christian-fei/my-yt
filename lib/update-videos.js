import { getVideosFor } from './youtube.js'
import { getRepository } from '../server/service-container.js'

export async function updateAndPersistVideos (callback = () => {}) {
  const repo = getRepository()
  const channels = repo.getChannels()
  for (const channel of channels) {
    await updateAndPersistVideosForChannel(channel.name, callback)
  }
}

export async function updateAndPersistVideosForChannel (name, callback = () => {}) {
  const repo = getRepository()
  let videos = await getVideosFor(name)
  if (Array.isArray(videos)) {
    videos = videos.map(v => repo.patchVideo(v))
    repo.upsertVideos(videos)
    videos = videos
      .filter(v => !v.ignored)
      .filter(v => repo.filterByExcludedTerms(v))
    callback(null, { name, videos })
  } else {
    callback(new Error(`Failed to fetch videos for channel "${name}"`))
  }
  return videos
}
