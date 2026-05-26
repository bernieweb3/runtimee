export interface CreateActorParams {
  name: string
  budget: {
    amount: string
    currency: 'USDC'
    period: 'monthly' | 'total'
  }
  policies: {
    type: string
    version?: string
    config?: Record<string, unknown>
  }[]
}

export interface PayParams {
  target: string
  amount: string
  purpose: {
    type: string
    id: string
    description?: string
  }
  idempotencyKey?: string
}

export interface PreviewPayParams {
  target: string
  amount: string
  purpose: {
    type: string
    id: string
    description?: string
  }
}

export interface ActorStatus {
  budget: {
    total: string
    used: string
    remaining: string
    period: string
    currency: string
  }
  txCount: number
}

export interface ActorSummary {
  id: string
  name: string
  status: 'active' | 'frozen' | 'depleted'
  createdAt: string
}

export interface ExecutionReceipt {
  executionId: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash?: string
}

export interface RuntimeeConfig {
  apiKey: string
  baseUrl?: string
}
