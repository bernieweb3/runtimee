export interface Actor {
  id: string
  name: string
  status: 'active' | 'frozen' | 'depleted'
  createdAt: string
}

export interface Budget {
  id: string
  actorId: string
  amount: bigint
  used: bigint
  currency: 'USDC'
  period: 'monthly' | 'total'
  resetAt: string
}

export interface Policy {
  id: string
  actorId: string
  type: string
  version: string
  config: Record<string, unknown>
  priority: number
}

export interface SettlementDescriptor {
  address: string
  chain: string
  asset: string
}

export interface Target {
  id: string
  actorId: string
  name: string
  settlement: SettlementDescriptor
}

export interface Purpose {
  type: string
  id: string
  description?: string
}

export interface Intent {
  target: string
  amount: bigint
  purpose: Purpose
  idempotencyKey?: string
}

export interface BudgetState {
  total: bigint
  used: bigint
  remaining: bigint
  period: string
  currency: string
}

export interface PolicyResult {
  policyId: string
  policyType: string
  version: string
  decision: 'pass' | 'deny' | 'review'
  reason: { code: string; message: string }
  evaluatedAt: string
}

export type AuthorizationDecision = 'approved' | 'denied' | 'pending-review'

export interface Authorization {
  intent: Intent
  policyResults: PolicyResult[]
  decision: AuthorizationDecision
  evaluatedAt: string
  actorVersion: string
}

export interface SettlementHint {
  preferredChain?: string
  deadline?: string
  gasStrategy?: string
}

export interface ExecutionPlan {
  authorization: Authorization
  settlementHints: SettlementHint
}

export interface PolicyContext {
  actor: Actor
  intent: Intent
  budget: BudgetState
  evaluatedPolicies: PolicyResult[]
}

export type PolicyMiddleware = (
  ctx: PolicyContext,
  next: () => Promise<PolicyResult>
) => Promise<PolicyResult>

export interface PolicyEvaluator {
  id: string
  type: string
  version: string
  middleware: PolicyMiddleware
}

export interface SimulationResult {
  decision: AuthorizationDecision
  policyResults: PolicyResult[]
  estimatedGas?: bigint
  estimatedCost?: bigint
}

export interface SignedTransaction {
  serialized: `0x${string}`
  hash: `0x${string}`
}

export interface Receipt {
  txHash: `0x${string}`
  status: 'confirmed' | 'failed'
  blockNumber: bigint
  gasUsed: bigint
  effectiveGasPrice: bigint
}
