# ADR-003: Policy Engine Design

**Status:** Accepted

## Context

Runtimee's core product is programmable financial authorization. The policy engine is the heart of that product — it evaluates spending requests against rules and produces deterministic authorization decisions.

The engine needed to support:
- Multiple policy types (budget, allowlist, rate-limit, etc.)
- Composable policies that can be combined in any order
- Deterministic, reproducible results
- Machine-readable denial reasons that agents can act on
- A future path to async review, AI risk scoring, and policy graphs

## Decision

Model the policy engine as a collection of independent evaluators aggregated by a `DecisionResolver`:

```
Intent → Independent Policy Evaluations → Decision Aggregation → Authorization
```

**Evaluators** are `PolicyMiddleware` functions:

```typescript
type PolicyMiddleware = (
  ctx: PolicyContext,
  next: () => Promise<PolicyResult>
) => Promise<PolicyResult>
```

Each evaluator receives the full context (actor, intent, budget) and can pass, deny, or request review. Evaluators run independently (via `Promise.all`), not as a sequential middleware chain. This prevents evaluation order from implicitly defining behavior.

**DecisionResolver** uses a single rule: `deny > review > pass`. This is a first-class abstraction, not an implicit aggregation step. Future evolution: weighted policies, async review, AI risk scoring, policy graphs — all flow through the resolver, not the evaluators.

**Policy results** are structured and machine-readable:

```typescript
interface PolicyResult {
  policyId: string
  policyType: string
  version: string
  decision: "pass" | "deny" | "review"
  reason: { code: string; message: string }
  evaluatedAt: string
}
```

The `review` decision is defined from the start, even though MVP doesn't implement async approval workflows. This prevents a breaking change when review flows are added.

## Consequences

**Positive:**
- Policies are independently testable — each evaluator can be tested in isolation
- Adding a new policy type requires no changes to the engine or other policies
- Determinism is guaranteed: same inputs → same authorization (property-tested)
- Machine-readable codes enable agents to react appropriately (deny → adapt, not retry)

**Negative:**
- Independent evaluation means policies can't share intermediate state — each evaluator computes from scratch
- The middleware pattern (accept `next()`) is slightly more complex than a simple predicate list

## Alternatives Considered

- **Sequential middleware chain**: Evaluators run in priority order, each can short-circuit. Rejected because evaluation order becomes implicit behavior — changing policy priority changes authorization results in non-obvious ways.
- **Policy DSL / rule engine**: Define policies in a separate configuration language. Rejected for MVP because it introduces a new language to learn and debug. The inline function approach is simpler and more powerful for developers.
- **Boolean-only results**: Pass/fail without machine-readable reasons. Rejected because agents cannot adapt without structured error codes — they need to distinguish "budget exhausted" from "not allowed" from "rate limited."
