import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { redactApiKey, redactSecrets, validateApiKey } from '../src/auth.js'

describe('auth', () => {
  it('redacts api keys', () => {
    assert.equal(redactApiKey('sk_test_abcdefghijklmnop'), 'sk_t...mnop')
    assert.equal(redactApiKey('short'), '****')
  })

  it('validates api keys', () => {
    assert.equal(validateApiKey('valid-key'), true)
    assert.equal(validateApiKey(''), false)
  })

  it('redacts secrets in text', () => {
    const text = redactSecrets('Authorization: Bearer sk_live_abc123 and api_key=secret')
    assert.ok(!text.includes('sk_live_abc123'))
    assert.ok(text.includes('[redacted]'))
  })
})