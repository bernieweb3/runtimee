# ADR-002: ExecutionProvider Abstraction

**Status:** Accepted

## Context

Runtimee must support multiple execution environments over its lifetime — EVM today, potentially Solana, Arc, or account abstraction protocols tomorrow. The authorization pipeline produces an `ExecutionPlan`, but the mechanism that executes that plan varies by target.

Early coupling between authorization and execution would make the system brittle: adding a new execution path would require changing the authorization kernel.

Additionally, the MVP uses a hosted signer (AWS KMS), but the architecture must support self-custody, external KMS, and MPC providers as pluggable options without rewriting the platform.

## Decision

Define a formal `ExecutionProvider` interface at the `@runtimee/evm` level that decouples authorization from execution:

```typescript
interface ExecutionProvider {
  simulate(intent: Intent): Promise<SimulationResult>
  sign(executionPlan: ExecutionPlan): Promise<SignedTransaction>
  broadcast(signed: SignedTransaction): Promise<TxHash>
  wait(txHash: TxHash, confirmations?: number): Promise<Receipt>
}
```

The interface is defined alongside the first implementation (`@runtimee/evm`), not in `@runtimee/core`. This prevents the core package from acquiring execution dependencies.

The `@runtimee/sdk` imports the interface, not the concrete implementation. The hosted service (`@runtimee/node`) wires a concrete provider and signer together at startup.

Signing is further abstracted behind a `Signer` sub-interface, making custody an invisible implementation detail:

```typescript
interface Signer {
  signTransaction(tx: { ... }): Promise<Sig`0x${string}`>
}
```

## Consequences

**Positive:**
- New execution targets require only a new interface implementation — no core changes
- Self-custody, KMS, and MPC signers are swappable without SDK changes
- Testing is straightforward: mock providers simulate execution without touching a chain
- The interface acts as a forcing function — every execution path must implement simulate, sign, broadcast, wait

**Negative:**
- The interface may need to evolve as non-EVM execution models emerge (e.g., no concept of "gas" on some chains)
- Four functions is a minimal surface; future needs (simulation, bundling, sponsored execution) may require additions

## Alternatives Considered

- **No interface, direct implementation**: `@runtimee/sdk` calls viem directly. Rejected because it would require changing the SDK package every time a new execution path is added, and makes testing impossible without a live chain.
- **Interface in core package**: Define `ExecutionProvider` in `@runtimee/core`. Rejected because it would introduce execution concerns into the pure core package, violating the zero-I/O principle.
- **Abstract execution service (gRPC/event)**: Decouple via a network boundary. Rejected for MVP because it adds operational complexity without demonstrated need.
