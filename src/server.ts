import http from 'node:http'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { config } from './config.js'
import { extractApiKey, requireAuth, validateApiKey } from './auth.js'
import { chargeCredits, PRICING } from './billing.js'
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
import {
  OpenSourceLaneAuthError,
  OpenSourceLaneInsufficientCreditsError,
  OpenSourceLaneValidationError,
} from './errors.js'
import type { ErrorResponse, HealthResponse, UsageInfo } from './types.js'

const VERSION = config.version
const SERVICE = config.service

function generateId(prefix = 'osl_req_'): string {
  return prefix + crypto.randomBytes(12).toString('hex')
}

function jsonResponse(res: http.ServerResponse, status: number, data: unknown, requestId?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (requestId) headers['x-request-id'] = requestId
  res.writeHead(status, headers)
  res.end(JSON.stringify(data))
}

function errorJson(code: string, message: string, details?: string): ErrorResponse {
  return { error: { code, message, ...(details ? { details } : {}) } }
}

function readBody(req: http.IncomingMessage, maxBytes = config.maxBodyBytes): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    const timer = setTimeout(() => {
      const err = new Error('Request timeout')
      ;(err as Error & { code?: string }).code = 'REQUEST_TIMEOUT'
      req.destroy(err)
      reject(err)
    }, config.requestTimeoutMs)

    req.on('data', (chunk: Buffer) => {
      total += chunk.length
      if (total > maxBytes) {
        const err = new Error('Request body too large')
        ;(err as Error & { code?: string }).code = 'PAYLOAD_TOO_LARGE'
        req.destroy(err)
        reject(err)
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      clearTimeout(timer)
      resolve(Buffer.concat(chunks).toString('utf-8'))
    })
    req.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

function buildUsage(action: string): UsageInfo {
  return { credits: PRICING[action] || 0, action }
}

async function maybeCharge(
  isHosted: boolean,
  action: string,
  apiKey: string | null,
  metadata: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; status: number; body: ErrorResponse }> {
  if (!isHosted) return { ok: true }

  const credits = PRICING[action]
  const billing = await chargeCredits(action, credits, metadata, apiKey || undefined)
  if (!billing.success) {
    const code = billing.code || 'billing_unavailable'
    const status = code === 'auth_error' ? 401 : code === 'insufficient_credits' ? 402 : 502
    return {
      ok: false,
      status,
      body: errorJson(code, billing.error || 'Billing failed'),
    }
  }
  return { ok: true }
}

export async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const requestId = generateId()

  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
    const method = req.method || 'GET'
    const path = url.pathname

    if (method === 'GET' && (path === '/health' || path === '/v1/opensourcelane/health')) {
      const response: HealthResponse = {
        ok: true,
        service: SERVICE,
        version: VERSION,
        timestamp: new Date().toISOString(),
        product: 'OpenSourceLane',
        status: 'ok',
      }
      return jsonResponse(res, 200, response, requestId)
    }

    if (method !== 'POST') {
      return jsonResponse(res, 405, errorJson('METHOD_NOT_ALLOWED', 'Method not allowed'), requestId)
    }

    const bodyStr = await readBody(req)
    let body: Record<string, unknown>
    try {
      body = JSON.parse(bodyStr)
    } catch {
      return jsonResponse(res, 400, errorJson('INVALID_JSON', 'Invalid JSON body'), requestId)
    }

    let apiKey: string | null = null
    if (!config.allowLocalUnauth) {
      apiKey = requireAuth(req)
    } else {
      apiKey = extractApiKey(req)
      if (apiKey && !validateApiKey(apiKey)) apiKey = null
    }

    const isHosted = Boolean(apiKey)

    const routeHandlers: Record<string, () => Promise<void>> = {
      '/v1/opensourcelane/repo/analyze': async () => {
        const action = 'opensourcelane.repo.analyze'
        if (!body.repo && !body.repoUrl) {
          return jsonResponse(res, 400, errorJson('validation_error', 'repo or repoUrl is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path, repo: body.repo })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = analyzeRepo({
          repo: body.repo as string | undefined,
          repoUrl: body.repoUrl as string | undefined,
          category: body.category as never,
          metadata: body.metadata as never,
          readme: body.readme as string | undefined,
          requirements: body.requirements as string[] | undefined,
        })

        return jsonResponse(res, 200, {
          id: generateId(),
          object: 'opensourcelane.repo_analysis',
          result,
          usage: buildUsage(action),
        }, requestId)
      },

      '/v1/opensourcelane/alternatives/find': async () => {
        const action = 'opensourcelane.alternatives.find'
        if (!body.replace) {
          return jsonResponse(res, 400, errorJson('validation_error', 'replace is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path, replace: body.replace })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = findAlternatives({
          replace: String(body.replace),
          teamSize: body.teamSize as number | undefined,
          budget: body.budget as never,
          deployment: body.deployment as never,
          requiredFeatures: body.requiredFeatures as string[] | undefined,
          riskTolerance: body.riskTolerance as never,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/migration/plan': async () => {
        const action = 'opensourcelane.migration.plan'
        if (!body.from || !body.to) {
          return jsonResponse(res, 400, errorJson('validation_error', 'from and to are required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = planMigration({
          from: String(body.from),
          to: String(body.to),
          teamSize: body.teamSize as number | undefined,
          currentWorkflow: body.currentWorkflow as string[] | undefined,
          constraints: body.constraints as never,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/cost/estimate': async () => {
        const action = 'opensourcelane.cost.estimate'
        if (!body.currentTool || body.currentMonthlyCost === undefined) {
          return jsonResponse(res, 400, errorJson('validation_error', 'currentTool and currentMonthlyCost are required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = estimateCostSavings({
          currentTool: String(body.currentTool),
          teamSize: body.teamSize as number | undefined,
          currentMonthlyCost: Number(body.currentMonthlyCost),
          hostingCost: body.hostingCost as number | undefined,
          maintenanceHoursPerMonth: body.maintenanceHoursPerMonth as number | undefined,
          hourlyRate: body.hourlyRate as number | undefined,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/risk/score': async () => {
        const action = 'opensourcelane.risk.score'
        if (!body.repo) {
          return jsonResponse(res, 400, errorJson('validation_error', 'repo is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path, repo: body.repo })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = scoreRisk({
          repo: String(body.repo),
          metadata: body.metadata as never,
          requirements: body.requirements as string[] | undefined,
          readme: body.readme as string | undefined,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/brief/generate': async () => {
        const action = 'opensourcelane.brief.generate'
        if (!body.tool || !body.repo || !body.replace) {
          return jsonResponse(res, 400, errorJson('validation_error', 'tool, repo, and replace are required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = generateAdoptionBrief({
          tool: String(body.tool),
          repo: String(body.repo),
          replace: String(body.replace),
          teamSize: body.teamSize as number | undefined,
          analysis: body.analysis as Record<string, unknown> | undefined,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/tools/compare': async () => {
        const action = 'opensourcelane.tools.compare'
        if (!body.tools || !Array.isArray(body.tools)) {
          return jsonResponse(res, 400, errorJson('validation_error', 'tools array is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = compareTools({
          tools: body.tools as never,
          criteria: body.criteria as string[] | undefined,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/deployment/plan': async () => {
        const action = 'opensourcelane.deployment.plan'
        if (!body.tool) {
          return jsonResponse(res, 400, errorJson('validation_error', 'tool is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = generateDeploymentPlan({
          tool: String(body.tool),
          deployment: body.deployment as string | undefined,
          teamSize: body.teamSize as number | undefined,
          environment: body.environment as string | undefined,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/license/audit': async () => {
        const action = 'opensourcelane.license.audit'
        if (!body.repo) {
          return jsonResponse(res, 400, errorJson('validation_error', 'repo is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const result = auditLicense({
          repo: String(body.repo),
          license: body.license as string | undefined,
          intendedUse: body.intendedUse as string | undefined,
        })

        return jsonResponse(res, 200, { result, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/export/markdown': async () => {
        const action = 'opensourcelane.export.markdown'
        if (!body.data && !body.report) {
          return jsonResponse(res, 400, errorJson('validation_error', 'data is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const markdown = exportMarkdown({
          data: (body.data || body.report) as Record<string, unknown>,
          title: body.title as string | undefined,
        })
        return jsonResponse(res, 200, { result: { markdown }, usage: buildUsage(action) }, requestId)
      },

      '/v1/opensourcelane/export/json': async () => {
        const action = 'opensourcelane.export.json'
        if (!body.data && !body.report) {
          return jsonResponse(res, 400, errorJson('validation_error', 'data is required'), requestId)
        }
        const billing = await maybeCharge(isHosted, action, apiKey, { route: path })
        if (!billing.ok) return jsonResponse(res, billing.status, billing.body, requestId)

        const json = exportJson({
          data: (body.data || body.report) as Record<string, unknown>,
          title: body.title as string | undefined,
        })
        return jsonResponse(res, 200, { result: { json }, usage: buildUsage(action) }, requestId)
      },
    }

    const handler = routeHandlers[path]
    if (!handler) {
      return jsonResponse(res, 404, errorJson('NOT_FOUND', 'Not found'), requestId)
    }

    await handler()
  } catch (err) {
    if (err instanceof OpenSourceLaneAuthError) {
      return jsonResponse(res, 401, errorJson('auth_error', err.message), requestId)
    }
    if (err instanceof OpenSourceLaneInsufficientCreditsError) {
      return jsonResponse(res, 402, errorJson('insufficient_credits', err.message), requestId)
    }
    if (err instanceof OpenSourceLaneValidationError) {
      return jsonResponse(res, 400, errorJson('validation_error', err.message), requestId)
    }
    const message = err instanceof Error ? err.message : 'Internal server error'
    const code = (err as { code?: string }).code || 'INTERNAL_ERROR'
    return jsonResponse(res, 500, errorJson(code, message), requestId)
  }
}

const server = http.createServer((req, res) => {
  void handleRequest(req, res)
})

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain && process.env.OPENSOURCELANE_SERVER !== 'false') {
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`OpenSourceLane server v${VERSION} listening on 0.0.0.0:${config.port}`)
  })

  function shutdown() {
    console.log('OpenSourceLane shutting down...')
    server.close(() => process.exit(0))
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

export { server }