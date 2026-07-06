import {
  CATALOG,
  findByName,
  findByRepo,
  findByReplaces,
  parseRepoSlug,
  repoDisplayName,
} from './catalog.js'
import type {
  AnalyzeRepoInput,
  AuditLicenseInput,
  BudgetLevel,
  CatalogEntry,
  CompareToolsInput,
  DeploymentPreference,
  EstimateCostSavingsInput,
  ExportInput,
  FindAlternativesInput,
  GenerateAdoptionBriefInput,
  GenerateDeploymentPlanInput,
  MetadataSource,
  PlanMigrationInput,
  RepoMetadata,
  RiskLevel,
  RiskTolerance,
  ScoreRiskInput,
} from './types.js'

export const DISCLAIMERS = {
  notLegalAdvice: 'Not legal advice. Consult qualified counsel for license compliance.',
  notFinancialAdvice: 'Estimate only. Not financial advice.',
  heuristicRisk: 'Risk scores are heuristic signals — not security audits or guarantees.',
  popularityWarning: 'Popularity alone does not indicate safety or suitability.',
  missingMetadata: 'Some metadata was unavailable. Scores may be less reliable.',
} as const

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)))
}

function normalizeSaas(name: string): string {
  return name.trim()
}

function resolveCatalogEntry(repo?: string, tool?: string): CatalogEntry | undefined {
  if (repo) {
    const entry = findByRepo(repo)
    if (entry) return entry
  }
  if (tool) return findByName(tool)
  return undefined
}

function detectMetadataSource(input: AnalyzeRepoInput | ScoreRiskInput, catalog?: CatalogEntry): MetadataSource {
  if (input.metadata && Object.keys(input.metadata).length > 0) return 'provided'
  if (catalog) return 'catalog'
  return 'unknown'
}

