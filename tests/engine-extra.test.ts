import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  findAlternatives,
  analyzeRepo,
  scoreRisk,
  auditLicense,
  compareTools,
  generateDeploymentPlan,
} from '../src/engine.js'
import { findByReplaces, CATALOG } from '../src/catalog.js'

describe('engine extra coverage', () => {
  it('finds alternatives for Notion', () => {
    const result = findAlternatives({ replace: 'Notion', teamSize: 3 })
    assert.ok(result.alternatives.length > 0)
  })

  it('finds alternatives for Zapier', () => {
    const result = findAlternatives({ replace: 'Zapier' })
    assert.ok(result.alternatives.some((a) => a.name === 'n8n'))
  })

  it('finds alternatives for Datadog', () => {
    const result = findAlternatives({ replace: 'Datadog' })
    assert.ok(result.alternatives.some((a) => a.name === 'Uptime Kuma'))
  })

  it('analyzes Plane with catalog metadata', () => {
    const result = analyzeRepo({ repo: 'makeplane/plane' })
    assert.equal(result.metadataSource, 'catalog')
    assert.ok(result.adoptionScore > 0)
  })

  it('scores risk for Supabase', () => {
    const result = scoreRisk({
      repo: 'supabase/supabase',
      metadata: { contributors: 100, hasDocker: true, license: 'Apache-2.0' },
    })
    assert.ok(result.riskScore >= 0 && result.riskScore <= 100)
  })

  it('audits Apache license', () => {
    const result = auditLicense({ repo: 'supabase/supabase', license: 'Apache-2.0' })
    assert.equal(result.riskLevel, 'low')
  })

  it('compares three tools', () => {
    const result = compareTools({
      tools: [
        { name: 'Plane', repo: 'makeplane/plane' },
        { name: 'Taiga', repo: 'kaleidos-ventures/taiga' },
        { name: 'Namviek', repo: 'hudy9x/namviek' },
      ],
    })
    assert.equal(result.comparison.length, 3)
  })

  it('deployment plan for Plane docker', () => {
    const result = generateDeploymentPlan({ tool: 'Plane', deployment: 'docker', teamSize: 10 })
    assert.ok(result.steps.length >= 8)
  })

  it('catalog has project management entries', () => {
    const pm = findByReplaces('Linear')
    assert.ok(pm.length >= 1)
  })

  it('catalog size is extensible', () => {
    assert.ok(CATALOG.length >= 24)
  })
})