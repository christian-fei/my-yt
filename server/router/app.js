import fs from 'fs'
import { URL } from 'url'

const staticFiles = {
  '/main.css': 'text/css',
  '/normalize.css': 'text/css',
  '/manifest.json': 'text/json'
}

const jsFiles = [
  '/main.js', '/lib/store.js', '/lib/router.js', '/lib/utils.js',
  '/components/video-element.js', '/components/videos-container.js', '/components/sse-connection.js',
  '/components/search-videos.js', '/components/channels-list.js', '/components/empty-state.js',
  '/components/forms/add-channel-form.js', '/components/forms/manage-channels-form.js',
  '/components/forms/video-quality-form.js', '/components/forms/manage-disk-space-form.js',
  '/components/forms/transcode-videos-form.js', '/components/forms/excluded-terms-form.js'
]

const assetFiles = {
  '/favicon.ico': 'client/favicon-96x96.png',
  '/apple-touch-icon.png': 'client/apple-touch-icon.png'
}

export default function appHandler (req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)

  if (staticFiles[url.pathname]) {
    return fileHandler(`client${url.pathname}`, staticFiles[url.pathname])(req, res)
  }
  if (jsFiles.includes(url.pathname)) {
    return fileHandler(`client${url.pathname}`, 'application/javascript')(req, res)
  }
  if (assetFiles[url.pathname]) {
    return fileHandler(`client/${assetFiles[url.pathname]}`, 'image/png')(req, res)
  }

  return fileHandler('client/index.html', 'text/html')(req, res)
}

function fileHandler (filePath, contentType) {
  return (req, res) => {
    res.writeHead(200, { 'Content-Type': contentType })
    res.end(fs.readFileSync(filePath, 'utf8'))
  }
}
