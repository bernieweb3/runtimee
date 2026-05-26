# Runtimee Design Specification

**Date:** 2026-05-26
**Status:** Draft
**Product:** Runtimee — programmable financial runtime for autonomous systems

## 1. Product Thesis

Runtimee is a programmable financial authorization and orchestration layer for autonomous internet applications. It provides developers with financial actors — programmable treasury identities with deterministic policy enforcement — that can autonomously spend stablecoins within defined constraints.

The core belief: autonomous systems (AI agents, bots, machine workflows) will need programmable financial accounts, and stablecoins (USDC) will become native internet settlement assets. Runtimee provides the financial runtime layer, not the intelligence layer, not the custody layer.

**Execution wedge:** Agent Wallet Runtime (outbound spending for autonomous actors)
**Platform evolution:** Embedded Treasury Infrastructure

## 2. Architecture

### 2.1 Layers

```
Developer's Code (agent, bot, workflow, service)
    ↓ @runtimee/sdk
@runtimee/core (pure authorization kernel)
    ↓ ExecutionProvider interface
@runtimee/evm (pluggable execution adapter)
    ↓
Blockchain (Base + USDC initially)
```

### 2.2 Core Abstraction Flow

```
Actor
  → Intent { target, amount, purpose, constraints }
  → PolicyEngine.evaluate(actor, intent)
    → independent Policy evaluations → DecisionResolver
  → Authorization { intent, policyResults, decision }
  → ExecutionPlan { authorization, settlementHints }
  → ExecutionAdapter.simulate() / sign() / broadcast() / wait()
```

### 2.3 Package Structure

| Package | Description | Dependencies | Publishes |
|---------|-------------|-------------|-----------|
| `@runtimee/core` | Pure TS authorization kernel. Zero I/O. Zero blockchain dependencies. | None | npm |
| `@runtimee/evm` | EVM execution adapter. Implements ExecutionProvider. | viem, @runtimee/core | npm |
| `@runtimee/sdk` | Developer-facing API. Wraps core + execution via interface. | @runtimee/core, ExecutionProvider interface | npm |
| `@runtimee/node` | Hosted service. Express/Fastify server wrapping the SDK. | @runtimee/sdk | Internal |

### 2.4 Key Abstraction Decisions

- **Actor** is a financial identity + authorization context + policy scope. NOT a wallet. Wallets/signers attach at the adapter layer.
- **Intent → Authorization → ExecutionPlan** replaces Transaction as the core model. Blockchain execution details (chainId, gasLimit, data) live in adapters only.
- **PolicyEngine** uses independent evaluators with a DecisionResolver. deny always dominates review/pass.
- **Target** is a developer-configured local alias for a settlement destination, not a global service registry.
- **purpose** is structured semantic metadata (type, id, description) — the semantic bridge between autonomous systems and financial oversight.
- **Custody** is an invisible implementation detail. Never surfaces in product language.

### 2.5 Pluggable Execution

```typescript
interface ExecutionProvider {
  simulate(intent: Intent): Promise<SimulationResult>
  sign(executionPlan: ExecutionPlan): Promise<SignedTransaction>
  broadcast(signed: SignedTransaction): Promise<TxHash>
  wait(txHash: TxHash, confirmations?: number): Promise<Receipt>
}
```

MVP ships only `@runtimee/evm` (Base + USDC, hosted KMS signer). Interface is defined at the architecture level to prevent accidental hard-coding of hosted execution assumptions.

## 3. SDK Surface

### 3.1 Developer API

```typescript
import { Runtimee } from "@runtimee/sdk"

const rt = new Runtimee({ apiKey: "re_..." })

// Create a financial actor
const actor = await rt.actors.create({
  name: "research-agent",
  budget: { amount: "50", currency: "USDC", period: "monthly" },
  policies: [
    { type: "allowlist", targets: ["openai:gpt-4-turbo"] },
    { type: "max-per-call", amount: "5" }
  ]
})

// Preview authorization (same path as pay, no execution)
const preview = await actor.previewPay({
  target: "openai:gpt-4-turbo",
  amount: "0.05 USDC",
  purpose: { type: "llm-inference", id: "run-42" }
})
// → { decision: "approved" | "denied", policyResults: [...] }

// Spend
const execution = await actor.pay({
  target: "openai:gpt-4-turbo",
  amount: "0.05 USDC",
  purpose: { type: "llm-inference", id: "run-42", description: "inference run" }
})
// → authorization snapshot, execution id

const receipt = await execution.wait()
// → { status: "confirmed", txHash: "0x..." }

// Status
const status = await actor.status()
// → { budget: { used: "12.50", remaining: "37.50" }, txCount: 247 }
```

