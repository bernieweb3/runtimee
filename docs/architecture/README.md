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

## Enforced Dependency Boundaries

These rules are enforced by [dependency-cruiser](https://github.com/sverweij/dependency-cruiser) in CI (`pnpm boundaries`).

```
┌─────────────────────────────────────────────────────────┐
│                      @runtimee/node                     │
│  Dependencies: core, evm, sdk                           │
│  Forbidden: none                                        │
└───────────┬─────────────────────────────┬───────────────┘
            │                             │
     ┌──────▼──────┐              ┌───────▼────────┐
     │ @runtimee/sdk│              │  @runtimee/evm │
     │ Deps: core   │              │  Deps: core    │
     │ Forbidden:   │              │  Forbidden:    │
     │  evm, node   │              │  sdk, node     │
     └──────┬───────┘              └───────┬────────┘
            │                             │
            └──────────┬──────────────────┘
                       ▼
                ┌──────────────┐
                │@runtimee/core│
                │Deps: none    │
                │Forbidden:    │
                │ evm, sdk,    │
                │ node         │
                └──────────────┘
```

### Rules

| Rule | Description |
|------|-------------|
| `core-no-internal-deps` | `core` must not import from `evm`, `sdk`, or `node` |
| `evm-no-sdk-or-node` | `evm` may only import from `core` (not `sdk`/`node`) |
| `sdk-no-evm-or-node` | `sdk` may only import from `core` (not `evm`/`node`) |
| `no-circular-deps` | No circular dependencies between packages |

### Enforcement Layers

1. **pnpm strict resolution** — packages can only resolve imports that are declared in their own `package.json`. This is the first line of defense.
2. **dependency-cruiser** — checks boundary rules in CI. Even if a dependency is declared in `package.json`, cross-boundary imports are rejected.
3. **Code review** — developers verify boundary compliance during PR review.

### Usage

```bash
pnpm boundaries          # Check all package boundaries
pnpm boundaries:graph    # Generate dependency graph SVG
pnpm ci                  # Full CI pipeline (typecheck + boundaries + test)
```

## Key ADRs

See `docs/decisions/` for Architecture Decision Records.
