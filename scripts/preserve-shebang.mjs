import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const cliPath = join(process.cwd(), 'dist', 'cli.js')
const content = readFileSync(cliPath, 'utf-8')
if (!content.startsWith('#!/usr/bin/env node')) {
  writeFileSync(cliPath, '#!/usr/bin/env node\n' + content)
}