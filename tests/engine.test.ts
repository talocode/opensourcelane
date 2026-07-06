import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  analyzeRepo,
  auditLicense,
  compareTools,
  estimateCostSavings,
  exportJson,
  exportMarkdown,
  findAlternatives,
  generateAdoptionBrief,
  generateDeploymentPlan,
  planMigration,
  scoreRisk,
  DISCLAIMERS,
} from '../src/engine.js'

describe('engine findAlternatives', () => {
  it('finds alternatives for Jira', () => {
    const result = findAlternatives({
      replace: 'Jira',
      teamSize: 6,
      requiredFeatures: ['kanban', 'issues'],
      riskTolerance: 'medium',
    })
    assert.ok(result.alternatives.length > 0)
    assert.ok(result.alternatives.some((a) => a.name === 'Plane'))
    assert.ok(result.recommendation.includes('Plane'))
    assert.ok(result.warnings.length > 0)
  })

  it('finds alternatives for Google Analytics', () => {
    const result = findAlternatives({ replace: 'Google Analytics' })
    assert.ok(result.alternatives.some((a) => a.name === 'Plausible' || a.name === 'Matomo'))
  })

  it('returns empty for unknown SaaS with warning', () => {
    const result = findAlternatives({ replace: 'TotallyUnknownSaaSXYZ' })
    assert.equal(result.alternatives.length, 0)
    assert.ok(result.warnings.some((w) => w.includes('No catalog entries')))
  })

  it('scores fit based on deployment preference', () => {
    const result = findAlternatives({
      replace: 'Jira',
      deployment: 'self_hosted',
      requiredFeatures: ['kanban'],
    })
    for (const alt of result.alternatives) {
      assert.ok(alt.fitScore >= 0 && alt.fitScore <= 100)
      assert.ok(['low', 'medium', 'high'].includes(alt.migrationComplexity))
    }
  })
})

describe('engine analyzeRepo', () => {
  it('analyzes catalog repo with provided metadata', () => {
    const result = analyzeRepo({
      repo: 'hudy9x/namviek',
      metadata: { stars: 3000, forks: 296, issues: 9, contributors: 6 },
      requirements: ['kanban', 'issues'],
    })
    assert.equal(result.name, 'Namviek')
    assert.equal(result.repo, 'hudy9x/namviek')
    assert.equal(result.metadataSource, 'provided')
    assert.ok(result.adoptionScore >= 0)
    assert.ok(result.riskScore >= 0)
    assert.ok(result.replaces.includes('Jira'))
  })

  it('analyzes unknown repo with warnings', () => {
    const result = analyzeRepo({ repo: 'unknown/unknown-repo' })
    assert.equal(result.metadataSource, 'unknown')
    assert.ok(result.warnings.some((w) => w.includes('metadata') || w.includes('heuristic')))
  })

  it('includes license warnings for AGPL', () => {
    const result = analyzeRepo({ repo: 'makeplane/plane' })
    assert.ok(result.warnings.some((w) => w.includes('AGPL') || w.includes('legal')))
  })
})

describe('engine scoreRisk', () => {
  it('scores low risk for healthy metadata', () => {
    const result = scoreRisk({
      repo: 'makeplane/plane',
      metadata: {
        stars: 20000,
        contributors: 50,
        lastCommitDaysAgo: 7,
        lastReleaseDaysAgo: 30,
        hasDocker: true,
        hasSecurityPolicy: true,
        license: 'AGPL-3.0',
      },
      readme: '# Plane\n\n## Install\n\nDocker self-host guide.\n\n## License\n\nAGPL',
    })
    assert.ok(result.riskScore < 50)
    assert.equal(result.riskLevel, 'low')
    assert.ok(result.warnings.includes(DISCLAIMERS.heuristicRisk))
  })

  it('scores high risk for stale project', () => {
    const result = scoreRisk({
      repo: 'stale/project',
      metadata: { lastCommitDaysAgo: 500, contributors: 1 },
    })
    assert.ok(result.riskScore >= 45)
    assert.ok(result.signals.some((s) => s.impact === 'negative'))
  })

  it('flags missing features', () => {
    const result = scoreRisk({
      repo: 'hudy9x/namviek',
      requirements: ['enterprise-sso', 'advanced-reporting'],
    })
    assert.ok(result.signals.some((s) => s.signal.includes('missing features')))
  })
})

