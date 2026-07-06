import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  CATALOG,
  SAAS_TOOLS,
  findByRepo,
  findByName,
  findByReplaces,
  parseRepoSlug,
} from '../src/catalog.js'

describe('catalog', () => {
  it('has seed entries', () => {
    assert.ok(CATALOG.length >= 20)
  })

  it('includes required alternatives', () => {
    const names = CATALOG.map((e) => e.name)
    for (const required of ['Plane', 'Taiga', 'Supabase', 'n8n', 'Namviek', 'Chatwoot', 'Cal.com']) {
      assert.ok(names.includes(required), `missing ${required}`)
    }
  })

  it('finds by repo slug', () => {
    assert.equal(findByRepo('makeplane/plane')?.name, 'Plane')
    assert.equal(findByRepo('https://github.com/hudy9x/namviek')?.name, 'Namviek')
  })

  it('finds by name', () => {
    assert.equal(findByName('PostHog')?.repo, 'PostHog/posthog')
  })

  it('finds by replaces', () => {
    const jira = findByReplaces('Jira')
    assert.ok(jira.length >= 3)
  })

  it('parses repo slugs', () => {
    assert.equal(parseRepoSlug('https://github.com/foo/bar/'), 'foo/bar')
    assert.equal(parseRepoSlug('foo/bar.git'), 'foo/bar')
  })

  it('lists known SaaS tools', () => {
    assert.ok(SAAS_TOOLS.includes('Jira'))
    assert.ok(SAAS_TOOLS.includes('Google Analytics'))
  })

  it('every entry has required fields', () => {
    for (const entry of CATALOG) {
      assert.ok(entry.name)
      assert.ok(entry.repo)
      assert.ok(entry.category)
      assert.ok(entry.replaces.length > 0)
      assert.ok(entry.license)
      assert.ok(entry.bestFor.length > 0)
      assert.ok(entry.tradeoffs.length > 0)
      assert.ok(['low', 'medium', 'high'].includes(entry.selfHostingComplexity))
    }
  })
})