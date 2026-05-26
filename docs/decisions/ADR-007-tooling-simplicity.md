# ADR-007: Tooling Simplicity Over Enterprise Build Systems

**Status:** Accepted
**Date:** 2026-05-26
**Author:** Architecture Review

## Context

The Runtimee monorepo has 4 packages (`core`, `evm`, `sdk`, `node`) with a clear dependency chain. As the repo grows, we must choose tooling for builds, linting, and CI that scales without introducing unnecessary complexity.

Candidates considered:

- **pnpm workspaces** (current) — topological build ordering, workspace protocol
- **Turbo / Nx** — remote caching, parallel execution, dependency graph awareness
- **Bazel** — hermetic builds, language-agnostic
- **TypeScript project references** — incremental builds, boundary enforcement at the compiler level

## Decision

1. **Do not add Turbo, Nx, or Bazel.** pnpm's built-in `--filter` and topological execution are sufficient for 4 packages.
2. **Do not use TypeScript project references.** The complexity (composite tsconfigs, reference declarations, build order management) outweighs the benefit for a repo with <10 packages and <5s full build times.
3. **Use `pnpm -r` with topological ordering** for builds. This is pnpm's default behavior for workspace scripts.
4. **Use dependency-cruiser** for boundary enforcement instead of project references — it catches the same violations with less config overhead and produces visual graphs.
5. **Use pnpm workspaces alone** as the orchestration layer. No additional build system.

## Consequences

### Positive

- Zero additional build system dependencies
- New contributors only need to understand pnpm, not Turbo/Nx
- pnpm `pnpm -r build` already respects topological order
- dependency-cruiser catches cross-package imports that project references would
- CI stays simple: `pnpm install && pnpm check`

### Negative

- No remote caching for CI builds (unnecessary at current scale)
- No parallel build visualization (simple `--stream` flag suffices)
- Must migrate to a build system if packages grow beyond ~15

### Neutral

- TypeScript `tsc --noEmit` for typechecking (fast enough without project references)
- Build artifacts go to `dist/` — no incremental `.tsbuildinfo` tracking needed

## When to Revisit

- When the monorepo exceeds 10 packages
- When full `tsc` build time exceeds 30s
- When CI build time becomes a bottleneck