### 3.2 Key Decisions

- `actor.pay()` is the center of gravity for the entire SDK.
- No "wallet" concept surfaces to the developer. Actors have addresses internally.
- Monetary values in human-readable strings. SDK handles conversion to smallest unit.
- `previewPay()` shares the exact same authorization path as `pay()`.
- Idempotency via developer-provided `idempotencyKey`.

## 4. Policy Engine

### 4.1 Core Model

```typescript
interface PolicyContext {
  actor: Actor
  intent: Intent
  budget: BudgetState
  evaluatedPolicies: PolicyResult[]
}

interface PolicyResult {
  policyId: string
  policyType: string
  version: string
  decision: "pass" | "deny" | "review"
  reason: { code: string; message: string }
  metadata?: Record<string, unknown>
  evaluatedAt: string
}
```

### 4.2 Decision Resolution

DecisionResolver aggregates PolicyResults. MVP logic: deny > review > pass. The resolver is a first-class abstraction to support future parallel evaluation, weighted policies, async review, and AI risk scoring.

### 4.3 Built-in MVP Policies

| Policy | Behavior |
|--------|----------|
| `budget-check` | Atomic budget enforcement. Denies if `used + amount > limit`. |
| `allowlist` | Denies if target not in registered set. |
| `max-per-call` | Denies if single payment exceeds threshold. |
| `rate-limit` | Denies if N calls in time window M. |

### 4.4 Custom Policies

The middleware interface is defined and composable at `@runtimee/core` level. In v0.1, custom policies are written as inline functions using the `PolicyMiddleware` type. No plugin system, no WASM runtime, no policy DSL.

### 4.5 Error Taxonomy

**Authorization Errors (deterministic, policy-derived — agent adapts):**

| Error | Behavior |
|-------|----------|
| `BudgetExhaustedError` | Policy: budget. Agent waits for reset or requests top-up. |
| `AllowlistDeniedError` | Policy: allowlist. Target not authorized. |
| `RateLimitExceededError` | Policy: rate-limit. Too many calls in window. |
| `AuthorizationExpiredError` | Preview TTL passed. Re-simulate. |

**Execution Errors (environmental, retriable):**

| Error | Behavior |
|-------|----------|
| `NetworkError` | Chain unreachable. Retry with backoff. |
| `GasEstimationError` | Gas spike or failure. Retry with adjusted params. |
| `BroadcastError` | Transaction submission failed. Retry. |
| `ReorgDetectedError` | Chain reorganization. Re-validate. |

All errors are typed and machine-readable with `{ code, message }` structure.

## 5. Data Model

### 5.1 Core Entities

```
Actor          — financial identity
  id, name, status, createdAt

Budget         — spending limit
  actorId, amount, currency, period, used (denormalized), resetAt

Policy         — authorization rule
  actorId, type, version, config, priority

Target         — local service alias
  actorId, name, settlement { address, chain, asset }

Execution      — immutable root (authorization snapshot)
  id, actorId, idempotencyKey, requestHash
  authorization: { intent, policyResults, decision, evaluatedAt, actorVersion }
  createdAt

ExecutionEvent — append-only log
  executionId, type, data, timestamp
  types: submitted | simulated | broadcasted | confirmed | failed
```

### 5.2 Key Decisions

- `used` is denormalized on Budget for atomic race-condition-safe enforcement via `UPDATE ... WHERE used + amount <= limit`.
- Execution is immutable and append-only. Status transitions are new ExecutionEvent rows, not mutations.
- Idempotency via `idempotencyKey` with `INSERT ... ON CONFLICT DO NOTHING`.
- All monetary values stored as `bigint` (smallest unit: USDC cents). SDK handles human-readable conversion.
- Full authorization snapshot preserved in Execution for auditability, replay, and explainability.

## 6. MVP Scope (v0.1)

### 6.1 Ships

