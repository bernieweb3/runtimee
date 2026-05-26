# Runtimee Architecture

This directory documents the Runtimee architecture — the structural and strategic decisions that define the system.

## Layers

```
Developer Code (agent, bot, workflow, service)
    ↓ @runtimee/sdk
@runtimee/core — pure authorization kernel, zero I/O
    ↓ ExecutionProvider interface
@runtimee/evm — pluggable EVM execution adapter
    ↓
Blockchain (Base + USDC, MVP)
```

## Principles

- Intent-oriented, not transaction-oriented
- Authorization is the product, execution is an adapter
- Zero I/O in core. Pure functions only.
- Financial actors, not wallets
- Pluggable signers, pluggable execution
- Deterministic policy evaluation

## Package Responsibilities

| Package | Responsibility | Dependencies | I/O? |
|---------|---------------|-------------|------|
| `@runtimee/core` | Authorization orchestration | None | No |
| `@runtimee/evm` | EVM transaction execution | viem, core | Yes |
| `@runtimee/sdk` | Developer API surface | core | Yes (HTTP) |
| `@runtimee/node` | Hosted service wiring | all of the above | Yes |

## Key ADRs

See `docs/decisions/` for Architecture Decision Records.
