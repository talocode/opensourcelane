import type { IncomingMessage } from 'node:http'
import { OpenSourceLaneAuthError } from './errors.js'

export function extractApiKey(req: IncomingMessage): string | null {
  const auth = req.headers['authorization']
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    return auth.slice(7).trim()
  }
  const xKey = req.headers['x-api-key']
  if (typeof xKey === 'string') {
    return xKey.trim()
  }
  return null
}

export function redactApiKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '...' + key.slice(-4)
}

export function validateApiKey(key: string): boolean {
  return typeof key === 'string' && key.length > 0
}

export function requireAuth(req: IncomingMessage): string {
  const key = extractApiKey(req)
  if (!key || !validateApiKey(key)) {
    throw new OpenSourceLaneAuthError(
      'Provide a valid API key via Authorization: Bearer or X-Api-Key header.',
    )
  }
  return key
}

export function redactSecrets(text: string): string {
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/(api[_-]?key["']?\s*[:=]\s*["']?)[^"'\s]+/gi, '$1[redacted]')
}