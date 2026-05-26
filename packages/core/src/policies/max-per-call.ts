import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createMaxPerCallPolicy(
  id: string,
  version: string,
  maxAmount: bigint
): PolicyEvaluator {
  const middleware: PolicyMiddleware = async (ctx, next) => {
    if (ctx.intent.amount > maxAmount) {
      return {
        policyId: id,
        policyType: 'max-per-call',
        version,
        decision: 'deny',
        reason: {
          code: 'max_per_call_exceeded',
          message: `Payment amount ${ctx.intent.amount} exceeds max-per-call limit of ${maxAmount}`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    return next()
  }
  return { id, type: 'max-per-call', version, middleware }
}
