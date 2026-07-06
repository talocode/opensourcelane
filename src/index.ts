export { OpenSourceLaneClient, createOpenSourceLaneClient } from './client.js'
export {
  analyzeRepo,
  findAlternatives,
  planMigration,
  estimateCostSavings,
  scoreRisk,
  generateAdoptionBrief,
  compareTools,
  generateDeploymentPlan,
  auditLicense,
  exportMarkdown,
  exportJson,
  DISCLAIMERS,
} from './engine.js'
export { CATALOG, SAAS_TOOLS, findByRepo, findByName, findByReplaces } from './catalog.js'
export { redactApiKey } from './auth.js'
export { PRICING } from './billing.js'
export { config } from './config.js'

export type {
  AnalyzeRepoInput,
  AuditLicenseInput,
  BudgetLevel,
  CatalogEntry,
  Category,
  ClientConfig,
  CompareToolsInput,
  DeploymentPreference,
  EstimateCostSavingsInput,
  ExportInput,
  FindAlternativesInput,
  GenerateAdoptionBriefInput,
  GenerateDeploymentPlanInput,
  HealthResponse,
  MetadataSource,
  PlanMigrationInput,
  RepoMetadata,
  RiskLevel,
  RiskTolerance,
  ScoreRiskInput,
  UsageInfo,
} from './types.js'

export {
  OpenSourceLaneError,
  OpenSourceLaneAuthError,
  OpenSourceLaneInsufficientCreditsError,
  OpenSourceLaneValidationError,
  OpenSourceLaneRateLimitError,
  OpenSourceLaneMetadataError,
} from './errors.js'