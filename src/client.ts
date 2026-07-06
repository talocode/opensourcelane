import { config } from './config.js'
import {
  OpenSourceLaneAuthError,
  OpenSourceLaneInsufficientCreditsError,
  OpenSourceLaneMetadataError,
  OpenSourceLaneRateLimitError,
  OpenSourceLaneValidationError,
} from './errors.js'
import type {
  AnalyzeRepoInput,
  AuditLicenseInput,
  ClientConfig,
  CompareToolsInput,
  ErrorResponse,
  EstimateCostSavingsInput,
  ExportInput,
  FindAlternativesInput,
  GenerateAdoptionBriefInput,
  GenerateDeploymentPlanInput,
  HealthResponse,
  PlanMigrationInput,
  ScoreRiskInput,
} from './types.js'

export class OpenSourceLaneClient {
  private apiKey: string
  private baseUrl: string

  constructor(opts?: ClientConfig) {
    this.apiKey = opts?.apiKey || config.talocodeApiKey
    this.baseUrl = (opts?.baseUrl || config.talocodeBaseUrl).replace(/\/+$/, '')
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as ErrorResponse
      const message = errorBody.error?.message || `HTTP ${response.status}`
      const code = errorBody.error?.code

      switch (response.status) {
        case 401:
          throw new OpenSourceLaneAuthError(message)
        case 402:
          throw new OpenSourceLaneInsufficientCreditsError(message)
        case 400:
          if (code === 'metadata_error') throw new OpenSourceLaneMetadataError(message)
          throw new OpenSourceLaneValidationError(message)
        case 429:
          throw new OpenSourceLaneRateLimitError(message)
        default:
          throw new Error(message)
      }
    }

    return response.json() as Promise<T>
  }

  async health(): Promise<HealthResponse> {
    return this.request<HealthResponse>('GET', '/v1/opensourcelane/health')
  }

  repo = {
    analyze: (input: AnalyzeRepoInput) => this.request('POST', '/v1/opensourcelane/repo/analyze', input),
  }

  alternatives = {
    find: (input: FindAlternativesInput) => this.request('POST', '/v1/opensourcelane/alternatives/find', input),
  }

  migration = {
    plan: (input: PlanMigrationInput) => this.request('POST', '/v1/opensourcelane/migration/plan', input),
  }

  cost = {
    estimate: (input: EstimateCostSavingsInput) => this.request('POST', '/v1/opensourcelane/cost/estimate', input),
  }

  risk = {
    score: (input: ScoreRiskInput) => this.request('POST', '/v1/opensourcelane/risk/score', input),
  }

  brief = {
    generate: (input: GenerateAdoptionBriefInput) => this.request('POST', '/v1/opensourcelane/brief/generate', input),
  }

  tools = {
    compare: (input: CompareToolsInput) => this.request('POST', '/v1/opensourcelane/tools/compare', input),
  }

  deployment = {
    plan: (input: GenerateDeploymentPlanInput) => this.request('POST', '/v1/opensourcelane/deployment/plan', input),
  }

  license = {
    audit: (input: AuditLicenseInput) => this.request('POST', '/v1/opensourcelane/license/audit', input),
  }

  export = {
    markdown: (input: ExportInput) => this.request('POST', '/v1/opensourcelane/export/markdown', input),
    json: (input: ExportInput) => this.request('POST', '/v1/opensourcelane/export/json', input),
  }
}

export function createOpenSourceLaneClient(opts?: ClientConfig): OpenSourceLaneClient {
  return new OpenSourceLaneClient(opts)
}