# ADR-005: Pure Zero-I/O Core Package

**Status:** Accepted

## Context

The core authorization kernel (`@runtimee/core`) is the foundation of the entire system. If it has network dependencies, database dependencies, or blockchain dependencies, then:
- Every test requires infrastructure
- Every change risks breaking I/O concerns
- The core is hard to reason about — authorization decisions are mixed with network calls
- Reusing the core in different contexts (browser, edge runtime, self-hosted) requires I/O stubs

The core must be embeddable anywhere: in a browser extension, a serverless function, an agent's local process, or a hosted service.

## Decision

`@runtimee/core` is a pure TypeScript package with zero I/O dependencies:

- **No network calls** — no fetch, no RPC, no API calls
- **No database access** — no Postgres, no Redis, no storage
- **No blockchain dependencies** — no viem, no ethers, no RPC providers
- **No Node.js APIs** — works in any ES2022 runtime (browser, Node, edge, Deno)
- **No async I/O** — the authorization pipeline is synchronous computation. (The `PolicyMiddleware` signature is `async` to accommodate future async review policies, but no MVP policy needs it.)

Dependencies: **zero external npm packages.**

The package exports only:
- Types (`Actor`, `Intent`, `Authorization`, etc.)
- Pure functions and classes (`PolicyEngine`, `DecisionResolver`)
- Policy factories (`createBudgetCheckPolicy`, etc.)
- Error classes (extend `Error`, no I/O in constructors)

## Consequences

**Positive:**
- Tests run in milliseconds with zero setup — no mocks, no testcontainers, no network
- The authorization pipeline is fully deterministic — same inputs always produce same outputs
- Property-based testing is natural — fast-check can run 100s of iterations without infrastructure
- The core can be published independently and used in any runtime
- Reasoning about authorization correctness is isolated from execution concerns

**Negative:**
- The core cannot validate chain-specific concerns (address format, gas estimation)
- Some validation that "feels" core (e.g., "is this a valid USDC amount?") is pushed to downstream packages
- Developers may add I/O to the core without realizing it — must be caught in code review

## Alternatives Considered

- **Core with optional I/O**: Dependencies are optional peer dependencies. Rejected because it creates a combinatorial testing matrix and the "optional" paths rarely get tested in practice.
- **Layered core with I/O interfaces**: Define storage and network interfaces in core, implemented by adapters. Rejected because it adds abstraction surface area without a demonstrated need — the core genuinely doesn't need I/O.
- **Minimal dependencies but no hard rule**: Just don't add dependencies unless necessary. Rejected because this is too easy to violate without an explicit architectural boundary. The zero-dependency rule is an architectural invariant, not a convention.
