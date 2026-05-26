import type { PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createRateLimitPolicy(
  id: string,
  version: string,
  maxCalls: number,
  windowMs: number,
  store: Map<string, number[]> = new Map()
): PolicyEvaluator {
  const middleware: PolicyMiddleware = async (ctx, _next) => {
    const actorKey = ctx.actor.id
    const now = Date.now()
    const timestamps = store.get(actorKey) || []
    const recent = timestamps.filter((t) => now - t < windowMs)
    if (recent.length >= maxCalls) {
      return {
        policyId: id,
        policyType: 'rate-limit',
        version,
        decision: 'deny',
        reason: {
          code: 'rate_limit_exceeded',
          message: `Rate limit exceeded: ${recent.length} calls in window (max ${maxCalls})`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    recent.push(now)
    store.set(actorKey, recent)
    return {
      policyId: id,
      policyType: 'rate-limit',
      version,
      decision: 'pass',
      reason: { code: 'rate_limit_ok', message: 'Rate limit not exceeded' },
      evaluatedAt: new Date().toISOString(),
    }
  }
  return { id, type: 'rate-limit', version, middleware }
}
