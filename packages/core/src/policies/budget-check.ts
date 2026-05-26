import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createBudgetCheckPolicy(
  id: string,
  version: string
): PolicyEvaluator {
  const middleware: PolicyMiddleware = async (ctx, next) => {
    const { intent, budget } = ctx
    const projected = budget.used + intent.amount
    if (projected > budget.total) {
      return {
        policyId: id,
        policyType: 'budget-check',
        version,
        decision: 'deny',
        reason: {
          code: 'budget_exhausted',
          message: `Budget exhausted: ${budget.used + intent.amount} would exceed ${budget.total} (${budget.period})`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    return next()
  }
  return { id, type: 'budget-check', version, middleware }
}
