import fs from 'fs'

const subtitlesYTDLPArgs = [
  '--write-subs',
  '--write-auto-subs',
  '--sub-format',
  'vtt',
  '--convert-subs',
  'srt',
  '-k',
  '--verbose'
]

const videoYTDLPArgs = quality => [
  '--concurrent-fragments',
  '10',
  '--newline',
  '--progress',
  '--progress-delta',
  '1',
  '--sponsorblock-remove',
  'all,-filler',
  '--merge-output-format',
  'mp4',
  '-f',
  `bestvideo[height<=${quality}]+bestaudio/best`,
  '--check-formats',
  '--verbose'
]

function getOptionalCookiesPath () {
  if (fs.existsSync('/app/cookies.txt')) return '/app/cookies.txt'
  if (fs.existsSync('./cookies.txt')) return './cookies.txt'
}

export function buildCookiesOption () {
  const cookiesPath = getOptionalCookiesPath()
  return cookiesPath ? ['--cookies', cookiesPath] : []
}

export { subtitlesYTDLPArgs, videoYTDLPArgs }
