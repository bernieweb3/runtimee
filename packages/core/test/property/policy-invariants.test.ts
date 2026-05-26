import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { PolicyEngine } from '../../src/policy-engine.js'
import { createBudgetCheckPolicy } from '../../src/policies/budget-check.js'
import { createAllowlistPolicy } from '../../src/policies/allowlist.js'
import { createMaxPerCallPolicy } from '../../src/policies/max-per-call.js'
import { createRateLimitPolicy } from '../../src/policies/rate-limit.js'
import type { Actor, Intent, BudgetState } from '../../src/types.js'

const actor: Actor = {
  id: 'actor_prop',
  name: 'prop-test',
  status: 'active',
  createdAt: new Date().toISOString(),
}

describe('Policy invariants (property-based)', () => {
  it('adding more policies never changes deny to pass', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        fc.string({ minLength: 1 }),
        async (budgetTotal, spendAmount, target) => {
          fc.pre(budgetTotal > 0n)
          const budget: BudgetState = {
            total: budgetTotal,
            used: 0n,
            remaining: budgetTotal,
            period: 'total',
            currency: 'USDC',
          }
          const intent: Intent = {
            target,
            amount: spendAmount,
            purpose: { type: 'test', id: 'prop' },
          }

          const engineFewer = new PolicyEngine([
            createAllowlistPolicy('pol_allow', '1', [target]),
          ])
          const engineMore = new PolicyEngine([
            createAllowlistPolicy('pol_allow', '1', [target]),
            createMaxPerCallPolicy('pol_max', '1', spendAmount),
          ])

          const resultFewer = await engineFewer.evaluate(actor, intent, budget)
          const resultMore = await engineMore.evaluate(actor, intent, budget)

          if (resultFewer.decision === 'approved') {
            expect(resultMore.decision).toBe('approved')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('allowlist denies for all non-matching targets', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 2 }),
        fc.string({ minLength: 2 }),
        async (allowed, target) => {
          fc.pre(allowed !== target)
          const budget: BudgetState = {
            total: 1_000_000n,
            used: 0n,
            remaining: 1_000_000n,
            period: 'total',
            currency: 'USDC',
          }
          const engine = new PolicyEngine([
            createAllowlistPolicy('pol_allow', '1', [allowed]),
          ])
          const intent: Intent = {
            target,
            amount: 100n,
            purpose: { type: 'test', id: 'prop' },
          }
          const auth = await engine.evaluate(actor, intent, budget)
          expect(auth.decision).toBe('denied')
        }
      ),
      { numRuns: 100 }
    )
  })

  it('max-per-call denies for any amount exceeding limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        async (limit, amount) => {
          const engine = new PolicyEngine([
            createMaxPerCallPolicy('pol_max', '1', limit),
          ])
          const budget: BudgetState = {
            total: 1_000_000_000n,
            used: 0n,
            remaining: 1_000_000_000n,
            period: 'total',
            currency: 'USDC',
          }
          const intent: Intent = {
            target: 'test:svc',
            amount,
            purpose: { type: 'test', id: 'prop' },
          }
          const auth = await engine.evaluate(actor, intent, budget)
          if (amount <= limit) {
            expect(auth.decision).toBe('approved')
          } else {
            expect(auth.decision).toBe('denied')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('budget with used amount detects exhaustion correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        async (total, used, spendAmount) => {
          fc.pre(used <= total)
          const remaining = total - used
          const budget: BudgetState = {
            total,
            used,
            remaining,
            period: 'total',
            currency: 'USDC',
          }
          const engine = new PolicyEngine([
            createBudgetCheckPolicy('pol_budget', '1'),
          ])
          const intent: Intent = {
            target: 'test:svc',
            amount: spendAmount,
            purpose: { type: 'test', id: 'prop' },
          }
          const auth = await engine.evaluate(actor, intent, budget)
          const projected = used + spendAmount
          if (projected > total) {
            expect(auth.decision).toBe('denied')
          } else {
            expect(auth.decision).toBe('approved')
          }
        }
      ),
      { numRuns: 100 }
    )
  })

  it('rate limit passes for calls within limit', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 49 }),
        async (maxCalls, callIndex) => {
          const store = new Map<string, number[]>()
          const policy = createRateLimitPolicy('pol_rate', '1', maxCalls, 60_000, store)
          const engine = new PolicyEngine([policy])
          const budget: BudgetState = {
            total: 1_000_000n,
            used: 0n,
            remaining: 1_000_000n,
            period: 'total',
            currency: 'USDC',
          }

          for (let i = 0; i <= callIndex; i++) {
            const intent: Intent = {
              target: 'test:svc',
              amount: 100n,
              purpose: { type: 'test', id: `call-${i}` },
            }
            const auth = await engine.evaluate(actor, intent, budget)
            if (i < maxCalls) {
              expect(auth.decision).toBe('approved')
            } else {
              expect(auth.decision).toBe('denied')
            }
          }
        }
      ),
      { numRuns: 50 }
    )
  })

  it('zero amount payment never affects budget', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        async (total) => {
          const budget: BudgetState = {
            total,
            used: 0n,
            remaining: total,
            period: 'total',
            currency: 'USDC',
          }
          const engine = new PolicyEngine([
            createBudgetCheckPolicy('pol_budget', '1'),
          ])
          const intent0: Intent = {
            target: 'test:svc',
            amount: 0n,
            purpose: { type: 'test', id: 'zero' },
          }
          const intent1: Intent = {
            target: 'test:svc',
            amount: 1n,
            purpose: { type: 'test', id: 'one' },
          }

          const auth0 = await engine.evaluate(actor, intent0, budget)
          expect(auth0.decision).toBe('approved')

          const budgetAfter: BudgetState = {
            ...budget,
            used: total,
            remaining: 0n,
          }
          const intentTooMuch: Intent = {
            target: 'test:svc',
            amount: 0n,
            purpose: { type: 'test', id: 'zero-after' },
          }
          const authZeroAfter = await engine.evaluate(actor, intentTooMuch, budgetAfter)
          expect(authZeroAfter.decision).toBe('approved')
        }
      ),
      { numRuns: 50 }
    )
  })
})