- `@runtimee/core` npm package (pure authorization kernel)
- `@runtimee/evm` npm package (Base + USDC execution adapter)
- `@runtimee/sdk` npm package (developer API)
- Actor creation with budgets and policies
- Target registration (local service aliases)
- `actor.pay()` — authorization → execution → confirmation
- `actor.previewPay()` — deterministic simulation, same authorization path
- `actor.status()` — budget and transaction overview
- Idempotent execution (developer-provided `idempotencyKey`)
- Append-only execution events
- Atomic budget enforcement
- Base network only, USDC only
- Hosted KMS signer (implementation detail, not product surface)
- Target resolution via developer-configured local mappings (no global registry)

### 6.2 Does NOT Ship

- No dashboard or UI
- No inbound receiving endpoints
- No multi-chain support
- No custom signer adapters (interface defined but not pluggable at runtime)
- No async approval/review workflows
- No analytics or reporting
- No webhook system
- No open-source release (internal MVP)
- No global service registry
- No plugin marketplace or WASM sandbox
- No policy DSL

### 6.3 Success Criteria

A developer can:
1. `npm install @runtimee/sdk`
2. Create an actor with budgets and policies
3. Fund the actor's wallet (off-chain, developer sends USDC)
4. Have their agent call `actor.pay()` to spend USDC on a service
5. See the transaction confirmed on Base
6. Hit a policy limit and receive a typed, machine-readable error
7. Call `actor.previewPay()` and see the exact authorization decision without execution

### 6.4 What the MVP Does NOT Validate

The MVP does not need to validate:
- Multi-chain demand
- Enterprise compliance workflows
- Custom signer adoption
- Dashboard utility
- Inbound payment volume

It validates one thing: **do developers building autonomous systems adopt a programmable financial runtime for outbound spending?**

## 7. Signer & Execution (MVP)

### 7.1 @runtimee/evm Implementation

- Base network
- USDC transfers
- Hosted KMS signer (AWS KSM or equivalent — invisible to developers)
- Gas strategy: estimate + 20% buffer. No gas auction logic.
- Confirmation wait: 12 blocks on Base
- Retry: simple exponential backoff for network errors

### 7.2 Custody Positioning

Custody is an implementation detail. Product language refers to "execution environment" and "financial runtime" — never "custodial wallet." The architecture supports future self-custody and external KMS adapters through the ExecutionProvider interface, but these are not exposed in v0.1.

## 8. Testing Strategy

| Tier | Scope | Tools | Frequency |
|------|-------|-------|-----------|
| Unit | `@runtimee/core` authorization logic | vitest, fast-check (property-based) | per-commit |
| Integration | `@runtimee/evm` against local anvil fork of Base | vitest, anvil | per-commit |
| E2E | Full stack on Base Sepolia testnet | Custom runner | Daily CI |

Property-based testing invariants:
- Same intent + same actor version + same policies = same authorization result
- deny always dominates review and pass
- Budget enforcement never allows `used + amount > limit`
- Authorization errors never mutate state (pure function constraint)

## 9. Circle Grant Alignment

Runtimee aligns with two published Circle grant priorities:

**Agentic Economic Activity:** "Enable autonomous AI agents to coordinate, contract, and settle value in real time with programmable, stablecoin-native infrastructure." — Direct thesis match. Runtimee provides the financial runtime layer for autonomous outbound spending.

**Treasury Management:** "Programmable liquidity management with embedded wallets, transfers, compliance tooling." — The B evolution path (Embedded Treasury Infrastructure) maps here.

**Positioning:** Execution-environment agnostic architecture. MVP targets Base + USDC for operational maturity and strong developer ecosystem. Arc integration scoped as future work — positioned as a coordination layer for cross-agent treasury orchestration and autonomous settlement workflows.

## 10. Future Evolution Path

```
v0.1 (MVP)                     v0.2                        v1.0
Agent Wallet Runtime     →    + Inbound receiving     →    Embedded Treasury
One chain, one asset          + Multi-chain USDC           Infrastructure
Outbound spending only        + Self-custody adapter       + Approval workflows
Hosted signer only            + Dashboard                  + Analytics
                              + Webhooks                   + Policy DSL
                                                            + Multi-execution
```

The architectural layer cake ensures each phase extends without rewriting:
```
@runtimee/core — unchanged across all versions
ExecutionProvider — new adapters added, interface stable
SDK — new capabilities added, existing surface unchanged
```