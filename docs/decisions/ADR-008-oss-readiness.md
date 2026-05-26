# ADR-008: OSS-Readiness and Repository Structure

**Status:** Accepted
**Date:** 2026-05-26
**Author:** Architecture Review

## Context

Runtimee is being prepared for a future Apache 2.0 open-source release. The repository must include standard OSS governance files while preserving flexibility for a pre-1.0 project that may still change direction.

Key concerns:

- Legal boilerplate (license, notice, attribution) must be correct before any public release
- Contribution expectations, code of conduct, and security reporting channels must be documented
- Package exports and internal module boundaries must be reviewed so that the public API surface is intentional, not accidental
- The `@runtimee/node` package contains hosted-service wiring (PostgreSQL, Express, KMS stubs) that should remain private in early releases
- Pre-1.0 versioning means we may still break APIs — OSS documentation should reflect this

## Decision

### 1. Standard OSS governance files

Add the following files at repository root:

| File | Purpose |
|------|---------|
| `LICENSE` | Full Apache 2.0 text with `Copyright 2026 Runtimee Authors` header |
| `NOTICE` | Apache 2.0-required attribution notice |
| `CONTRIBUTING.md` | Contribution guide — initial version states project is not yet accepting external contributions |
| `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1 |
| `SECURITY.md` | Security vulnerability reporting policy |

### 2. Package export boundaries

`@runtimee/core`, `@runtimee/evm`, and `@runtimee/sdk` are publishable with clean single-entry-point exports via `src/index.ts`. All three packages correctly expose only their intended public API.

`@runtimee/node` remains `"private": true` in its `package.json` and is excluded from changeset publishing. Its source files (`server.ts`, `routes.ts`, `store/`, `signer.ts`) are internal to the hosted service. The placeholder `createKMSSigner` that throws `"not yet implemented"` is acceptable in a private package but must be resolved before `@runtimee/node` is ever published.

### 3. Internal-only components

- **`@runtimee/node`** — entire package is internal (hosted service)
- **`packages/node/src/store/interface.ts`** — Store interface is internal; should not be exported from any publishable package
- **`packages/core/src/policies/*.ts`** — individual policy implementations are re-exported through `policies/index.ts` and are intentionally part of the public API

### 4. OSS-safe repo conventions

- All source files carry the Apache 2.0 license header comment
- `@runtimee/node` private package is excluded from default build/test workflows in CI (already handled by `pnpm -r`)
- `docs/` directory contains architecture and decision records that explain design rationale to external contributors
- Changesets already handles versioning and changelog generation for publishing

### 5. Pre-1.0 expectations

- Every change is a patch per `changeset/config.json`
- No API stability guarantees until 1.0
- CHANGELOG entries serve as the migration guide

## Consequences

- **Positive**: Standard OSS files reduce friction when going public; package exports are already clean with no accidental internal leaks
- **Positive**: `@runtimee/node` being private prevents premature commitment to a hosted-service API
- **Negative**: Existing source files lack Apache 2.0 header comments — adding them is a mechanical task deferred to just before public release
- **Negative**: `NOTICE` is minimal (no third-party attribution required yet); it must be updated if dependencies with notice requirements are added
- **Risk**: `createKMSSigner` stub in a published package would be confusing — `@runtimee/node` must resolve this before any public release

## Alternatives Considered

- **Adding source headers now**: Deferred — mechanical and noisy; better to add at release time via a script
- **Marking `@runtimee/node` as publishable**: Rejected — it contains sensitive infrastructure wiring (PostgreSQL, KMS, Express)
- **Adding GitHub issue/PR templates**: Deferred — useful but premature for a pre-publication repo with no external contributors
