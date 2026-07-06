import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { OpenSourceLaneClient, createOpenSourceLaneClient } from '../src/client.js'

describe('client', () => {
  it('creates client with defaults', () => {
    const client = createOpenSourceLaneClient()
    assert.ok(client instanceof OpenSourceLaneClient)
    assert.ok(client.repo)
    assert.ok(client.alternatives)
    assert.ok(client.migration)
    assert.ok(client.cost)
    assert.ok(client.risk)
    assert.ok(client.brief)
    assert.ok(client.tools)
    assert.ok(client.deployment)
    assert.ok(client.license)
    assert.ok(client.export)
  })

  it('has all SDK namespaces', () => {
    const client = new OpenSourceLaneClient({ apiKey: 'test', baseUrl: 'http://localhost:3050' })
    assert.equal(typeof client.health, 'function')
    assert.equal(typeof client.repo.analyze, 'function')
    assert.equal(typeof client.alternatives.find, 'function')
    assert.equal(typeof client.migration.plan, 'function')
    assert.equal(typeof client.cost.estimate, 'function')
    assert.equal(typeof client.risk.score, 'function')
    assert.equal(typeof client.brief.generate, 'function')
    assert.equal(typeof client.tools.compare, 'function')
    assert.equal(typeof client.deployment.plan, 'function')
    assert.equal(typeof client.license.audit, 'function')
    assert.equal(typeof client.export.markdown, 'function')
    assert.equal(typeof client.export.json, 'function')
  })
})