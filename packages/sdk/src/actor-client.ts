import { parseUsdc } from './conversion.js'
import type {
  CreateActorParams,
  PayParams,
  PreviewPayParams,
  ActorStatus,
  ActorSummary,
  ExecutionReceipt,
} from './types.js'

export class ActorClient {
  constructor(
    private config: { apiKey: string; baseUrl: string }
  ) {}

  async create(params: CreateActorParams): Promise<ActorSummary> {
    const res = await fetch(`${this.config.baseUrl}/api/actors`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Failed to create actor')
    }
    return res.json()
  }

  async pay(actorId: string, params: PayParams): Promise<ExecutionReceipt> {
    const res = await fetch(`${this.config.baseUrl}/api/actors/${actorId}/pay`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        target: params.target,
        amount: parseUsdc(params.amount).toString(),
        purpose: params.purpose,
        idempotencyKey: params.idempotencyKey,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Payment failed')
    }
    return res.json()
  }

  async previewPay(actorId: string, params: PreviewPayParams): Promise<{ decision: string; policyResults: unknown[] }> {
    const res = await fetch(`${this.config.baseUrl}/api/actors/${actorId}/preview-pay`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        target: params.target,
        amount: parseUsdc(params.amount).toString(),
        purpose: params.purpose,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Preview failed')
    }
    return res.json()
  }

  async status(actorId: string): Promise<ActorStatus> {
    const res = await fetch(`${this.config.baseUrl}/api/actors/${actorId}`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error('Failed to fetch actor status')
    return res.json()
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }
  }
}
