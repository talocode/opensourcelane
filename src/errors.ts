export class OpenSourceLaneError extends Error {
  code: string
  status: number

  constructor(message: string, code: string, status = 500) {
    super(message)
    this.name = 'OpenSourceLaneError'
    this.code = code
    this.status = status
  }
}

export class OpenSourceLaneAuthError extends OpenSourceLaneError {
  constructor(message = 'Unauthorized') {
    super(message, 'auth_error', 401)
    this.name = 'OpenSourceLaneAuthError'
  }
}

export class OpenSourceLaneInsufficientCreditsError extends OpenSourceLaneError {
  constructor(message = 'Insufficient credits') {
    super(message, 'insufficient_credits', 402)
    this.name = 'OpenSourceLaneInsufficientCreditsError'
  }
}

export class OpenSourceLaneValidationError extends OpenSourceLaneError {
  constructor(message: string) {
    super(message, 'validation_error', 400)
    this.name = 'OpenSourceLaneValidationError'
  }
}

export class OpenSourceLaneRateLimitError extends OpenSourceLaneError {
  constructor(message = 'Rate limit exceeded') {
    super(message, 'rate_limited', 429)
    this.name = 'OpenSourceLaneRateLimitError'
  }
}

export class OpenSourceLaneMetadataError extends OpenSourceLaneError {
  constructor(message: string) {
    super(message, 'metadata_error', 400)
    this.name = 'OpenSourceLaneMetadataError'
  }
}