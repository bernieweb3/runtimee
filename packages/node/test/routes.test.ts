import { describe, expect, it } from 'vitest'
import { createRouter } from '../src/routes.js'
import type { Store } from '../src/store/interface.js'

function createMockStore(): Store {
  return {
    async createActor(r) {
      return {
        actor: { id: r.id, name: r.name, status: 'active' as const, createdAt: new Date().toISOString() },
        budget: { id: 'b1', actorId: r.id, amount: r.budget.amount, used: 0n, currency: 'USDC' as const, period: r.budget.period as 'monthly' | 'total', resetAt: new Date().toISOString() },
        policies: [],
        targets: [],
      }
    },
    async getActor() { return null },
    async updateActorStatus() {},
    async consumeBudget() { return true },
    async getBudgetState() { return { total: 1000n, used: 0n, remaining: 1000n, period: 'monthly', currency: 'USDC' } },
    async createExecution() {},
    async getExecutionByIdempotencyKey() { return null },
    async appendExecutionEvent() {},
    async getExecutionEvents() { return [] },
    async getActorExecutionCount() { return 0 },
  }
}

describe('createRouter', () => {
  it('returns router with routes', () => {
    const router = createRouter({ store: createMockStore() })
    expect(router).toBeDefined()
  })
})
