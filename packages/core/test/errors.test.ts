import { describe, expect, it } from 'vitest'
import {
  AuthorizationError,
  BudgetExhaustedError,
  AllowlistDeniedError,
  RateLimitExceededError,
  AuthorizationExpiredError,
  ExecutionError,
  NetworkError,
  GasEstimationError,
  BroadcastError,
  ReorgDetectedError,
} from '../src/errors.js'

describe('AuthorizationError', () => {
  it('creates with code and message', () => {
    const err = new AuthorizationError('test_code', 'test message')
    expect(err.code).toBe('test_code')
    expect(err.message).toBe('test message')
    expect(err.name).toBe('AuthorizationError')
  })
})

describe('BudgetExhaustedError', () => {
  it('sets correct code and properties', () => {
    const err = new BudgetExhaustedError('pol_1', 100n, 500n)
    expect(err.code).toBe('budget_exhausted')
    expect(err.budgetUsed).toBe(100n)
    expect(err.budgetLimit).toBe(500n)
    expect(err.policyId).toBe('pol_1')
    expect(err.message).toContain('100')
    expect(err.message).toContain('500')
  })
})

describe('AllowlistDeniedError', () => {
  it('sets correct code and target', () => {
    const err = new AllowlistDeniedError('pol_1', 'openai:gpt-4')
    expect(err.code).toBe('allowlist_denied')
    expect(err.target).toBe('openai:gpt-4')
    expect(err.message).toContain('openai:gpt-4')
  })
})

describe('RateLimitExceededError', () => {
  it('sets correct code and properties', () => {
    const err = new RateLimitExceededError('pol_1', 60_000, 10)
    expect(err.code).toBe('rate_limit_exceeded')
    expect(err.windowMs).toBe(60_000)
    expect(err.maxCalls).toBe(10)
  })
})

describe('AuthorizationExpiredError', () => {
  it('sets correct code', () => {
    const err = new AuthorizationExpiredError()
    expect(err.code).toBe('authorization_expired')
  })
})

describe('ExecutionError', () => {
  it('creates with code and message', () => {
    const err = new ExecutionError('exec_code', 'exec message')
    expect(err.code).toBe('exec_code')
    expect(err.name).toBe('ExecutionError')
  })
})

describe('NetworkError', () => {
  it('sets correct code', () => {
    const err = new NetworkError('connection refused')
    expect(err.code).toBe('network_error')
    expect(err.message).toBe('connection refused')
  })
})

describe('GasEstimationError', () => {
  it('sets correct code', () => {
    const err = new GasEstimationError('gas too high')
    expect(err.code).toBe('gas_estimation_error')
  })
})

describe('BroadcastError', () => {
  it('sets correct code', () => {
    const err = new BroadcastError('tx failed')
    expect(err.code).toBe('broadcast_error')
  })
})

describe('ReorgDetectedError', () => {
  it('sets correct code and depth', () => {
    const err = new ReorgDetectedError(3)
    expect(err.code).toBe('reorg_detected')
    expect(err.depth).toBe(3)
  })
})
