import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { handleRequest } from '../src/server.js'

function request(port: number, method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
        ...headers,
      },
    }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        resolve({
          status: res.statusCode || 0,
          body: JSON.parse(Buffer.concat(chunks).toString('utf-8') || '{}'),
        })
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

describe('server routes', () => {
  let port = 0
  let server: http.Server

  before(async () => {
    process.env.OPENSOURCELANE_ALLOW_LOCAL_UNAUTH = 'true'
    process.env.OPENSOURCELANE_SERVER = 'false'
    server = http.createServer((req, res) => { void handleRequest(req, res) })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()))
    const address = server.address()
    port = typeof address === 'object' && address ? address.port : 0
  })

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('health route returns version', async () => {
    const res = await request(port, 'GET', '/v1/opensourcelane/health')
    assert.equal(res.status, 200)
    assert.equal(res.body.service, 'opensourcelane')
    assert.equal(res.body.product, 'OpenSourceLane')
  })

  it('alternatives route works locally', async () => {
    const res = await request(port, 'POST', '/v1/opensourcelane/alternatives/find', {
      replace: 'Jira',
      teamSize: 6,
      requiredFeatures: ['kanban'],
    })
    assert.equal(res.status, 200)
    const result = res.body.result as { alternatives: unknown[] }
    assert.ok(result.alternatives.length > 0)
  })

  it('repo analyze route works', async () => {
    const res = await request(port, 'POST', '/v1/opensourcelane/repo/analyze', {
      repo: 'hudy9x/namviek',
      metadata: { stars: 3000, contributors: 6 },
    })
    assert.equal(res.status, 200)
    assert.equal((res.body.result as { name: string }).name, 'Namviek')
  })

  it('migration route works', async () => {
    const res = await request(port, 'POST', '/v1/opensourcelane/migration/plan', {
      from: 'Jira',
      to: 'hudy9x/namviek',
      teamSize: 6,
    })
    assert.equal(res.status, 200)
    assert.ok((res.body.result as { phases: unknown[] }).phases.length > 0)
  })

  it('cost estimate route works', async () => {
    const res = await request(port, 'POST', '/v1/opensourcelane/cost/estimate', {
      currentTool: 'Jira',
      currentMonthlyCost: 80,
      teamSize: 6,
    })
    assert.equal(res.status, 200)
    assert.equal((res.body.result as { monthlySavings: number }).monthlySavings, 30)
  })

  it('validation catches missing replace', async () => {
    const res = await request(port, 'POST', '/v1/opensourcelane/alternatives/find', {})
    assert.equal(res.status, 400)
  })

  it('returns 404 for unknown route', async () => {
    const res = await request(port, 'POST', '/v1/opensourcelane/unknown', {})
    assert.equal(res.status, 404)
  })
})