function readmeQualityScore(readme?: string): number {
  if (!readme) return 20
  let score = 40
  if (readme.length > 500) score += 15
  if (readme.length > 2000) score += 10
  if (/docker|self[- ]?host|install/i.test(readme)) score += 15
  if (/license/i.test(readme)) score += 10
  if (/##\s/i.test(readme)) score += 10
  return clamp(score)
}

function featureFitScore(entry: CatalogEntry | undefined, requirements: string[] = []): number {
  if (!requirements.length) return entry ? 70 : 50
  if (!entry?.features?.length) return 40
  const matched = requirements.filter((r) =>
    entry.features!.some((f) => f.toLowerCase().includes(r.toLowerCase()) || r.toLowerCase().includes(f.toLowerCase())),
  )
  return clamp(30 + (matched.length / requirements.length) * 70)
}

function maintenanceHealthScore(metadata?: RepoMetadata, catalog?: CatalogEntry): number {
  let score = 50
  if (!metadata && !catalog) return 35

  if (metadata?.lastCommitDaysAgo !== undefined) {
    if (metadata.lastCommitDaysAgo <= 30) score += 20
    else if (metadata.lastCommitDaysAgo <= 90) score += 10
    else if (metadata.lastCommitDaysAgo > 365) score -= 25
  }

  if (metadata?.lastReleaseDaysAgo !== undefined) {
    if (metadata.lastReleaseDaysAgo <= 60) score += 15
    else if (metadata.lastReleaseDaysAgo > 365) score -= 20
  }

  if (metadata?.contributors !== undefined) {
    if (metadata.contributors >= 10) score += 10
    else if (metadata.contributors <= 2) score -= 15
  }

  if (metadata?.openIssues !== undefined && metadata?.stars) {
    const ratio = metadata.openIssues / Math.max(metadata.stars, 1)
    if (ratio > 0.1) score -= 10
    else if (ratio < 0.02) score += 5
  }

  return clamp(score)
}

export function scoreRisk(input: ScoreRiskInput) {
  const repo = parseRepoSlug(input.repo)
  const catalog = findByRepo(repo)
  const metadata = input.metadata || {}
  const metadataSource = detectMetadataSource(input, catalog)
  const warnings: string[] = [DISCLAIMERS.heuristicRisk]

  if (metadataSource === 'unknown') {
    warnings.push(DISCLAIMERS.missingMetadata)
  }

  let riskScore = 50
  const signals: Array<{ signal: string; impact: 'positive' | 'negative' | 'neutral'; weight: number }> = []

  if (metadata.lastCommitDaysAgo !== undefined) {
    if (metadata.lastCommitDaysAgo > 365) {
      riskScore += 20
      signals.push({ signal: 'No recent commits (>365 days)', impact: 'negative', weight: 20 })
    } else if (metadata.lastCommitDaysAgo <= 30) {
      riskScore -= 10
      signals.push({ signal: 'Recent commit activity', impact: 'positive', weight: 10 })
    }
  } else if (metadataSource === 'unknown') {
    riskScore += 10
    signals.push({ signal: 'Commit activity unknown', impact: 'negative', weight: 10 })
  }

  if (metadata.lastReleaseDaysAgo !== undefined) {
    if (metadata.lastReleaseDaysAgo > 365) {
      riskScore += 15
      signals.push({ signal: 'Stale releases (>365 days)', impact: 'negative', weight: 15 })
    }
  }

  if (metadata.contributors !== undefined && metadata.contributors <= 2) {
    riskScore += 15
    signals.push({ signal: 'Low maintainer count (bus factor)', impact: 'negative', weight: 15 })
  }

  const license = metadata.license || catalog?.license
  if (!license) {
    riskScore += 10
    signals.push({ signal: 'License not identified', impact: 'negative', weight: 10 })
    warnings.push('Verify license before production use.')
  } else if (/AGPL|GPL/i.test(license)) {
    riskScore += 5
    signals.push({ signal: `Copyleft license (${license})`, impact: 'neutral', weight: 5 })
    warnings.push(`Review obligations for ${license}. ${DISCLAIMERS.notLegalAdvice}`)
  }

  if (metadata.hasDocker === false) {
    riskScore += 8
    signals.push({ signal: 'No Docker/self-hosting signals', impact: 'negative', weight: 8 })
  } else if (metadata.hasDocker) {
    riskScore -= 5
    signals.push({ signal: 'Docker support indicated', impact: 'positive', weight: 5 })
  }

  if (!metadata.hasSecurityPolicy) {
    riskScore += 5
    signals.push({ signal: 'No security policy detected', impact: 'negative', weight: 5 })
  }

  if (metadata.stars !== undefined && metadata.stars > 10000) {
    signals.push({ signal: 'High star count (weak positive signal)', impact: 'positive', weight: 3 })
    warnings.push(DISCLAIMERS.popularityWarning)
  }

  const readmeScore = readmeQualityScore(input.readme)
  if (readmeScore < 40) {
    riskScore += 10
    signals.push({ signal: 'Limited README/docs quality', impact: 'negative', weight: 10 })
  }

  const missingFeatures = (input.requirements || []).filter((r) => {
    if (!catalog?.features) return true
    return !catalog.features.some((f) => f.toLowerCase().includes(r.toLowerCase()))
  })
  if (missingFeatures.length) {
    riskScore += missingFeatures.length * 5
    signals.push({
      signal: `Potentially missing features: ${missingFeatures.join(', ')}`,
      impact: 'negative',
      weight: missingFeatures.length * 5,
    })
  }

  if (catalog?.selfHostingComplexity === 'high') {
    riskScore += 10
    signals.push({ signal: 'High self-hosting complexity', impact: 'negative', weight: 10 })
  }

  riskScore = clamp(riskScore)
  const riskLevel: RiskLevel =
    riskScore >= 70 ? 'high' : riskScore >= 45 ? 'medium' : 'low'

  const recommendations: string[] = []
  if (riskLevel !== 'low') recommendations.push('Run a pilot with non-critical workloads first.')
  if (!license) recommendations.push('Confirm license terms with your legal team.')
  if (missingFeatures.length) recommendations.push('Validate feature gaps with a proof-of-concept.')
  recommendations.push('Monitor upstream releases and security advisories.')

  return {
    riskScore,
    riskLevel,
    signals,
    warnings,
    recommendations,
    metadataSource,
    repo,
  }
}

export function analyzeRepo(input: AnalyzeRepoInput) {
  const repo = input.repo ? parseRepoSlug(input.repo) : input.repoUrl ? parseRepoSlug(input.repoUrl) : ''
  if (!repo) {
    throw new Error('repo or repoUrl is required')
  }

  const catalog = findByRepo(repo)
  const metadataSource = detectMetadataSource(input, catalog)
  const name = repoDisplayName(repo, catalog)
  const category = input.category || catalog?.category || 'other'
  const metadata = input.metadata || {}

  const risk = scoreRisk({
    repo,
    metadata,
    requirements: input.requirements,
    readme: input.readme,
  })

  const adoptionBase = featureFitScore(catalog, input.requirements)
  const maintenance = maintenanceHealthScore(metadata, catalog)
  const docsScore = readmeQualityScore(input.readme || input.docs)
  const adoptionScore = clamp((adoptionBase * 0.4 + maintenance * 0.35 + docsScore * 0.25))

  const warnings: string[] = [...risk.warnings]
  if (metadataSource === 'unknown') warnings.push(DISCLAIMERS.missingMetadata)
  if (catalog?.license && /AGPL|GPL/i.test(catalog.license)) {
    warnings.push(`License ${catalog.license} may impose obligations. ${DISCLAIMERS.notLegalAdvice}`)
  }

  const features = catalog?.features || []
  const idealFor = catalog?.bestFor || ['Teams evaluating open-source alternatives']
  const risks = [
    ...risk.signals.filter((s) => s.impact === 'negative').map((s) => s.signal),
    ...(catalog?.tradeoffs || []),
  ]

  return {
    name,
    repo,
    category,
    summary: catalog?.notes || `${name} is an open-source project. Limited catalog metadata — verify before adoption.`,
    businessUseCase: catalog
      ? `Self-hosted alternative replacing ${catalog.replaces.join(', ')}`
      : 'Evaluate as potential SaaS replacement',
    replaces: catalog?.replaces || [],
    features,
    deployment: catalog?.deployment[0] || 'self_hosted',
    idealFor,
    risks: [...new Set(risks)],
    adoptionScore,
    riskScore: risk.riskScore,
    metadataSource,
    warnings: [...new Set(warnings)],
  }
}

function fitScoreForAlternative(
  entry: CatalogEntry,
  input: FindAlternativesInput,
): number {
  let score = 60

  score += featureFitScore(entry, input.requiredFeatures || []) * 0.25 - 15

  if (input.deployment) {
    if (entry.deployment.includes(input.deployment as DeploymentPreference)) score += 15
    else score -= 10
  }

  if (input.budget === 'low' && entry.selfHostingComplexity === 'low') score += 10
  if (input.budget === 'low' && entry.selfHostingComplexity === 'high') score -= 15

  if (input.teamSize !== undefined) {
    if (input.teamSize <= 10 && entry.selfHostingComplexity !== 'high') score += 5
    if (input.teamSize > 50 && entry.selfHostingComplexity === 'high') score -= 5
  }

  const riskTol = input.riskTolerance || 'medium'
  if (riskTol === 'low' && /AGPL|GPL/i.test(entry.license)) score -= 15
  if (riskTol === 'high' && entry.selfHostingComplexity === 'high') score += 5

  return clamp(score)
}

function migrationComplexity(entry: CatalogEntry): 'low' | 'medium' | 'high' {
  return entry.selfHostingComplexity
}

export function findAlternatives(input: FindAlternativesInput) {
  const replace = normalizeSaas(input.replace)
  let matches = findByReplaces(replace)

  if (!matches.length) {
    const partial = CATALOG.filter((e) =>
      e.replaces.some((r) => r.toLowerCase().includes(replace.toLowerCase()) || replace.toLowerCase().includes(r.toLowerCase()),
      ),
    )
    matches = partial
  }

  const warnings: string[] = [
    DISCLAIMERS.heuristicRisk,
    DISCLAIMERS.notFinancialAdvice,
  ]

  if (!matches.length) {
    warnings.push(`No catalog entries found for "${replace}". Results may be incomplete.`)
    return {
      alternatives: [],
      recommendation: `No known open-source alternatives in catalog for ${replace}. Consider expanding requirements or checking awesome-selfhosted lists.`,
      warnings,
    }
  }

  const alternatives = matches
    .map((entry) => {
      const fitScore = fitScoreForAlternative(entry, input)
      return {
        name: entry.name,
        repo: entry.repo,
        fitScore,
        category: entry.category,
        why: `Replaces ${entry.replaces.join(', ')}. ${entry.notes}`,
        tradeoffs: entry.tradeoffs,
        migrationComplexity: migrationComplexity(entry),
        license: entry.license,
        deployment: entry.deployment,
      }
    })
    .sort((a, b) => b.fitScore - a.fitScore)

  const top = alternatives[0]
  const recommendation = top
    ? `Top match: ${top.name} (${top.repo}) with fit score ${top.fitScore}. Start with a pilot comparing ${top.name} against ${replace} for your required features.`
    : 'No strong matches found.'

  if (top && /AGPL|GPL/i.test(top.license || '')) {
    warnings.push(`Top match uses ${top.license}. Review license obligations. ${DISCLAIMERS.notLegalAdvice}`)
  }

  return { alternatives, recommendation, warnings }
}

export function planMigration(input: PlanMigrationInput) {
  const from = normalizeSaas(input.from)
  const toRepo = parseRepoSlug(input.to)
  const catalog = findByRepo(toRepo) || findByName(input.to)
  const toName = repoDisplayName(toRepo, catalog)
  const teamSize = input.teamSize || 5
  const workflow = input.currentWorkflow || []

  const phases = [
    {
      name: 'Pre-migration audit',
      duration: '2-3 days',
      tasks: [
        `Inventory all ${from} data, users, and integrations`,
        'Document current workflows and permission models',
        'Identify feature gaps against target tool',
        'Review license and compliance requirements',
      ],
    },
    {
      name: 'Data export',
      duration: '1-2 days',
      tasks: [
        `Export data from ${from} (issues, users, attachments)`,
        'Validate export completeness',
        'Store backups in secure location',
      ],
    },
    {
      name: 'Pilot rollout',
      duration: '1 week',
      tasks: [
        `Deploy ${toName} in staging environment`,
        'Import sample data subset',
        `Test core workflows: ${workflow.join(', ') || 'primary workflows'}`,
        'Gather team feedback',
      ],
    },
    {
      name: 'Permissions & training',
      duration: '2-3 days',
      tasks: [
        'Map roles from source to target',
        'Configure SSO if required',
        `Train ${teamSize} team members on ${toName}`,
      ],
    },
    {
      name: 'Cutover',
      duration: '1-2 days',
      tasks: [
        'Final data migration',
        'DNS/URL redirects if applicable',
        'Disable write access to old system',
        'Monitor for issues',
      ],
    },
    {
      name: 'Rollback readiness',
      duration: 'ongoing',
      tasks: [
        'Keep read-only access to old system for 30 days',
        'Document rollback procedure',
        'Maintain data backups',
      ],
    },
  ]

  const dataToExport = [
    'User accounts and roles',
    'Core records (issues, tickets, entries)',
    'Attachments and media',
    'Workflow/automation configurations',
    'Audit logs',
  ]

  const featureMapping = workflow.map((w) => ({
    source: w,
    target: catalog?.features?.find((f) => f.toLowerCase().includes(w.toLowerCase())) || `Manual mapping for "${w}"`,
    status: catalog?.features?.some((f) => f.toLowerCase().includes(w.toLowerCase())) ? 'likely_supported' : 'needs_validation',
  }))

  const risks = [
    'Data loss during export — validate thoroughly',
    'Feature gaps may block some workflows',
    'Team adoption resistance',
    'Integration breakage with connected tools',
    DISCLAIMERS.heuristicRisk,
  ]

  if (catalog?.selfHostingComplexity === 'high') {
    risks.push('High self-hosting complexity may extend timeline')
  }

  const rollbackPlan = [
    'Maintain read-only access to source system',
    'Keep full data backup before cutover',
    'Define rollback trigger criteria (e.g., >20% workflow blocked)',
    'Assign rollback owner and communication plan',
  ]

  const successMetrics = [
    'All critical workflows functional in target',
    'Team satisfaction score > 70%',
    'No data loss verified by audit',
    'Response time within acceptable range',
    'Cost savings tracking started',
  ]

  const timelineWeeks = catalog?.selfHostingComplexity === 'high' ? '3-4 weeks' : '1-2 weeks'

  return {
    summary: `Migration plan from ${from} to ${toName} (${toRepo}) for a team of ${teamSize}.`,
    phases,
    dataToExport,
    featureMapping,
    risks,
    rollbackPlan,
    successMetrics,
    estimatedTimeline: timelineWeeks,
    warnings: [DISCLAIMERS.notLegalAdvice, DISCLAIMERS.notFinancialAdvice],
  }
}

export function estimateCostSavings(input: EstimateCostSavingsInput) {
  const teamSize = input.teamSize || 1
  const currentMonthly = input.currentMonthlyCost
  const hosting = input.hostingCost ?? 10
  const maintenanceHours = input.maintenanceHoursPerMonth ?? 4
  const hourlyRate = input.hourlyRate ?? 10
  const maintenanceCost = maintenanceHours * hourlyRate

  const estimatedOpenSourceMonthlyCost = hosting + maintenanceCost
  const monthlySavings = currentMonthly - estimatedOpenSourceMonthlyCost
  const yearlySavings = monthlySavings * 12

  const setupHours = 16 + teamSize * 2
  const setupCost = setupHours * hourlyRate
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(setupCost / monthlySavings) : null

  const assumptions = [
    `Current SaaS cost: $${currentMonthly}/month for ${teamSize} users`,
    `Self-hosting infra: $${hosting}/month`,
    `Maintenance: ${maintenanceHours} hours/month at $${hourlyRate}/hour`,
    `One-time setup estimate: ${setupHours} hours ($${setupCost})`,
    'Does not include training, migration, or opportunity costs',
  ]

  const warnings = [
    DISCLAIMERS.notFinancialAdvice,
    'Actual costs vary by provider, region, and team expertise.',
    'Hidden costs may include backups, monitoring, and security tooling.',
  ]

  return {
    currentMonthlyCost: currentMonthly,
    estimatedOpenSourceMonthlyCost,
    monthlySavings,
    yearlySavings,
    breakEvenMonths,
    setupCost,
    assumptions,
    warnings,
  }
}

export function generateAdoptionBrief(input: GenerateAdoptionBriefInput) {
  const catalog = findByRepo(parseRepoSlug(input.repo)) || findByName(input.tool)
  const analysis = input.analysis || {}
  const teamSize = input.teamSize || 5

  const risk = scoreRisk({
    repo: input.repo,
    metadata: (analysis.metadata as RepoMetadata) || {},
    requirements: [],
  })

  const bestFor = catalog?.bestFor || ['Teams exploring open-source alternatives']
  const notBestFor = [
    ...(catalog?.tradeoffs || []),
    ...(risk.riskLevel === 'high' ? ['High-risk adoption without pilot'] : []),
  ]

  let finalRecommendation: 'adopt' | 'pilot' | 'avoid' = 'pilot'
  if (risk.riskScore < 30 && catalog) finalRecommendation = 'adopt'
  if (risk.riskScore > 65) finalRecommendation = 'avoid'

  return {
    title: `Should your team adopt ${input.tool}?`,
    summary: `${input.tool} is being evaluated as a replacement for ${input.replace} by a team of ${teamSize}. Risk score: ${risk.riskScore}/100 (${risk.riskLevel}).`,
    bestFor,
    notBestFor,
    businessCase: catalog
      ? `${input.tool} replaces ${catalog.replaces.join(', ')}. ${catalog.notes}`
      : `Evaluate ${input.tool} against ${input.replace} requirements.`,
    risks: risk.signals.filter((s) => s.impact === 'negative').map((s) => s.signal),
    migrationPlan: [
      'Run 2-week pilot with core team',
      'Validate feature mapping',
      'Estimate true TCO including ops time',
      'Review license with legal if copyleft',
    ],
    finalRecommendation,
    warnings: [DISCLAIMERS.notLegalAdvice, DISCLAIMERS.notFinancialAdvice, DISCLAIMERS.heuristicRisk],
  }
}

export function compareTools(input: CompareToolsInput) {
  const criteria = input.criteria || ['features', 'maintenance', 'deployment', 'cost']
  const warnings = [DISCLAIMERS.heuristicRisk, DISCLAIMERS.missingMetadata]

  const comparison = input.tools.map((tool) => {
    const catalog = findByRepo(parseRepoSlug(tool.repo)) || findByName(tool.name)
    const metadata = tool.metadata || {}
    const risk = scoreRisk({ repo: tool.repo, metadata })
    const maintenance = maintenanceHealthScore(metadata, catalog)

    return {
      name: tool.name,
      repo: tool.repo,
      category: catalog?.category || 'other',
      license: catalog?.license || metadata.license || 'unknown',
      deployment: catalog?.deployment || ['self_hosted'],
      selfHostingComplexity: catalog?.selfHostingComplexity || 'medium',
      features: catalog?.features || [],
      riskScore: risk.riskScore,
      maintenanceScore: maintenance,
      tradeoffs: catalog?.tradeoffs || [],
      scores: {
        features: catalog?.features?.length ? clamp(catalog.features.length * 10) : 40,
        maintenance,
        deployment: catalog?.selfHostingComplexity === 'low' ? 85 : catalog?.selfHostingComplexity === 'medium' ? 65 : 45,
        cost: catalog?.selfHostingComplexity === 'low' ? 80 : 55,
      },
    }
  })

  const overallScores = comparison.map((c) => ({
    ...c,
    overall: clamp(
      Object.entries(c.scores)
        .filter(([k]) => criteria.includes(k))
        .reduce((sum, [, v]) => sum + v, 0) / Math.max(criteria.length, 1),
    ),
  }))

  overallScores.sort((a, b) => b.overall - a.overall)
  const winner = overallScores[0] || {}

  const tradeoffs = comparison.flatMap((c) =>
    c.tradeoffs.map((t) => `${c.name}: ${t}`),
  )

  const recommendation = winner.name
    ? `${winner.name} leads on selected criteria with overall score ${winner.overall}. Validate with a pilot before committing.`
    : 'Insufficient data to recommend a winner.'

  return { comparison: overallScores, winner, tradeoffs, recommendation, warnings }
}

export function generateDeploymentPlan(input: GenerateDeploymentPlanInput) {
  const catalog = findByName(input.tool)
  const deployment = input.deployment || 'docker'
  const teamSize = input.teamSize || 5
  const environment = input.environment || 'vps'

  const complexity = catalog?.selfHostingComplexity || 'medium'
  const infraCost = complexity === 'low' ? 5 : complexity === 'medium' ? 15 : 30

  const steps = [
    { step: 1, action: 'Provision server', detail: `${environment} with minimum 2 CPU, 4GB RAM (adjust for ${input.tool})` },
    { step: 2, action: 'Install dependencies', detail: deployment === 'docker' ? 'Docker and Docker Compose' : 'Runtime per project docs' },
    { step: 3, action: 'Configure environment', detail: 'Set secrets, database URL, and domain' },
    { step: 4, action: 'Deploy application', detail: `Deploy ${input.tool} using ${deployment}` },
    { step: 5, action: 'Configure reverse proxy', detail: 'TLS termination with Caddy or Nginx' },
    { step: 6, action: 'Set up backups', detail: 'Automated database and volume backups' },
    { step: 7, action: 'Configure monitoring', detail: 'Health checks and alerting' },
    { step: 8, action: 'User onboarding', detail: `Provision accounts for ${teamSize} team members` },
  ]

  const requirements = [
    'Server with public IP or internal network access',
    'Domain name with DNS control',
    'TLS certificate (Let\'s Encrypt recommended)',
    'Database (PostgreSQL/MySQL depending on tool)',
    'SMTP for email notifications (if applicable)',
  ]

  const securityChecklist = [
    'Enable firewall (allow only 80/443/SSH)',
    'Use strong admin passwords and 2FA',
    'Keep dependencies updated',
    'Configure automated security updates',
    'Restrict SSH access',
    'Enable audit logging',
    'Review default credentials',
  ]

  const backupPlan = [
    'Daily automated database backups',
    'Weekly full volume snapshots',
    'Test restore procedure monthly',
    'Off-site backup storage',
    'Document recovery time objective (RTO)',
  ]

  return {
    steps,
    requirements,
    estimatedMonthlyInfraCost: infraCost,
    securityChecklist,
    backupPlan,
    warnings: [DISCLAIMERS.heuristicRisk, 'Verify resource requirements in official docs.'],
  }
}

const LICENSE_RISK: Record<string, RiskLevel> = {
  MIT: 'low',
  'Apache-2.0': 'low',
  'BSD-3-Clause': 'low',
  'MPL-2.0': 'low',
  'GPL-2.0': 'medium',
  'GPL-3.0': 'medium',
  'AGPL-3.0': 'medium',
  'BSL-1.1': 'medium',
}

export function auditLicense(input: AuditLicenseInput) {
  const catalog = findByRepo(parseRepoSlug(input.repo))
  const license = input.license || catalog?.license || 'unknown'
  const intendedUse = input.intendedUse || 'general use'

  const riskLevel: RiskLevel = LICENSE_RISK[license] || (license === 'unknown' ? 'high' : 'medium')

  const obligations: string[] = []
  const warnings: string[] = [DISCLAIMERS.notLegalAdvice]

  if (/MIT|Apache|BSD/i.test(license)) {
    obligations.push('Include copyright notice and license text in distributions')
  }
  if (/GPL|AGPL/i.test(license)) {
    obligations.push('Source code availability obligations may apply')
    obligations.push('Derivative works may need to be open-sourced under same license')
    warnings.push('Copyleft license — consult legal counsel for internal/SaaS use.')
  }
  if (license === 'unknown') {
    obligations.push('Identify license before any production use')
    warnings.push('Unknown license is a significant legal risk.')
  }

  const summary = license === 'unknown'
    ? `License for ${input.repo} could not be determined. Do not deploy without verification.`
    : `${license} license detected for ${input.repo}. Intended use: ${intendedUse}. Risk level: ${riskLevel}.`

  return { license, riskLevel, summary, obligations, warnings }
}

export function exportMarkdown(input: ExportInput): string {
  const title = input.title || 'OpenSourceLane Report'
  const data = input.data
  const lines: string[] = [
    `# ${title}`,
    '',
    `Generated by [OpenSourceLane](https://github.com/talocode/opensourcelane) — ${new Date().toISOString()}`,
    '',
    '> Risk scores are heuristic. Not legal or financial advice.',
    '',
  ]

  function appendSection(obj: Record<string, unknown>, depth = 2) {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue
      const heading = '#'.repeat(Math.min(depth, 4)) + ' ' + key.replace(/([A-Z])/g, ' $1').trim()
      if (Array.isArray(value)) {
        lines.push(heading, '')
        for (const item of value) {
          if (typeof item === 'object' && item) {
            lines.push('- ' + JSON.stringify(item))
          } else {
            lines.push(`- ${item}`)
          }
        }
        lines.push('')
      } else if (typeof value === 'object') {
        lines.push(heading, '')
        appendSection(value as Record<string, unknown>, depth + 1)
      } else {
        lines.push(heading, '', String(value), '')
      }
    }
  }

  appendSection(data)
  lines.push('---', '', 'Sponsor: https://github.com/sponsors/Abdulmuiz44', '')
  return lines.join('\n')
}

export function exportJson(input: ExportInput): string {
  return JSON.stringify(
    {
      ...input.data,
      _meta: {
        generatedAt: new Date().toISOString(),
        product: 'OpenSourceLane',
        version: '0.1.0',
        disclaimer: 'Heuristic analysis only. Not legal or financial advice.',
      },
    },
    null,
    2,
  )
}