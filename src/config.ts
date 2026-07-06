function envFlag(name: string, defaultValue = true): boolean {
  const value = process.env[name]
  if (value === undefined) return defaultValue
  return value !== 'false'
}

export const config = {
  get port() {
    return parseInt(process.env.PORT || '3050', 10)
  },
  get talocodeBaseUrl() {
    return process.env.TALOCODE_BASE_URL || 'https://api.talocode.site'
  },
  get talocodeApiKey() {
    return process.env.TALOCODE_API_KEY || ''
  },
  get allowLocalUnauth() {
    return envFlag('OPENSOURCELANE_ALLOW_LOCAL_UNAUTH', true)
  },
  get githubToken() {
    return process.env.GITHUB_TOKEN || ''
  },
  version: '0.1.0',
  service: 'opensourcelane',
  maxBodyBytes: 2 * 1024 * 1024,
  requestTimeoutMs: 30000,
} as const