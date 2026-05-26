import type {
  Actor,
  Budget,
  Policy,
  Target,
  Intent,
  PolicyResult,
} from '@runtimee/core'

export interface CreateActorRecord {
  id: string
  name: string
  budget: {
    amount: bigint
    currency: 'USDC'
    period: 'monthly' | 'total'
  }
  policies: {
    type: string
    version: string
    config: Record<string, unknown>
    priority: number
  }[]
}

export interface ActorRecord {
  actor: Actor
  budget: Budget
  policies: Policy[]
  targets: Target[]
}

export interface ExecutionRecord {
  id: string
  actorId: string
  idempotencyKey: string
  requestHash: string
  authorization: {
    intent: Intent
    policyResults: PolicyResult[]
    decision: string
    evaluatedAt: string
    actorVersion: string
  }
  createdAt: string
}

export interface ExecutionEventRecord {
  id: string
  executionId: string
  type: 'submitted' | 'simulated' | 'broadcasted' | 'confirmed' | 'failed'
  data: Record<string, unknown>
  timestamp: string
}

export interface Store {
  createActor(record: CreateActorRecord): Promise<ActorRecord>
  getActor(id: string): Promise<ActorRecord | null>
  updateActorStatus(id: string, status: Actor['status']): Promise<void>
  consumeBudget(actorId: string, amount: bigint): Promise<boolean>
  getBudgetState(actorId: string): Promise<{
    total: bigint
    used: bigint
    remaining: bigint
    period: string
    currency: string
  }>
  createExecution(record: ExecutionRecord): Promise<void>
  getExecutionByIdempotencyKey(key: string): Promise<ExecutionRecord | null>
  appendExecutionEvent(event: ExecutionEventRecord): Promise<void>
  getExecutionEvents(executionId: string): Promise<ExecutionEventRecord[]>
  getActorExecutionCount(actorId: string): Promise<number>
}
