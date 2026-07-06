import {
  findAlternatives,
  analyzeRepo,
  planMigration,
  estimateCostSavings,
} from '@talocode/opensourcelane'

const alternatives = findAlternatives({
  replace: 'Jira',
  teamSize: 6,
  requiredFeatures: ['kanban', 'issues'],
})

const analysis = analyzeRepo({
  repo: 'hudy9x/namviek',
  metadata: { stars: 3000, contributors: 6 },
})

const migration = planMigration({
  from: 'Jira',
  to: 'hudy9x/namviek',
  teamSize: 6,
})

const savings = estimateCostSavings({
  currentTool: 'Jira',
  currentMonthlyCost: 80,
  teamSize: 6,
})

console.log({ alternatives, analysis, migration, savings })