import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

describe('npm pack contents', () => {
  it('dist cli has shebang after build', () => {
    if (!existsSync('dist/cli.js')) {
      execSync('npm run build', { stdio: 'pipe' })
    }
    const cli = readFileSync('dist/cli.js', 'utf-8')
    assert.ok(cli.startsWith('#!/usr/bin/env node'))
  })

  it('package.json files field includes dist and README', () => {
    const pkg = JSON.parse(readFileSync('package.json', 'utf-8')) as { files: string[] }
    assert.ok(pkg.files.includes('dist'))
    assert.ok(pkg.files.includes('README.md'))
    assert.ok(pkg.files.includes('LICENSE'))
  })
})