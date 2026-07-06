import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import * as pkg from '../src/index.js'

describe('index exports', () => {
  it('exports engine functions', () => {
    assert.equal(typeof pkg.analyzeRepo, 'function')
    assert.equal(typeof pkg.findAlternatives, 'function')
    assert.equal(typeof pkg.planMigration, 'function')
    assert.equal(typeof pkg.estimateCostSavings, 'function')
    assert.equal(typeof pkg.scoreRisk, 'function')
    assert.equal(typeof pkg.generateAdoptionBrief, 'function')
    assert.equal(typeof pkg.compareTools, 'function')
    assert.equal(typeof pkg.generateDeploymentPlan, 'function')
    assert.equal(typeof pkg.auditLicense, 'function')
    assert.equal(typeof pkg.exportMarkdown, 'function')
    assert.equal(typeof pkg.exportJson, 'function')
  })

  it('exports client and errors', () => {
    assert.equal(typeof pkg.OpenSourceLaneClient, 'function')
    assert.equal(typeof pkg.createOpenSourceLaneClient, 'function')
    assert.equal(typeof pkg.OpenSourceLaneAuthError, 'function')
    assert.equal(typeof pkg.CATALOG, 'object')
    assert.equal(typeof pkg.PRICING, 'object')
  })
})