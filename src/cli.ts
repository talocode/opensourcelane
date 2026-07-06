#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs'
import { config } from './config.js'
import { createOpenSourceLaneClient } from './client.js'
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
} from './engine.js'

const VERSION = config.version

function usage() {
  console.error(`OpenSourceLane v${VERSION} — Open-source software intelligence by Talocode`)
  console.error('')
  console.error('Usage:')
  console.error('  opensourcelane analyze --repo hudy9x/namviek')
  console.error('  opensourcelane alternatives --replace Jira --team-size 6')
  console.error('  opensourcelane migration --from Jira --to hudy9x/namviek --team-size 6')
  console.error('  opensourcelane cost --tool Jira --monthly-cost 80 --team-size 6')
  console.error('  opensourcelane risk --repo hudy9x/namviek')
  console.error('  opensourcelane brief --tool Namviek --repo hudy9x/namviek --replace Jira')
  console.error('  opensourcelane compare --tools "Plane:makeplane/plane,Taiga:kaleidos-ventures/taiga"')
  console.error('  opensourcelane deploy --tool Namviek --deployment docker')
  console.error('  opensourcelane license --repo hudy9x/namviek --license MIT')
  console.error('  opensourcelane export-markdown --file report.json')
  console.error('  opensourcelane export-json --file report.json')
  console.error('  opensourcelane health')
  console.error('  opensourcelane config')
  console.error('  opensourcelane --help')
  console.error('  opensourcelane --version')
  console.error('')
  console.error('Flags: --cloud, --output <file>, --format json|markdown')
  console.error('Sponsor: https://github.com/sponsors/Abdulmuiz44')
  process.exit(1)
}

function parseArgs(): Record<string, string> {
  const args = process.argv.slice(2)
  if (args.length === 0) usage()
  if (args[0] === '--help' || args[0] === '-h') usage()
  if (args[0] === '--version' || args[0] === '-v') {
    console.log(VERSION)
    process.exit(0)
  }

  const parsed: Record<string, string> = {}
  let command = ''
  for (let i = 0; i < args.length; i++) {
    if (!command && !args[i].startsWith('--')) {
      command = args[i]
      continue
    }
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const next = args[i + 1]
      if (next && !next.startsWith('--')) {
        parsed[key] = next
        i++
      } else {
        parsed[key] = 'true'
      }
    }
  }
  parsed.command = command
  return parsed
}

function writeOutput(data: unknown, output?: string, format = 'json') {
  const text = format === 'markdown' && typeof data === 'object' && data && 'markdown' in (data as object)
    ? String((data as { markdown: string }).markdown)
    : typeof data === 'string'
      ? data
      : JSON.stringify(data, null, 2)

  if (output) {
    writeFileSync(output, text + '\n', 'utf-8')
  } else {
    process.stdout.write(text + '\n')
  }
}

function readJsonFile(file?: string): Record<string, unknown> {
  const raw = file && file !== '-' ? readFileSync(file, 'utf-8') : readFileSync(0, 'utf-8')
  return JSON.parse(raw) as Record<string, unknown>
}

function parseToolsList(spec: string): Array<{ name: string; repo: string }> {
  return spec.split(',').map((pair) => {
    const [name, repo] = pair.split(':')
    return { name: name.trim(), repo: repo.trim() }
  })
}

async function runCloud(command: string, args: Record<string, string>, payload: Record<string, unknown>) {
  const client = createOpenSourceLaneClient()
  const routes: Record<string, () => Promise<unknown>> = {
    analyze: () => client.repo.analyze(payload as never),
    alternatives: () => client.alternatives.find(payload as never),
    migration: () => client.migration.plan(payload as never),
    cost: () => client.cost.estimate(payload as never),
    risk: () => client.risk.score(payload as never),
    brief: () => client.brief.generate(payload as never),
    compare: () => client.tools.compare(payload as never),
    deploy: () => client.deployment.plan(payload as never),
    license: () => client.license.audit(payload as never),
    'export-markdown': () => client.export.markdown(payload as never),
    'export-json': () => client.export.json(payload as never),
    health: () => client.health(),
  }
  const fn = routes[command]
  if (!fn) throw new Error(`Unknown cloud command: ${command}`)
  return fn()
}

