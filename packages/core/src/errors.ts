export interface ErrorCodeMessage {
  code: string
  message: string
}

export class AuthorizationError extends Error {
  public readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthorizationError'
    this.code = code
  }
}

export class BudgetExhaustedError extends AuthorizationError {
  public readonly policyId: string
  public readonly budgetUsed: bigint
  public readonly budgetLimit: bigint
  constructor(policyId: string, used: bigint, limit: bigint) {
    super(
      'budget_exhausted',
      `Budget exhausted: ${used} used of ${limit} limit`
    )
    this.name = 'BudgetExhaustedError'
    this.policyId = policyId
    this.budgetUsed = used
    this.budgetLimit = limit
  }
}

export class AllowlistDeniedError extends AuthorizationError {
  public readonly policyId: string
  public readonly target: string
  constructor(policyId: string, target: string) {
    super('allowlist_denied', `Target "${target}" not in allowlist`)
    this.name = 'AllowlistDeniedError'
    this.policyId = policyId
    this.target = target
  }
}

export class RateLimitExceededError extends AuthorizationError {
  public readonly policyId: string
  public readonly windowMs: number
  public readonly maxCalls: number
  constructor(policyId: string, windowMs: number, maxCalls: number) {
    super(
      'rate_limit_exceeded',
      `Rate limit exceeded: max ${maxCalls} calls per ${windowMs}ms window`
    )
    this.name = 'RateLimitExceededError'
    this.policyId = policyId
    this.windowMs = windowMs
    this.maxCalls = maxCalls
  }
}

export class AuthorizationExpiredError extends AuthorizationError {
  constructor() {
    super('authorization_expired', 'Authorization preview has expired. Re-simulate.')
    this.name = 'AuthorizationExpiredError'
  }
}

export class ExecutionError extends Error {
  public readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ExecutionError'
    this.code = code
  }
}

export class NetworkError extends ExecutionError {
  constructor(message: string) {
    super('network_error', message)
    this.name = 'NetworkError'
  }
}

export class GasEstimationError extends ExecutionError {
  constructor(message: string) {
    super('gas_estimation_error', message)
    this.name = 'GasEstimationError'
  }
}

export class BroadcastError extends ExecutionError {
  constructor(message: string) {
    super('broadcast_error', message)
    this.name = 'BroadcastError'
  }
}

export class ReorgDetectedError extends ExecutionError {
  constructor(public readonly depth: number) {
    super('reorg_detected', `Chain reorg detected at depth ${depth}`)
    this.name = 'ReorgDetectedError'
  }
}
