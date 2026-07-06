export type MetadataSource = 'provided' | 'catalog' | 'github_public' | 'unknown'

export type Category =
  | 'project_management'
  | 'crm'
  | 'analytics'
  | 'monitoring'
  | 'auth'
  | 'database'
  | 'cms'
  | 'forms'
  | 'email'
  | 'automation'
  | 'customer_support'
  | 'documentation'
  | 'internal_tools'
  | 'video'
  | 'ai_tools'
  | 'devtools'
  | 'other'

export type DeploymentPreference = 'self_hosted' | 'managed' | 'cloud' | 'docker' | 'kubernetes'
export type BudgetLevel = 'low' | 'medium' | 'high'
export type RiskTolerance = 'low' | 'medium' | 'high'
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical'

export interface RepoMetadata {
  stars?: number
  forks?: number
  issues?: number
  openIssues?: number
  contributors?: number
  lastReleaseDaysAgo?: number
  lastCommitDaysAgo?: number
  hasDocker?: boolean
  hasSecurityPolicy?: boolean
  license?: string
}

export interface CatalogEntry {
  name: string
  repo: string
  category: Category
  replaces: string[]
  deployment: DeploymentPreference[]
  license: string
  bestFor: string[]
  tradeoffs: string[]
  selfHostingComplexity: 'low' | 'medium' | 'high'
  notes: string
  features?: string[]
}

export interface AnalyzeRepoInput {
  repo?: string
  repoUrl?: string
  category?: Category
  metadata?: RepoMetadata
  readme?: string
  docs?: string
  requirements?: string[]
}

export interface FindAlternativesInput {
  replace: string
  teamSize?: number
  budget?: BudgetLevel
  deployment?: DeploymentPreference
  requiredFeatures?: string[]
  riskTolerance?: RiskTolerance
}

export interface PlanMigrationInput {
  from: string
  to: string
  teamSize?: number
  currentWorkflow?: string[]
  constraints?: {
    downtime?: string
    hosting?: string
  }
}

export interface EstimateCostSavingsInput {
  currentTool: string
  teamSize?: number
  currentMonthlyCost: number
  hostingCost?: number
  maintenanceHoursPerMonth?: number
  hourlyRate?: number
}

export interface ScoreRiskInput {
  repo: string
  metadata?: RepoMetadata
  requirements?: string[]
  readme?: string
}

export interface GenerateAdoptionBriefInput {
  tool: string
  repo: string
  replace: string
  teamSize?: number
  analysis?: Record<string, unknown>
}

export interface CompareToolsInput {
  tools: Array<{ name: string; repo: string; metadata?: RepoMetadata }>
  criteria?: string[]
}

export interface GenerateDeploymentPlanInput {
  tool: string
  deployment?: string
  teamSize?: number
  environment?: string
}

export interface AuditLicenseInput {
  repo: string
  license?: string
  intendedUse?: string
}

export interface ExportInput {
  data: Record<string, unknown>
  title?: string
}

export interface ClientConfig {
  apiKey?: string
  baseUrl?: string
}

export interface UsageInfo {
  credits: number
  action: string
}

export interface HealthResponse {
  ok: boolean
  service: string
  version: string
  timestamp: string
  product: string
  status: string
}

export interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: string
  }
}

export interface BillingResult {
  success: boolean
  error?: string
  code?: string
  remainingCredits?: number
}