import spawn from 'nano-spawn'

const DEFAULT_ENCODING_ARGS = [
  '-c:v', 'libx264',
  '-preset', 'veryfast',
  '-crf', '28',
  '-x264-params', 'opencl=true',
  '-vf', 'format=yuv420p',
  '-profile:v', 'main',
  '-movflags', '+faststart',
  '-c:a', 'copy'
]

export function transcode (location, format) {
  const output = location.replace(format, 'tmp.' + format)
  console.log('transcoding video', location, '->', output)

  return spawn('ffmpeg', [
    '-i', location,
    ...DEFAULT_ENCODING_ARGS,
    output
  ])
}
