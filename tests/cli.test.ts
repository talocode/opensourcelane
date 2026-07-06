import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

describe('cli', () => {
  it('runs --version', () => {
    if (!existsSync('dist/cli.js')) {
      execSync('npm run build', { stdio: 'pipe' })
    }
    const out = execSync('node dist/cli.js --version', { encoding: 'utf-8' }).trim()
    assert.equal(out, '0.1.0')
  })

  it('runs alternatives locally', () => {
    const out = execSync('node dist/cli.js alternatives --replace Jira --team-size 6', { encoding: 'utf-8' })
    const parsed = JSON.parse(out)
    assert.ok(parsed.alternatives.length > 0)
  })

  it('runs cost estimate locally', () => {
    const out = execSync('node dist/cli.js cost --tool Jira --monthly-cost 80 --team-size 6', { encoding: 'utf-8' })
    const parsed = JSON.parse(out)
    assert.equal(parsed.monthlySavings, 30)
  })

  it('runs risk score locally', () => {
    const out = execSync('node dist/cli.js risk --repo hudy9x/namviek', { encoding: 'utf-8' })
    const parsed = JSON.parse(out)
    assert.ok(parsed.riskScore >= 0)
    assert.ok(parsed.riskLevel)
  })
})