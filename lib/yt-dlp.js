import spawn from 'nano-spawn'
import { subtitlesYTDLPArgs, videoYTDLPArgs, buildCookiesOption } from './yt-dlp-args.js'

export function video (id, quality) {
  const cookiesOption = buildCookiesOption()
  return spawn('yt-dlp', [
    '-o',
    `./data/videos/${id}.%(ext)s`,
    ...cookiesOption,
    ...videoYTDLPArgs(quality),
    // ...subtitlesYTDLPArgs,
    '--',
    id
  ])
}
export function subtitles (id) {
  const cookiesOption = buildCookiesOption()
  return spawn('yt-dlp', [
    '-o',
    `./data/videos/${id}`,
    '--skip-download',
    ...cookiesOption,
    ...subtitlesYTDLPArgs,
    '--',
    id
  ])
}
