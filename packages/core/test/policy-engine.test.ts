import { describe, expect, it } from 'vitest'
import { PolicyEngine } from '../src/policy-engine.js'
import type {
  Actor,
  Intent,
  PolicyContext,
  PolicyMiddleware,
  PolicyEvaluator,
  BudgetState,
  PolicyResult,
} from '../src/types.js'

const defaultActor: Actor = {
  id: 'actor_1',
  name: 'test-agent',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const defaultIntent: Intent = {
  target: 'test:service',
  amount: 100n,
  purpose: { type: 'test', id: '1' },
}

const defaultBudget: BudgetState = {
  total: 1000n,
  used: 200n,
  remaining: 800n,
  period: 'monthly',
  currency: 'USDC',
}

function passMiddleware(id: string): PolicyEvaluator {
  return {
    id,
    type: 'pass',
    version: '1',
    middleware: async (_ctx, next) => {
      const result = await next()
      return result
    },
  }
}

function denyMiddleware(id: string): PolicyEvaluator {
  return {
    id,
    type: 'deny',
    version: '1',
    middleware: async (_ctx, _next) => ({
      policyId: id,
      policyType: 'deny',
      version: '1',
      decision: 'deny' as const,
      reason: { code: 'test_deny', message: 'denied by test' },
      evaluatedAt: new Date().toISOString(),
    }),
  }
}

describe('PolicyEngine', () => {
  it('returns approved for empty middleware list', async () => {
    const engine = new PolicyEngine([])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.decision).toBe('approved')
    expect(result.policyResults).toHaveLength(0)
  })

  it('evaluates all pass middlewares', async () => {
    const engine = new PolicyEngine([
      passMiddleware('pol_1'),
      passMiddleware('pol_2'),
    ])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.decision).toBe('approved')
    expect(result.policyResults).toHaveLength(2)
  })

  it('deny overrides pass results', async () => {
    const engine = new PolicyEngine([
      passMiddleware('pol_1'),
      denyMiddleware('pol_2'),
    ])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.decision).toBe('denied')
    expect(result.policyResults).toHaveLength(2)
  })

  it('includes actor version in authorization', async () => {
    const engine = new PolicyEngine([])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.actorVersion).toBe('1')
    expect(result.intent).toEqual(defaultIntent)
  })
})
