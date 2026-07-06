import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { chargeCredits } from '../src/billing.js'

describe('billing chargeCredits', () => {
  it('returns auth_error without api key', async () => {
    const result = await chargeCredits('opensourcelane.repo.analyze', 25, {}, '')
    assert.equal(result.success, false)
    assert.equal(result.code, 'auth_error')
  })
})