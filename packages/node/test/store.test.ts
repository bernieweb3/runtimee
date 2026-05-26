import { describe, expect, it } from 'vitest'
import type { CreateActorRecord, ExecutionRecord, ExecutionEventRecord } from '../src/store/interface.js'

describe('Store interface', () => {
  it('has correct shape for CreateActorRecord', () => {
    const record: CreateActorRecord = {
      id: 'actor_1',
      name: 'test',
      budget: { amount: 1000n, currency: 'USDC', period: 'monthly' },
      policies: [],
    }
    expect(record.id).toBe('actor_1')
    expect(record.budget.amount).toBe(1000n)
  })

  it('ExecutionRecord stores full authorization snapshot', () => {
    const record: ExecutionRecord = {
      id: 'exec_1',
      actorId: 'actor_1',
      idempotencyKey: 'key_1',
      requestHash: 'hash_1',
      authorization: {
        intent: { target: 'test:svc', amount: 100n, purpose: { type: 'test', id: '1' } },
        policyResults: [],
        decision: 'approved',
        evaluatedAt: new Date().toISOString(),
        actorVersion: '1',
      },
      createdAt: new Date().toISOString(),
    }
    expect(record.authorization.intent.target).toBe('test:svc')
    expect(record.authorization.decision).toBe('approved')
  })
})
