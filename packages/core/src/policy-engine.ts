import type { Actor, Intent, BudgetState, PolicyEvaluator, Authorization } from './types.js'
import { DecisionResolver } from './decision-resolver.js'

export class PolicyEngine {
  private readonly evaluators: PolicyEvaluator[]

  constructor(evaluators: PolicyEvaluator[]) {
    this.evaluators = evaluators
  }

  async evaluate(
    actor: Actor,
    intent: Intent,
    budget: BudgetState
  ): Promise<Authorization> {
    const evaluatedAt = new Date().toISOString()
    const policyResults = await Promise.all(
      this.evaluators.map((evaluator) =>
        this.runEvaluator(evaluator, actor, intent, budget)
      )
    )
    const decision = policyResults.length === 0
      ? 'approved' as const
      : DecisionResolver.resolve(policyResults)
    return {
      intent,
      policyResults,
      decision,
      evaluatedAt,
      actorVersion: '1',
    }
  }

  private async runEvaluator(
    evaluator: PolicyEvaluator,
    actor: Actor,
    intent: Intent,
    budget: BudgetState
  ): Promise<{
    policyId: string
    policyType: string
    version: string
    decision: 'pass' | 'deny' | 'review'
    reason: { code: string; message: string }
    evaluatedAt: string
  }> {
    const ctx = {
      actor,
      intent,
      budget,
      evaluatedPolicies: [],
    }

    const finalNext = async () => ({
      policyId: evaluator.id,
      policyType: evaluator.type,
      version: evaluator.version,
      decision: 'pass' as const,
      reason: { code: 'noop', message: 'No policy applied' },
      evaluatedAt: new Date().toISOString(),
    })

    return evaluator.middleware(ctx, finalNext)
  }
}
