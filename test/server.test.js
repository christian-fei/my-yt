import { test, describe } from 'node:test'
import fs from 'fs'
import assert from 'assert'
import { createServer } from '../server/http.js'
import Repository from '../lib/repository.js'

let repo
const state = {}
const connections = []
test.beforeEach(() => {
  if (fs.existsSync('./test/data')) {
    fs.rmSync('./test/data', { recursive: true })
  }
  repo = new Repository('./test/data')
})
test('starts server', async () => {
  const server = createServer({ repo, state, connections })
  await new Promise(resolve => server.listen(3001, resolve))
  assert.equal(server.address().port, 3001)
  await new Promise(resolve => server.close(resolve))
})

describe('server - user flow', () => {
  let server
  test.before((cb) => {
    server = createServer({ repo, state, connections })
    server.listen(3001, cb)
    console.log('listening server')
  }, { timeout: 10000 })
  test.after((cb) => {
    server.close(cb)
    console.log('closed server')
  }, { timeout: 10000 })

  test('get channels', { timeout: 5000 }, async () => {
    const res = await fetch('http://0.0.0.0:3001/api/channels')
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.deepEqual(data, [])
  })
  test('add channel', { timeout: 10000 }, async () => {
    const resAddChannel = await fetch('http://0.0.0.0:3001/api/channels', {
      method: 'POST',
      body: JSON.stringify({
        name: 'veritasium'
      })
    })
    assert.ok(resAddChannel.ok)
    assert.equal(resAddChannel.status, 201)

    const res = await fetch('http://0.0.0.0:3001/api/channels')
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.deepEqual(data, [{ name: 'veritasium' }])
  })

  test('get channels again', { timeout: 5000 }, async () => {
    const res = await fetch('http://0.0.0.0:3001/api/channels')
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.deepEqual(data, [{ name: 'veritasium' }])
  })
  test('get videos', { timeout: 5000 }, async () => {
    const res = await fetch('http://0.0.0.0:3001/api/videos')
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.length > 0)
  })
  test('delete channel', { timeout: 5000 }, async () => {
    const resDeleteChannel = await fetch('http://0.0.0.0:3001/api/channels', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'veritasium' })
    })
    assert.equal(resDeleteChannel.status, 200)
    const resGetChannels = await fetch('http://0.0.0.0:3001/api/channels')
    const dataGetChannels = await resGetChannels.json()
    assert.equal(resGetChannels.status, 200)
    assert.deepEqual(dataGetChannels, [])
  })
  test('get videos again', { timeout: 5000 }, async () => {
    const res = await fetch('http://0.0.0.0:3001/api/videos')
    const data = await res.json()
    assert.equal(res.status, 200)
    assert.ok(data.length > 0)
  })
})
