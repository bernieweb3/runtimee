# ADR-001: Intent-Oriented Architecture

**Status:** Accepted

## Context

Runtimee's core model needed to represent what an autonomous system wants to do financially — not how to encode that as a blockchain transaction. Early designs used a `Transaction` type with EVM fields (`chainId`, `gasLimit`, `data`), which coupled the authorization kernel to a specific execution environment.

The system must support multiple execution environments over time: EVM, Solana, account abstraction, batch settlement, etc. Encoding chain-specific fields in the core model would make every new execution target a core change.

## Decision

Model the core as an intent pipeline, not a transaction pipeline:

```
Intent → Authorization → ExecutionPlan
```

- `Intent` captures what the actor wants: target, amount, purpose. No blockchain fields.
- `Authorization` captures the policy evaluation result: decision, policy results, evaluated state.
- `ExecutionPlan` carries the authorization forward to an execution adapter, with settlement hints but no mandatory execution details.

Blockchain-specific fields (`chainId`, `gasLimit`, `data`, `nonce`) exist only in execution adapters (`@runtimee/evm`), never in `@runtimee/core`.

The `purpose` field is structured metadata (`{ type, id, description }`) — the semantic bridge between autonomous systems and financial oversight. It is a first-class citizen, not a comment field.

## Consequences

**Positive:**
- Adding a new chain or execution model requires no changes to the core authorization pipeline
- The authorization layer is testable without any blockchain infrastructure
- Intent semantics enable future capabilities: service routing, x402 negotiation, multi-asset settlement
- Purpose metadata enables audit trails, AI explainability, and treasury analytics without schema changes

**Negative:**
- Developers must understand the intent → execution separation, which adds a conceptual layer
- Some validations (e.g., "is this address valid?") must wait until the execution adapter phase

## Alternatives Considered

- **Transaction-oriented model**: Put chain fields directly in the core. Rejected because it would couple the authorization kernel to EVM semantics and require core changes for each new execution target.
- **Abstract transaction type**: A generic `Transaction` with optional fields. Rejected because it shifts the validation burden to runtime rather than the type system and doesn't prevent accidental chain coupling in policy logic.
- **No structured purpose**: Freeform string only. Rejected because purpose is strategically critical for audit, compliance, and agent explainability.
