import { describe, expect, it } from 'vitest'
import { createBudgetCheckPolicy } from '../src/policies/budget-check.js'
import { createAllowlistPolicy } from '../src/policies/allowlist.js'
import { createMaxPerCallPolicy } from '../src/policies/max-per-call.js'
import { createRateLimitPolicy } from '../src/policies/rate-limit.js'
import type { Actor, Intent, BudgetState, PolicyResult } from '../src/types.js'

const defaultActor: Actor = {
  id: 'actor_1',
  name: 'test-agent',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const defaultBudget: BudgetState = {
  total: 1000n,
  used: 200n,
  remaining: 800n,
  period: 'monthly',
  currency: 'USDC',
}

async function evaluatePolicy(
  policy: { middleware: any },
  intent: Intent,
  budget: BudgetState = defaultBudget,
  actor: Actor = defaultActor
): Promise<PolicyResult> {
  const next = async () => ({
    policyId: 'test',
    policyType: 'test',
    version: '1',
    decision: 'pass' as const,
    reason: { code: 'noop', message: 'noop' },
    evaluatedAt: new Date().toISOString(),
  })
  return policy.middleware(
    { actor, intent, budget, evaluatedPolicies: [] },
    next
  )
}

describe('BudgetCheckPolicy', () => {
  it('passes when used + amount <= limit', async () => {
    const policy = createBudgetCheckPolicy('pol_budget', '1')
    const intent: Intent = {
      target: 'test:svc',
      amount: 300n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when used + amount > limit', async () => {
    const policy = createBudgetCheckPolicy('pol_budget', '1')
    const intent: Intent = {
      target: 'test:svc',
      amount: 900n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
    expect(result.reason.code).toBe('budget_exhausted')
  })

  it('uses budget from context', async () => {
    const policy = createBudgetCheckPolicy('pol_budget', '1')
    const intent: Intent = {
      target: 'test:svc',
      amount: 50n,
      purpose: { type: 'test', id: '1' },
    }
    const smallBudget: BudgetState = {
      total: 100n,
      used: 80n,
      remaining: 20n,
      period: 'total',
      currency: 'USDC',
    }
    const result = await evaluatePolicy(policy, intent, smallBudget)
    expect(result.decision).toBe('deny')
  })
})

describe('AllowlistPolicy', () => {
  it('passes when target is in allowlist', async () => {
    const policy = createAllowlistPolicy('pol_allow', '1', ['good:svc', 'better:svc'])
    const intent: Intent = {
      target: 'good:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when target is not in allowlist', async () => {
    const policy = createAllowlistPolicy('pol_allow', '1', ['good:svc'])
    const intent: Intent = {
      target: 'evil:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
    expect(result.reason.code).toBe('allowlist_denied')
  })
})

describe('MaxPerCallPolicy', () => {
  it('passes when amount <= max', async () => {
    const policy = createMaxPerCallPolicy('pol_max', '1', 500n)
    const intent: Intent = {
      target: 'test:svc',
      amount: 300n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when amount > max', async () => {
    const policy = createMaxPerCallPolicy('pol_max', '1', 500n)
    const intent: Intent = {
      target: 'test:svc',
      amount: 600n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
  })
})

describe('RateLimitPolicy', () => {
  it('passes when call count is within limit', async () => {
    const store = new Map<string, number[]>()
    const policy = createRateLimitPolicy('pol_rate', '1', 10, 60_000, store)
    const intent: Intent = {
      target: 'test:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when call count exceeds limit', async () => {
    const now = Date.now()
    const store = new Map<string, number[]>()
    store.set('actor_1', Array(10).fill(now - 1000))
    const policy = createRateLimitPolicy('pol_rate', '1', 10, 60_000, store)
    const intent: Intent = {
      target: 'test:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
    expect(result.reason.code).toBe('rate_limit_exceeded')
  })
})
