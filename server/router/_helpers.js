import { broadcastSSE } from '../sse.js'
import querystring from 'querystring'

const llmDefaults = {
  model: 'meta-llama-3.1-8b-instruct',
  host: 'http://127.0.0.1:1234',
  endpoint: '/v1/chat/completions',
  apiKey: '',
  temperature: 0
}

const llmSettings = {
  model: process.env.AI_MODEL ?? llmDefaults.model,
  host: process.env.AI_HOST ?? llmDefaults.host,
  endpoint: process.env.AI_ENDPOINT ?? llmDefaults.endpoint,
  apiKey: process.env.AI_APIKEY ?? llmDefaults.apiKey,
  temperature: process.env.AI_TEMPERATURE ?? llmDefaults.temperature
}

export function broadcastMessage (type, payload, connections) {
  return broadcastSSE(JSON.stringify({ type, ...payload }), connections)
}

export async function parseBody (req, res) {
  const body = await getBody(req)
  try {
    return JSON.parse(body)
  } catch (err) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return null
  }
}

function getBody (req) {
  return new Promise((resolve, reject) => {
    let body = ''
    req.on('data', chunk => {
      body += chunk.toString()
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

export function getQuery (req) {
  return (req.url && req.url.indexOf('?') >= 0)
    ? querystring.parse(req.url.substring(req.url.indexOf('?') + 1))
    : {}
}

export { llmSettings }