describe('engine planMigration', () => {
  it('generates migration plan from Jira to Namviek', () => {
    const result = planMigration({
      from: 'Jira',
      to: 'hudy9x/namviek',
      teamSize: 6,
      currentWorkflow: ['backlog', 'kanban', 'sprints'],
    })
    assert.ok(result.summary.includes('Jira'))
    assert.ok(result.phases.length >= 5)
    assert.ok(result.dataToExport.length > 0)
    assert.ok(result.rollbackPlan.length > 0)
    assert.ok(result.successMetrics.length > 0)
    assert.ok(result.warnings.includes(DISCLAIMERS.notFinancialAdvice))
  })

  it('maps workflow features', () => {
    const result = planMigration({
      from: 'Linear',
      to: 'makeplane/plane',
      currentWorkflow: ['kanban', 'issues'],
    })
    assert.ok(result.featureMapping.length === 2)
  })
})

describe('engine estimateCostSavings', () => {
  it('estimates savings correctly', () => {
    const result = estimateCostSavings({
      currentTool: 'Jira',
      teamSize: 6,
      currentMonthlyCost: 80,
      hostingCost: 10,
      maintenanceHoursPerMonth: 4,
      hourlyRate: 10,
    })
    assert.equal(result.currentMonthlyCost, 80)
    assert.equal(result.estimatedOpenSourceMonthlyCost, 50)
    assert.equal(result.monthlySavings, 30)
    assert.equal(result.yearlySavings, 360)
    assert.ok(result.warnings.includes(DISCLAIMERS.notFinancialAdvice))
  })

  it('handles zero savings', () => {
    const result = estimateCostSavings({
      currentTool: 'FreeTool',
      currentMonthlyCost: 10,
      hostingCost: 20,
      maintenanceHoursPerMonth: 10,
      hourlyRate: 20,
    })
    assert.ok(result.monthlySavings < 0)
    assert.equal(result.breakEvenMonths, null)
  })
})

describe('engine generateAdoptionBrief', () => {
  it('generates brief with recommendation', () => {
    const result = generateAdoptionBrief({
      tool: 'Namviek',
      repo: 'hudy9x/namviek',
      replace: 'Jira',
      teamSize: 6,
    })
    assert.ok(result.title.includes('Namviek'))
    assert.ok(['adopt', 'pilot', 'avoid'].includes(result.finalRecommendation))
    assert.ok(result.warnings.length > 0)
  })
})

describe('engine compareTools', () => {
  it('compares Plane and Taiga', () => {
    const result = compareTools({
      tools: [
        { name: 'Plane', repo: 'makeplane/plane' },
        { name: 'Taiga', repo: 'kaleidos-ventures/taiga' },
      ],
      criteria: ['features', 'maintenance', 'deployment', 'cost'],
    })
    assert.equal(result.comparison.length, 2)
    assert.ok(result.winner.name)
    assert.ok(result.recommendation.length > 0)
  })
})

describe('engine generateDeploymentPlan', () => {
  it('generates deployment steps', () => {
    const result = generateDeploymentPlan({
      tool: 'Namviek',
      deployment: 'docker',
      teamSize: 6,
      environment: 'vps',
    })
    assert.ok(result.steps.length >= 5)
    assert.ok(result.securityChecklist.length > 0)
    assert.ok(result.backupPlan.length > 0)
    assert.ok(result.estimatedMonthlyInfraCost > 0)
  })
})

describe('engine auditLicense', () => {
  it('audits MIT license as low risk', () => {
    const result = auditLicense({
      repo: 'hudy9x/namviek',
      license: 'MIT',
      intendedUse: 'internal business use',
    })
    assert.equal(result.license, 'MIT')
    assert.equal(result.riskLevel, 'low')
    assert.ok(result.warnings.includes(DISCLAIMERS.notLegalAdvice))
  })

  it('flags unknown license as high risk', () => {
    const result = auditLicense({ repo: 'unknown/repo' })
    assert.equal(result.riskLevel, 'high')
  })

  it('warns on AGPL', () => {
    const result = auditLicense({ repo: 'makeplane/plane', license: 'AGPL-3.0' })
    assert.ok(result.obligations.some((o) => o.includes('Source code')))
    assert.ok(result.warnings.some((w) => w.includes('Copyleft')))
  })
})

describe('engine exports', () => {
  it('exports markdown with sponsor link', () => {
    const md = exportMarkdown({ data: { summary: 'Test report', score: 78 }, title: 'Test' })
    assert.ok(md.includes('# Test'))
    assert.ok(md.includes('sponsors/Abdulmuiz44'))
    assert.ok(md.includes('Not legal or financial advice'))
  })

  it('exports json with meta', () => {
    const json = exportJson({ data: { result: 'ok' } })
    const parsed = JSON.parse(json)
    assert.equal(parsed.result, 'ok')
    assert.equal(parsed._meta.product, 'OpenSourceLane')
  })
})