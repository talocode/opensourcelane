import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { PRICING } from '../src/billing.js'

describe('billing pricing', () => {
  it('has all action prices', () => {
    assert.equal(PRICING['opensourcelane.repo.analyze'], 25)
    assert.equal(PRICING['opensourcelane.alternatives.find'], 30)
    assert.equal(PRICING['opensourcelane.migration.plan'], 50)
    assert.equal(PRICING['opensourcelane.cost.estimate'], 20)
    assert.equal(PRICING['opensourcelane.risk.score'], 30)
    assert.equal(PRICING['opensourcelane.brief.generate'], 40)
    assert.equal(PRICING['opensourcelane.tools.compare'], 35)
    assert.equal(PRICING['opensourcelane.deployment.plan'], 35)
    assert.equal(PRICING['opensourcelane.license.audit'], 20)
    assert.equal(PRICING['opensourcelane.export.markdown'], 5)
    assert.equal(PRICING['opensourcelane.export.json'], 5)
  })

  it('has 11 priced actions', () => {
    assert.equal(Object.keys(PRICING).length, 11)
  })
})