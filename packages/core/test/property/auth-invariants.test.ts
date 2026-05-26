import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { PolicyEngine } from '../../src/policy-engine.js'
import { createBudgetCheckPolicy } from '../../src/policies/budget-check.js'
import { DecisionResolver } from '../../src/decision-resolver.js'
import type { Actor, Intent, BudgetState, PolicyResult } from '../../src/types.js'

const actor: Actor = {
  id: 'actor_prop',
  name: 'prop-test',
  status: 'active',
  createdAt: new Date().toISOString(),
}

describe('Authorization invariants (property-based)', () => {
  it('same inputs always produce same authorization result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        async (budgetTotal, spendAmount) => {
          const budget: BudgetState = {
            total: budgetTotal,
            used: 0n,
            remaining: budgetTotal,
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
          const a = await engine.evaluate(actor, intent, budget)
          const b = await engine.evaluate(actor, intent, budget)
          expect(a.decision).toBe(b.decision)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('deny always dominates pass and review', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<'pass' | 'deny' | 'review'>('pass', 'deny', 'review'),
          { minLength: 0, maxLength: 10 }
        ),
        (decisions) => {
          const results: PolicyResult[] = decisions.map((d, i) => ({
            policyId: `pol_${i}`,
            policyType: 'prop-test',
            version: '1',
            decision: d,
            reason: { code: 'prop', message: 'property test' },
            evaluatedAt: new Date().toISOString(),
          }))
          const resolved = DecisionResolver.resolve(results)
          if (decisions.length === 0) {
            expect(resolved).toBe('denied')
          } else if (decisions.some((d) => d === 'deny')) {
            expect(resolved).toBe('denied')
          } else if (decisions.some((d) => d === 'review')) {
            expect(resolved).toBe('pending-review')
          } else {
            expect(resolved).toBe('approved')
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('budget enforcement never allows overspend', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        async (total, amount) => {
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
          const intent: Intent = {
            target: 'test:svc',
            amount,
            purpose: { type: 'test', id: 'prop' },
          }
          const auth = await engine.evaluate(actor, intent, budget)
          if (amount > total) {
            expect(auth.decision).toBe('denied')
          } else {
            expect(auth.decision).toBe('approved')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