async function main() {
  const args = parseArgs()
  const command = args.command
  const useCloud = args.cloud === 'true'
  const format = args.format || 'json'

  if (command === 'config') {
    writeOutput({
      version: VERSION,
      baseUrl: config.talocodeBaseUrl,
      allowLocalUnauth: config.allowLocalUnauth,
      hasApiKey: Boolean(config.talocodeApiKey),
    })
    return
  }

  if (command === 'health') {
    if (useCloud) {
      writeOutput(await runCloud('health', args, {}))
      return
    }
    writeOutput({
      ok: true,
      service: config.service,
      version: VERSION,
      product: 'OpenSourceLane',
      status: 'ok',
    })
    return
  }

  const localHandlers: Record<string, () => unknown> = {
    analyze: () => analyzeRepo({
      repo: args.repo,
      category: args.category as never,
      requirements: args.requirements?.split(','),
      metadata: args.metadata ? JSON.parse(args.metadata) : undefined,
    }),
    alternatives: () => findAlternatives({
      replace: args.replace || 'Jira',
      teamSize: args['team-size'] ? Number(args['team-size']) : undefined,
      budget: args.budget as never,
      deployment: args.deployment as never,
      requiredFeatures: args.features?.split(','),
      riskTolerance: args['risk-tolerance'] as never,
    }),
    migration: () => planMigration({
      from: args.from || 'Jira',
      to: args.to || 'hudy9x/namviek',
      teamSize: args['team-size'] ? Number(args['team-size']) : undefined,
      currentWorkflow: args.workflow?.split(','),
    }),
    cost: () => estimateCostSavings({
      currentTool: args.tool || args.replace || 'Jira',
      teamSize: args['team-size'] ? Number(args['team-size']) : undefined,
      currentMonthlyCost: Number(args['monthly-cost'] || 80),
      hostingCost: args['hosting-cost'] ? Number(args['hosting-cost']) : undefined,
      maintenanceHoursPerMonth: args['maintenance-hours'] ? Number(args['maintenance-hours']) : undefined,
      hourlyRate: args['hourly-rate'] ? Number(args['hourly-rate']) : undefined,
    }),
    risk: () => scoreRisk({
      repo: args.repo || 'hudy9x/namviek',
      metadata: args.metadata ? JSON.parse(args.metadata) : undefined,
      requirements: args.requirements?.split(','),
    }),
    brief: () => generateAdoptionBrief({
      tool: args.tool || 'Namviek',
      repo: args.repo || 'hudy9x/namviek',
      replace: args.replace || 'Jira',
      teamSize: args['team-size'] ? Number(args['team-size']) : undefined,
    }),
    compare: () => compareTools({
      tools: args.tools ? parseToolsList(args.tools) : [
        { name: 'Plane', repo: 'makeplane/plane' },
        { name: 'Taiga', repo: 'kaleidos-ventures/taiga' },
      ],
      criteria: args.criteria?.split(','),
    }),
    deploy: () => generateDeploymentPlan({
      tool: args.tool || 'Namviek',
      deployment: args.deployment,
      teamSize: args['team-size'] ? Number(args['team-size']) : undefined,
      environment: args.environment,
    }),
    license: () => auditLicense({
      repo: args.repo || 'hudy9x/namviek',
      license: args.license,
      intendedUse: args['intended-use'],
    }),
    'export-markdown': () => ({ markdown: exportMarkdown({ data: readJsonFile(args.file), title: args.title }) }),
    'export-json': () => ({ json: exportJson({ data: readJsonFile(args.file), title: args.title }) }),
  }

  if (useCloud) {
    const payloads: Record<string, Record<string, unknown>> = {
      analyze: { repo: args.repo, requirements: args.requirements?.split(',') },
      alternatives: { replace: args.replace, teamSize: Number(args['team-size'] || 6), requiredFeatures: args.features?.split(',') },
      migration: { from: args.from, to: args.to, teamSize: Number(args['team-size'] || 6) },
      cost: { currentTool: args.tool, currentMonthlyCost: Number(args['monthly-cost'] || 80), teamSize: Number(args['team-size'] || 6) },
      risk: { repo: args.repo },
      brief: { tool: args.tool, repo: args.repo, replace: args.replace, teamSize: Number(args['team-size'] || 6) },
      compare: { tools: args.tools ? parseToolsList(args.tools) : undefined },
      deploy: { tool: args.tool, deployment: args.deployment },
      license: { repo: args.repo, license: args.license },
      'export-markdown': { data: args.file ? readJsonFile(args.file) : {} },
      'export-json': { data: args.file ? readJsonFile(args.file) : {} },
    }
    writeOutput(await runCloud(command, args, payloads[command] || {}), args.output, format)
    return
  }

  const handler = localHandlers[command]
  if (!handler) usage()

  writeOutput(handler(), args.output, format)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err))
  process.exit(1)
})