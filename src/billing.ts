import crypto from 'node:crypto'
import { config } from './config.js'
import type { BillingResult } from './types.js'

export const PRICING: Record<string, number> = {
  'opensourcelane.repo.analyze': 25,
  'opensourcelane.alternatives.find': 30,
  'opensourcelane.migration.plan': 50,
  'opensourcelane.cost.estimate': 20,
  'opensourcelane.risk.score': 30,
  'opensourcelane.brief.generate': 40,
  'opensourcelane.tools.compare': 35,
  'opensourcelane.deployment.plan': 35,
  'opensourcelane.license.audit': 20,
  'opensourcelane.export.markdown': 5,
  'opensourcelane.export.json': 5,
}

export async function chargeCredits(
  action: string,
  credits: number,
  metadata?: Record<string, unknown>,
  apiKey?: string,
): Promise<BillingResult> {
  const key = apiKey || config.talocodeApiKey
  if (!key) {
    return { success: false, error: 'TALOCODE_API_KEY not configured', code: 'auth_error' }
  }

  const idempotencyKey = crypto.randomUUID()

  try {
    const response = await fetch(`${config.talocodeBaseUrl}/api/v1/cloud/usage/charge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        product: 'opensourcelane',
        action,
        credits,
        idempotencyKey,
        metadata: {
          product: 'opensourcelane',
          action,
          credits,
          ...metadata,
        },
      }),
    })

    if (response.status === 401) {
      return { success: false, error: 'Invalid or expired TALOCODE_API_KEY', code: 'auth_error' }
    }

    if (response.status === 402) {
      const body = await response.json().catch(() => ({}))
      return {
        success: false,
        error: (body as { error?: string }).error || 'Insufficient credits',
        code: 'insufficient_credits',
      }
    }

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      return {
        success: false,
        error: (body as { error?: string }).error || `Billing service error: ${response.status}`,
        code: 'billing_unavailable',
      }
    }

    const body = await response.json()
    return { success: true, remainingCredits: (body as { remainingCredits?: number }).remainingCredits }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown billing error'
    return { success: false, error: message, code: 'billing_unavailable' }
  }
}