import { describe, expect, it } from 'vitest'
import { PolicyEngine } from '../src/policy-engine.js'
import { createBudgetCheckPolicy } from '../src/policies/budget-check.js'
import { createAllowlistPolicy } from '../src/policies/allowlist.js'
import { createMaxPerCallPolicy } from '../src/policies/max-per-call.js'
import type { Actor, Intent, BudgetState } from '../src/types.js'

const actor: Actor = {
  id: 'actor_test_1',
  name: 'test-agent',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const budget: BudgetState = {
  total: 100_000_000n,
  used: 10_000_000n,
  remaining: 90_000_000n,
  period: 'monthly',
  currency: 'USDC',
}

describe('Authorization Pipeline', () => {
  it('approves payment within all limits', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
      createMaxPerCallPolicy('pol_max', '1', 50_000_000n),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 5_000_000n,
      purpose: { type: 'llm-inference', id: 'test-1' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('approved')
    expect(auth.policyResults).toHaveLength(3)
  })

  it('denies payment exceeding budget', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 95_000_000n,
      purpose: { type: 'llm-inference', id: 'test-2' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('denied')
    const budgetResult = auth.policyResults.find((r) => r.policyType === 'budget-check')
    expect(budgetResult?.decision).toBe('deny')
  })

  it('denies payment to unauthorized target', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'evil:service',
      amount: 5_000_000n,
      purpose: { type: 'test', id: 'test-3' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('denied')
    const allowResult = auth.policyResults.find((r) => r.policyType === 'allowlist')
    expect(allowResult?.decision).toBe('deny')
  })

  it('deny overrides pass across all policy types', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createMaxPerCallPolicy('pol_max', '1', 1_000_000n),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 10_000_000n,
      purpose: { type: 'test', id: 'test-4' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('denied')
    expect(auth.policyResults.find((r) => r.policyType === 'budget-check')?.decision).toBe('pass')
    expect(auth.policyResults.find((r) => r.policyType === 'allowlist')?.decision).toBe('pass')
    expect(auth.policyResults.find((r) => r.policyType === 'max-per-call')?.decision).toBe('deny')
  })

  it('previewPay returns same result as pay without execution', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 5_000_000n,
      purpose: { type: 'test', id: 'preview-test' },
    }

    const auth1 = await engine.evaluate(actor, intent, budget)
    const auth2 = await engine.evaluate(actor, intent, budget)

    expect(auth1.decision).toBe(auth2.decision)
    expect(auth1.policyResults.map((r) => r.decision))
      .toEqual(auth2.policyResults.map((r) => r.decision))
  })
})
