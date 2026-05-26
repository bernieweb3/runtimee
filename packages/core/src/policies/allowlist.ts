import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createAllowlistPolicy(
  id: string,
  version: string,
  allowedTargets: string[]
): PolicyEvaluator {
  const set = new Set(allowedTargets)
  const middleware: PolicyMiddleware = async (ctx, next) => {
    if (!set.has(ctx.intent.target)) {
      return {
        policyId: id,
        policyType: 'allowlist',
        version,
        decision: 'deny',
        reason: {
          code: 'allowlist_denied',
          message: `Target "${ctx.intent.target}" is not in the allowlist`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    return next()
  }
  return { id, type: 'allowlist', version, middleware }
}
