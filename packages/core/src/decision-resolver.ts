import type { PolicyResult, AuthorizationDecision } from './types.js'

export class DecisionResolver {
  static resolve(results: PolicyResult[]): AuthorizationDecision {
    if (results.length === 0) return 'denied'
    let hasDeny = false
    let hasReview = false
    for (const r of results) {
      if (r.decision === 'deny') hasDeny = true
      else if (r.decision === 'review') hasReview = true
    }
    if (hasDeny) return 'denied'
    if (hasReview) return 'pending-review'
    return 'approved'
  }
}
