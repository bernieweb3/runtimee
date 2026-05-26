# ADR-006: Execution Adapter Separation

**Status:** Accepted

## Context

Runtimee must support multiple execution environments over time: EVM (MVP), potentially Solana, account abstraction protocols, batch settlement, or custom execution layers. Each environment has distinct semantics for transaction building, gas pricing, nonce management, and broadcast.

If execution logic lives in the core package, every new execution target requires a core change. If it lives in the SDK, the SDK becomes coupled to a specific execution model. The hosted service needs to wire together the correct execution path at startup.

## Decision

Execution is separated into distinct adapter packages, one per execution environment:

```
@runtimee/core         — authorization (no execution)
@runtimee/evm          — EVM execution adapter
@runtimee/sdk          — developer API (consumes ExecutionProvider interface)
@runtimee/node         — hosted service (wires provider + signer at startup)
```

Each adapter implements the `ExecutionProvider` interface from `@runtimee/evm/types.ts`. The interface is the contract between the authorization layer and any execution target.

Within an adapter, execution concerns are further decomposed into sub-modules:

```
@runtimee/evm/
  src/
    types.ts                  — ExecutionProvider, Signer, Broadcaster interfaces
    transaction-builder.ts    — chain-specific tx encoding (USDC ERC-20 transfer)
    broadcaster.ts            — RPC interaction (send, receipt, gas estimation)
    gas-strategy.ts           — pricing logic (estimate + 20% buffer for MVP)
    evm-provider.ts           — ExecutionProvider implementation wiring the above
```

This decomposition means:
- Adding a new execution target = new package. No changes to existing packages.
- Changes to gas strategy don't affect tx building. Changes to tx building don't affect broadcasting.
- Each sub-module is independently testable.

## Consequences

**Positive:**
- New execution targets are additive — existing packages never change
- Gas strategy, tx building, and broadcast logic are independently testable and swappable
- The adapter boundary is explicit and verifiable — a new adapter must implement the full ExecutionProvider interface
- The hosted service (`@runtimee/node`) wires adapters at startup without knowing their internals

**Negative:**
- Cross-cutting concerns (e.g., "log every execution attempt") require either duplication across adapters or a shared middleware layer
- Each adapter duplicates some infrastructure (RPC client setup, error mapping)
- The adapter pattern adds package overhead — each execution environment is a separate npm package to maintain

## Alternatives Considered

- **Single execution package with environment config**: One `@runtimee/execution` package configured by chain ID. Rejected because execution environments differ in fundamental ways (EVM vs Solana vs account abstraction) — config-driven differences don't capture semantic differences.
- **Execution logic in the SDK**: `@runtimee/sdk` includes viem and execution logic. Rejected because it forces every SDK consumer to install EVM dependencies, even if they only want authorization or use a different execution target.
- **Execution logic in the core**: Rejected per ADR-005 — the core has zero I/O by design.
