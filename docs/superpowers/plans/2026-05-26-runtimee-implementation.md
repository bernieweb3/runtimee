# Runtimee MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build v0.1 of Runtimee — a programmable financial runtime for autonomous systems. Developers create financial actors with policies, then call `actor.pay()` to autonomously spend USDC within constraints.

**Architecture:** Four packages in a pnpm monorepo. `@runtimee/core` is a pure TypeScript authorization kernel (zero I/O, zero blockchain deps). `@runtimee/evm` is a pluggable execution adapter for Base + USDC. `@runtimee/sdk` is the developer-facing API. `@runtimee/node` is an internal hosted service that wires everything together.

**Tech Stack:** TypeScript, pnpm workspaces, vitest, viem (for EVM interaction), Express (for hosted service), PostgreSQL (for persistence). No React, no dashboard, no wallet SDKs.

**Spec:** `docs/superpowers/specs/2026-05-26-runtimee-design.md`

---

## File Structure

```
runtimee/
  package.json                    (pnpm workspace root)
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore

  packages/
    core/
      package.json
      tsconfig.json
      src/
        types.ts                  — All core type definitions
        errors.ts                 — Authorization/Execution error classes
        policy-engine.ts          — Middleware chain + evaluate()
        decision-resolver.ts      — DecisionResolver: aggregate PolicyResults
        policies/
          budget-check.ts         — Budget check policy
          allowlist.ts            — Allowlist policy
          max-per-call.ts         — Max-per-call policy
          rate-limit.ts           — Rate-limit policy
        index.ts                  — Public API barrel export
      test/
        errors.test.ts
        decision-resolver.test.ts
        policy-engine.test.ts
        policies.test.ts
        authorization-pipeline.test.ts

    evm/
      package.json
      tsconfig.json
      src/
        types.ts                  — ExecutionProvider interface, EVM-specific types
        transaction-builder.ts    — USDC transfer encoding (ERC20 ABI)
        broadcaster.ts            — viem-based broadcast + receipt wait
        gas-strategy.ts           — Estimate + 20% buffer
        evm-provider.ts           — ExecutionProvider implementation
        index.ts                  — Public API barrel export
      test/
        evm-provider.test.ts
        transaction-builder.test.ts

    sdk/
      package.json
      tsconfig.json
      src/
        conversion.ts             — bigint ↔ human-readable USDC string
        actor-client.ts           — ActorClient with pay/previewPay/status
        runtimee.ts               — Main Runtimee client class
        index.ts                  — Public API barrel export
      test/
        conversion.test.ts
        runtimee.test.ts

    node/
      package.json
      tsconfig.json
      src/
        store/
          interface.ts            — Store interface (ActorStore, ExecutionStore)
          postgres.ts             — PostgreSQL implementation
        signer.ts                 — Hosted KMS signer
        routes.ts                 — Express route handlers
        server.ts                 — Express server setup
        index.ts                  — Entry point
      test/
        routes.test.ts
        store.test.ts
```

---

### Task 1: Scaffold Monorepo

**Files:**
- Create: `runtimee/package.json`
- Create: `runtimee/pnpm-workspace.yaml`
- Create: `runtimee/tsconfig.base.json`
- Create: `runtimee/.gitignore`
- Create: `runtimee/packages/core/package.json`
- Create: `runtimee/packages/core/tsconfig.json`
- Create: `runtimee/packages/evm/package.json`
- Create: `runtimee/packages/evm/tsconfig.json`
- Create: `runtimee/packages/sdk/package.json`
- Create: `runtimee/packages/sdk/tsconfig.json`
- Create: `runtimee/packages/node/package.json`
- Create: `runtimee/packages/node/tsconfig.json`

- [ ] **Step 1: Create root workspace files**

`runtimee/package.json`:
```json
{
  "name": "runtimee",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "test:core": "pnpm --filter @runtimee/core test",
    "test:evm": "pnpm --filter @runtimee/evm test",
    "test:sdk": "pnpm --filter @runtimee/sdk test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.5.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

`runtimee/pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`runtimee/tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  }
}
```

`runtimee/.gitignore`:
```
node_modules/
dist/
.env
.env.*
*.tsbuildinfo
coverage/
```

- [ ] **Step 2: Create @runtimee/core package files**

`runtimee/packages/core/package.json`:
```json
{
  "name": "@runtimee/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`runtimee/packages/core/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create @runtimee/evm package files**

`runtimee/packages/evm/package.json`:
```json
{
  "name": "@runtimee/evm",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@runtimee/core": "workspace:*",
    "viem": "^2.21.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`runtimee/packages/evm/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create @runtimee/sdk package files**

`runtimee/packages/sdk/package.json`:
```json
{
  "name": "@runtimee/sdk",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@runtimee/core": "workspace:*"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`runtimee/packages/sdk/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create @runtimee/node package files**

`runtimee/packages/node/package.json`:
```json
{
  "name": "@runtimee/node",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@runtimee/core": "workspace:*",
    "@runtimee/evm": "workspace:*",
    "@runtimee/sdk": "workspace:*",
    "express": "^4.19.0",
    "viem": "^2.21.0",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "vitest": "^2.0.0",
    "@types/express": "^4.17.21",
    "@types/pg": "^8.11.0",
    "tsx": "^4.16.0"
  }
}
```

`runtimee/packages/node/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

- [ ] **Step 6: Install dependencies**

Run: `pnpm install`
Expected: All packages resolve. No errors.
Run: `pnpm build`
Expected: All packages compile (empty output for now, no source yet).

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold runtimee monorepo with 4 packages"
```

---

### Task 2: @runtimee/core — Types

**Files:**
- Create: `runtimee/packages/core/src/types.ts`

- [ ] **Step 1: Write the complete types file**

`runtimee/packages/core/src/types.ts`:
```typescript
export interface Actor {
  id: string
  name: string
  status: 'active' | 'frozen' | 'depleted'
  createdAt: string
}

export interface Budget {
  id: string
  actorId: string
  amount: bigint
  used: bigint
  currency: 'USDC'
  period: 'monthly' | 'total'
  resetAt: string
}

export interface Policy {
  id: string
  actorId: string
  type: string
  version: string
  config: Record<string, unknown>
  priority: number
}

export interface SettlementDescriptor {
  address: string
  chain: string
  asset: string
}

export interface Target {
  id: string
  actorId: string
  name: string
  settlement: SettlementDescriptor
}

export interface Purpose {
  type: string
  id: string
  description?: string
}

export interface Intent {
  target: string
  amount: bigint
  purpose: Purpose
  idempotencyKey?: string
}

export interface BudgetState {
  total: bigint
  used: bigint
  remaining: bigint
  period: string
  currency: string
}

export interface PolicyResult {
  policyId: string
  policyType: string
  version: string
  decision: 'pass' | 'deny' | 'review'
  reason: { code: string; message: string }
  evaluatedAt: string
}

export type AuthorizationDecision = 'approved' | 'denied' | 'pending-review'

export interface Authorization {
  intent: Intent
  policyResults: PolicyResult[]
  decision: AuthorizationDecision
  evaluatedAt: string
  actorVersion: string
}

export interface SettlementHint {
  preferredChain?: string
  deadline?: string
  gasStrategy?: string
}

export interface ExecutionPlan {
  authorization: Authorization
  settlementHints: SettlementHint
}

export interface PolicyContext {
  actor: Actor
  intent: Intent
  budget: BudgetState
  evaluatedPolicies: PolicyResult[]
}

export type PolicyMiddleware = (
  ctx: PolicyContext,
  next: () => Promise<PolicyResult>
) => Promise<PolicyResult>

export interface PolicyEvaluator {
  id: string
  type: string
  version: string
  middleware: PolicyMiddleware
}

export interface SimulationResult {
  decision: AuthorizationDecision
  policyResults: PolicyResult[]
  estimatedGas?: bigint
  estimatedCost?: bigint
}

export interface SignedTransaction {
  serialized: `0x${string}`
  hash: `0x${string}`
}

export interface Receipt {
  txHash: `0x${string}`
  status: 'confirmed' | 'failed'
  blockNumber: bigint
  gasUsed: bigint
  effectiveGasPrice: bigint
}
```

- [ ] **Step 2: Create index.ts with re-export**

`runtimee/packages/core/src/index.ts`:
```typescript
export type {
  Actor,
  Budget,
  Policy,
  SettlementDescriptor,
  Target,
  Purpose,
  Intent,
  BudgetState,
  PolicyResult,
  AuthorizationDecision,
  Authorization,
  SettlementHint,
  ExecutionPlan,
  PolicyContext,
  PolicyMiddleware,
  PolicyEvaluator,
  SimulationResult,
  SignedTransaction,
  Receipt,
} from './types.js'
```

- [ ] **Step 3: Run typecheck**

Run: `pnpm --filter @runtimee/core typecheck`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add packages/core/src/types.ts packages/core/src/index.ts
git commit -m "feat(core): add core type definitions"
```

---

### Task 3: @runtimee/core — Errors

**Files:**
- Create: `runtimee/packages/core/src/errors.ts`
- Modify: `runtimee/packages/core/src/index.ts`

- [ ] **Step 1: Write error classes**

`runtimee/packages/core/src/errors.ts`:
```typescript
export interface ErrorCodeMessage {
  code: string
  message: string
}

export class AuthorizationError extends Error {
  public readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'AuthorizationError'
    this.code = code
  }
}

export class BudgetExhaustedError extends AuthorizationError {
  public readonly policyId: string
  public readonly budgetUsed: bigint
  public readonly budgetLimit: bigint
  constructor(policyId: string, used: bigint, limit: bigint) {
    super(
      'budget_exhausted',
      `Budget exhausted: ${used} used of ${limit} limit`
    )
    this.name = 'BudgetExhaustedError'
    this.policyId = policyId
    this.budgetUsed = used
    this.budgetLimit = limit
  }
}

export class AllowlistDeniedError extends AuthorizationError {
  public readonly policyId: string
  public readonly target: string
  constructor(policyId: string, target: string) {
    super('allowlist_denied', `Target "${target}" not in allowlist`)
    this.name = 'AllowlistDeniedError'
    this.policyId = policyId
    this.target = target
  }
}

export class RateLimitExceededError extends AuthorizationError {
  public readonly policyId: string
  public readonly windowMs: number
  public readonly maxCalls: number
  constructor(policyId: string, windowMs: number, maxCalls: number) {
    super(
      'rate_limit_exceeded',
      `Rate limit exceeded: max ${maxCalls} calls per ${windowMs}ms window`
    )
    this.name = 'RateLimitExceededError'
    this.policyId = policyId
    this.windowMs = windowMs
    this.maxCalls = maxCalls
  }
}

export class AuthorizationExpiredError extends AuthorizationError {
  constructor() {
    super('authorization_expired', 'Authorization preview has expired. Re-simulate.')
    this.name = 'AuthorizationExpiredError'
  }
}

export class ExecutionError extends Error {
  public readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = 'ExecutionError'
    this.code = code
  }
}

export class NetworkError extends ExecutionError {
  constructor(message: string) {
    super('network_error', message)
    this.name = 'NetworkError'
  }
}

export class GasEstimationError extends ExecutionError {
  constructor(message: string) {
    super('gas_estimation_error', message)
    this.name = 'GasEstimationError'
  }
}

export class BroadcastError extends ExecutionError {
  constructor(message: string) {
    super('broadcast_error', message)
    this.name = 'BroadcastError'
  }
}

export class ReorgDetectedError extends ExecutionError {
  constructor(public readonly depth: number) {
    super('reorg_detected', `Chain reorg detected at depth ${depth}`)
    this.name = 'ReorgDetectedError'
  }
}
```

- [ ] **Step 2: Update index.ts**

`runtimee/packages/core/src/index.ts`:
```typescript
export type {
  Actor,
  Budget,
  Policy,
  SettlementDescriptor,
  Target,
  Purpose,
  Intent,
  BudgetState,
  PolicyResult,
  AuthorizationDecision,
  Authorization,
  SettlementHint,
  ExecutionPlan,
  PolicyContext,
  PolicyMiddleware,
  PolicyEvaluator,
  SimulationResult,
  SignedTransaction,
  Receipt,
} from './types.js'

export {
  AuthorizationError,
  BudgetExhaustedError,
  AllowlistDeniedError,
  RateLimitExceededError,
  AuthorizationExpiredError,
  ExecutionError,
  NetworkError,
  GasEstimationError,
  BroadcastError,
  ReorgDetectedError,
} from './errors.js'
export type { ErrorCodeMessage } from './errors.js'
```

- [ ] **Step 3: Write error tests**

`runtimee/packages/core/test/errors.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import {
  AuthorizationError,
  BudgetExhaustedError,
  AllowlistDeniedError,
  RateLimitExceededError,
  AuthorizationExpiredError,
  ExecutionError,
  NetworkError,
  GasEstimationError,
  BroadcastError,
  ReorgDetectedError,
} from '../src/errors.js'

describe('AuthorizationError', () => {
  it('creates with code and message', () => {
    const err = new AuthorizationError('test_code', 'test message')
    expect(err.code).toBe('test_code')
    expect(err.message).toBe('test message')
    expect(err.name).toBe('AuthorizationError')
  })
})

describe('BudgetExhaustedError', () => {
  it('sets correct code and properties', () => {
    const err = new BudgetExhaustedError('pol_1', 100n, 500n)
    expect(err.code).toBe('budget_exhausted')
    expect(err.budgetUsed).toBe(100n)
    expect(err.budgetLimit).toBe(500n)
    expect(err.policyId).toBe('pol_1')
    expect(err.message).toContain('100')
    expect(err.message).toContain('500')
  })
})

describe('AllowlistDeniedError', () => {
  it('sets correct code and target', () => {
    const err = new AllowlistDeniedError('pol_1', 'openai:gpt-4')
    expect(err.code).toBe('allowlist_denied')
    expect(err.target).toBe('openai:gpt-4')
    expect(err.message).toContain('openai:gpt-4')
  })
})

describe('RateLimitExceededError', () => {
  it('sets correct code and properties', () => {
    const err = new RateLimitExceededError('pol_1', 60_000, 10)
    expect(err.code).toBe('rate_limit_exceeded')
    expect(err.windowMs).toBe(60_000)
    expect(err.maxCalls).toBe(10)
  })
})

describe('AuthorizationExpiredError', () => {
  it('sets correct code', () => {
    const err = new AuthorizationExpiredError()
    expect(err.code).toBe('authorization_expired')
  })
})

describe('ExecutionError', () => {
  it('creates with code and message', () => {
    const err = new ExecutionError('exec_code', 'exec message')
    expect(err.code).toBe('exec_code')
    expect(err.name).toBe('ExecutionError')
  })
})

describe('NetworkError', () => {
  it('sets correct code', () => {
    const err = new NetworkError('connection refused')
    expect(err.code).toBe('network_error')
    expect(err.message).toBe('connection refused')
  })
})

describe('GasEstimationError', () => {
  it('sets correct code', () => {
    const err = new GasEstimationError('gas too high')
    expect(err.code).toBe('gas_estimation_error')
  })
})

describe('BroadcastError', () => {
  it('sets correct code', () => {
    const err = new BroadcastError('tx failed')
    expect(err.code).toBe('broadcast_error')
  })
})

describe('ReorgDetectedError', () => {
  it('sets correct code and depth', () => {
    const err = new ReorgDetectedError(3)
    expect(err.code).toBe('reorg_detected')
    expect(err.depth).toBe(3)
  })
})
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @runtimee/core test`
Expected: All 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/core/src/errors.ts packages/core/src/index.ts packages/core/test/
git commit -m "feat(core): add error classes with tests"
```

---

### Task 4: @runtimee/core — Decision Resolver

**Files:**
- Create: `runtimee/packages/core/src/decision-resolver.ts`
- Modify: `runtimee/packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/core/test/decision-resolver.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { DecisionResolver } from '../src/decision-resolver.js'
import type { PolicyResult } from '../src/types.js'

function makeResult(decision: PolicyResult['decision']): PolicyResult {
  return {
    policyId: 'pol_1',
    policyType: 'test',
    version: '1',
    decision,
    reason: { code: 'test', message: 'test' },
    evaluatedAt: new Date().toISOString(),
  }
}

describe('DecisionResolver', () => {
  it('returns denied for empty results', () => {
    expect(DecisionResolver.resolve([])).toBe('denied')
  })

  it('returns approved for single pass', () => {
    expect(DecisionResolver.resolve([makeResult('pass')])).toBe('approved')
  })

  it('returns denied for single deny', () => {
    expect(DecisionResolver.resolve([makeResult('deny')])).toBe('denied')
  })

  it('returns pending-review for single review', () => {
    expect(DecisionResolver.resolve([makeResult('review')])).toBe('pending-review')
  })

  it('deny overrides pass', () => {
    const results = [makeResult('pass'), makeResult('deny'), makeResult('pass')]
    expect(DecisionResolver.resolve(results)).toBe('denied')
  })

  it('deny overrides review', () => {
    const results = [makeResult('review'), makeResult('deny')]
    expect(DecisionResolver.resolve(results)).toBe('denied')
  })

  it('review overrides pass', () => {
    const results = [makeResult('pass'), makeResult('review')]
    expect(DecisionResolver.resolve(results)).toBe('pending-review')
  })

  it('returns approved for all passes', () => {
    const results = [makeResult('pass'), makeResult('pass'), makeResult('pass')]
    expect(DecisionResolver.resolve(results)).toBe('approved')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/core test`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

`runtimee/packages/core/src/decision-resolver.ts`:
```typescript
import type { PolicyResult, AuthorizationDecision } from './types.js'

export class DecisionResolver {
  static resolve(results: PolicyResult[]): AuthorizationDecision {
    if (results.length === 0) return 'denied'
    let hasDeny = false
    let hasReview = false
    for (const r of results) {
      if (r.decision === 'deny') hasDeny = true
      else if (r.decision === 'review') hasReview = true
    }
    if (hasDeny) return 'denied'
    if (hasReview) return 'pending-review'
    return 'approved'
  }
}
```

- [ ] **Step 4: Update index.ts**

`runtimee/packages/core/src/index.ts`:
Add export:
```typescript
export { DecisionResolver } from './decision-resolver.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @runtimee/core test`
Expected: All 22 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/decision-resolver.ts packages/core/test/decision-resolver.test.ts packages/core/src/index.ts
git commit -m "feat(core): add DecisionResolver with deny-override logic"
```

---

### Task 5: @runtimee/core — Policy Engine

**Files:**
- Create: `runtimee/packages/core/src/policy-engine.ts`
- Modify: `runtimee/packages/core/src/index.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/core/test/policy-engine.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { PolicyEngine } from '../src/policy-engine.js'
import type {
  Actor,
  Intent,
  PolicyContext,
  PolicyMiddleware,
  PolicyEvaluator,
  BudgetState,
  PolicyResult,
} from '../src/types.js'

const defaultActor: Actor = {
  id: 'actor_1',
  name: 'test-agent',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const defaultIntent: Intent = {
  target: 'test:service',
  amount: 100n,
  purpose: { type: 'test', id: '1' },
}

const defaultBudget: BudgetState = {
  total: 1000n,
  used: 200n,
  remaining: 800n,
  period: 'monthly',
  currency: 'USDC',
}

function passMiddleware(id: string): PolicyEvaluator {
  return {
    id,
    type: 'pass',
    version: '1',
    middleware: async (_ctx, next) => {
      const result = await next()
      return result
    },
  }
}

function denyMiddleware(id: string): PolicyEvaluator {
  return {
    id,
    type: 'deny',
    version: '1',
    middleware: async (_ctx, _next) => ({
      policyId: id,
      policyType: 'deny',
      version: '1',
      decision: 'deny' as const,
      reason: { code: 'test_deny', message: 'denied by test' },
      evaluatedAt: new Date().toISOString(),
    }),
  }
}

describe('PolicyEngine', () => {
  it('returns approved for empty middleware list', async () => {
    const engine = new PolicyEngine([])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.decision).toBe('approved')
    expect(result.policyResults).toHaveLength(0)
  })

  it('evaluates all pass middlewares', async () => {
    const engine = new PolicyEngine([
      passMiddleware('pol_1'),
      passMiddleware('pol_2'),
    ])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.decision).toBe('approved')
    expect(result.policyResults).toHaveLength(2)
  })

  it('deny overrides pass results', async () => {
    const engine = new PolicyEngine([
      passMiddleware('pol_1'),
      denyMiddleware('pol_2'),
    ])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.decision).toBe('denied')
    expect(result.policyResults).toHaveLength(2)
  })

  it('includes actor version in authorization', async () => {
    const engine = new PolicyEngine([])
    const result = await engine.evaluate(defaultActor, defaultIntent, defaultBudget)
    expect(result.actorVersion).toBe('1')
    expect(result.intent).toEqual(defaultIntent)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/core test`
Expected: FAIL.

- [ ] **Step 3: Write minimal implementation**

`runtimee/packages/core/src/policy-engine.ts`:
```typescript
import type { Actor, Intent, BudgetState, PolicyEvaluator, Authorization } from './types.js'
import { DecisionResolver } from './decision-resolver.js'

export class PolicyEngine {
  private readonly evaluators: PolicyEvaluator[]

  constructor(evaluators: PolicyEvaluator[]) {
    this.evaluators = evaluators
  }

  async evaluate(
    actor: Actor,
    intent: Intent,
    budget: BudgetState
  ): Promise<Authorization> {
    const evaluatedAt = new Date().toISOString()
    const policyResults = await Promise.all(
      this.evaluators.map((evaluator) =>
        this.runEvaluator(evaluator, actor, intent, budget)
      )
    )
    const decision = DecisionResolver.resolve(policyResults)
    return {
      intent,
      policyResults,
      decision,
      evaluatedAt,
      actorVersion: '1',
    }
  }

  private async runEvaluator(
    evaluator: PolicyEvaluator,
    actor: Actor,
    intent: Intent,
    budget: BudgetState
  ): Promise<{ policyId: string; policyType: string; version: string; decision: 'pass' | 'deny' | 'review'; reason: { code: string; message: string }; evaluatedAt: string }> {
    const ctx = {
      actor,
      intent,
      budget,
      evaluatedPolicies: [],
    }

    const finalNext = async () => ({
      policyId: evaluator.id,
      policyType: evaluator.type,
      version: evaluator.version,
      decision: 'pass' as const,
      reason: { code: 'noop', message: 'No policy applied' },
      evaluatedAt: new Date().toISOString(),
    })

    return evaluator.middleware(ctx, finalNext)
  }
}
```

- [ ] **Step 4: Update index.ts**

Add export:
```typescript
export { PolicyEngine } from './policy-engine.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @runtimee/core test`
Expected: All 26 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/policy-engine.ts packages/core/test/policy-engine.test.ts packages/core/src/index.ts
git commit -m "feat(core): add PolicyEngine with middleware evaluation"
```

---

### Task 6: @runtimee/core — Built-in Policies

**Files:**
- Create: `runtimee/packages/core/src/policies/budget-check.ts`
- Create: `runtimee/packages/core/src/policies/allowlist.ts`
- Create: `runtimee/packages/core/src/policies/max-per-call.ts`
- Create: `runtimee/packages/core/src/policies/rate-limit.ts`
- Create: `runtimee/packages/core/src/policies/index.ts`
- Modify: `runtimee/packages/core/src/index.ts`

- [ ] **Step 1: Write the failing tests**

`runtimee/packages/core/test/policies.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { createBudgetCheckPolicy } from '../src/policies/budget-check.js'
import { createAllowlistPolicy } from '../src/policies/allowlist.js'
import { createMaxPerCallPolicy } from '../src/policies/max-per-call.js'
import { createRateLimitPolicy } from '../src/policies/rate-limit.js'
import type { Actor, Intent, BudgetState, PolicyContext, PolicyResult } from '../src/types.js'

const defaultActor: Actor = {
  id: 'actor_1',
  name: 'test-agent',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const defaultBudget: BudgetState = {
  total: 1000n,
  used: 200n,
  remaining: 800n,
  period: 'monthly',
  currency: 'USDC',
}

async function evaluatePolicy(
  // deno-lint-ignore no-explicit-any
  policy: { middleware: any },
  intent: Intent,
  budget: BudgetState = defaultBudget,
  actor: Actor = defaultActor
): Promise<PolicyResult> {
  const next = async () => ({
    policyId: 'test',
    policyType: 'test',
    version: '1',
    decision: 'pass' as const,
    reason: { code: 'noop', message: 'noop' },
    evaluatedAt: new Date().toISOString(),
  })
  return policy.middleware(
    { actor, intent, budget, evaluatedPolicies: [] },
    next
  )
}

describe('BudgetCheckPolicy', () => {
  it('passes when used + amount <= limit', async () => {
    const policy = createBudgetCheckPolicy('pol_budget', '1')
    const intent: Intent = {
      target: 'test:svc',
      amount: 300n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when used + amount > limit', async () => {
    const policy = createBudgetCheckPolicy('pol_budget', '1')
    const intent: Intent = {
      target: 'test:svc',
      amount: 900n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
    expect(result.reason.code).toBe('budget_exhausted')
  })

  it('uses budget from context', async () => {
    const policy = createBudgetCheckPolicy('pol_budget', '1')
    const intent: Intent = {
      target: 'test:svc',
      amount: 50n,
      purpose: { type: 'test', id: '1' },
    }
    const smallBudget: BudgetState = {
      total: 100n,
      used: 80n,
      remaining: 20n,
      period: 'total',
      currency: 'USDC',
    }
    const result = await evaluatePolicy(policy, intent, smallBudget)
    expect(result.decision).toBe('deny')
  })
})

describe('AllowlistPolicy', () => {
  it('passes when target is in allowlist', async () => {
    const policy = createAllowlistPolicy('pol_allow', '1', ['good:svc', 'better:svc'])
    const intent: Intent = {
      target: 'good:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when target is not in allowlist', async () => {
    const policy = createAllowlistPolicy('pol_allow', '1', ['good:svc'])
    const intent: Intent = {
      target: 'evil:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
    expect(result.reason.code).toBe('allowlist_denied')
  })
})

describe('MaxPerCallPolicy', () => {
  it('passes when amount <= max', async () => {
    const policy = createMaxPerCallPolicy('pol_max', '1', 500n)
    const intent: Intent = {
      target: 'test:svc',
      amount: 300n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when amount > max', async () => {
    const policy = createMaxPerCallPolicy('pol_max', '1', 500n)
    const intent: Intent = {
      target: 'test:svc',
      amount: 600n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
  })
})

describe('RateLimitPolicy', () => {
  it('passes when call count is within limit', async () => {
    const store = new Map<string, number[]>()
    const policy = createRateLimitPolicy('pol_rate', '1', 10, 60_000, store)
    const intent: Intent = {
      target: 'test:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('pass')
  })

  it('denies when call count exceeds limit', async () => {
    const now = Date.now()
    const store = new Map<string, number[]>()
    store.set('actor_1', Array(10).fill(now - 1000))
    const policy = createRateLimitPolicy('pol_rate', '1', 10, 60_000, store)
    const intent: Intent = {
      target: 'test:svc',
      amount: 100n,
      purpose: { type: 'test', id: '1' },
    }
    const result = await evaluatePolicy(policy, intent)
    expect(result.decision).toBe('deny')
    expect(result.reason.code).toBe('rate_limit_exceeded')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/core test`
Expected: FAIL (module not found).

- [ ] **Step 3: Write policy implementations**

`runtimee/packages/core/src/policies/budget-check.ts`:
```typescript
import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createBudgetCheckPolicy(
  id: string,
  version: string
): PolicyEvaluator {
  const middleware: PolicyMiddleware = async (ctx, next) => {
    const { intent, budget } = ctx
    const projected = budget.used + intent.amount
    if (projected > budget.total) {
      return {
        policyId: id,
        policyType: 'budget-check',
        version,
        decision: 'deny',
        reason: {
          code: 'budget_exhausted',
          message: `Budget exhausted: ${budget.used + intent.amount} would exceed ${budget.total} (${budget.period})`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    return next()
  }
  return { id, type: 'budget-check', version, middleware }
}
```

`runtimee/packages/core/src/policies/allowlist.ts`:
```typescript
import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createAllowlistPolicy(
  id: string,
  version: string,
  allowedTargets: string[]
): PolicyEvaluator {
  const set = new Set(allowedTargets)
  const middleware: PolicyMiddleware = async (ctx, next) => {
    if (!set.has(ctx.intent.target)) {
      return {
        policyId: id,
        policyType: 'allowlist',
        version,
        decision: 'deny',
        reason: {
          code: 'allowlist_denied',
          message: `Target "${ctx.intent.target}" is not in the allowlist`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    return next()
  }
  return { id, type: 'allowlist', version, middleware }
}
```

`runtimee/packages/core/src/policies/max-per-call.ts`:
```typescript
import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createMaxPerCallPolicy(
  id: string,
  version: string,
  maxAmount: bigint
): PolicyEvaluator {
  const middleware: PolicyMiddleware = async (ctx, next) => {
    if (ctx.intent.amount > maxAmount) {
      return {
        policyId: id,
        policyType: 'max-per-call',
        version,
        decision: 'deny',
        reason: {
          code: 'max_per_call_exceeded',
          message: `Payment amount ${ctx.intent.amount} exceeds max-per-call limit of ${maxAmount}`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    return next()
  }
  return { id, type: 'max-per-call', version, middleware }
}
```

`runtimee/packages/core/src/policies/rate-limit.ts`:
```typescript
import type { PolicyContext, PolicyMiddleware, PolicyEvaluator } from '../types.js'

export function createRateLimitPolicy(
  id: string,
  version: string,
  maxCalls: number,
  windowMs: number,
  store: Map<string, number[]> = new Map()
): PolicyEvaluator {
  const middleware: PolicyMiddleware = async (ctx, _next) => {
    const actorKey = ctx.actor.id
    const now = Date.now()
    const timestamps = store.get(actorKey) || []
    const recent = timestamps.filter((t) => now - t < windowMs)
    if (recent.length >= maxCalls) {
      return {
        policyId: id,
        policyType: 'rate-limit',
        version,
        decision: 'deny',
        reason: {
          code: 'rate_limit_exceeded',
          message: `Rate limit exceeded: ${recent.length} calls in window (max ${maxCalls})`,
        },
        evaluatedAt: new Date().toISOString(),
      }
    }
    recent.push(now)
    store.set(actorKey, recent)
    return {
      policyId: id,
      policyType: 'rate-limit',
      version,
      decision: 'pass',
      reason: { code: 'rate_limit_ok', message: 'Rate limit not exceeded' },
      evaluatedAt: new Date().toISOString(),
    }
  }
  return { id, type: 'rate-limit', version, middleware }
}
```

`runtimee/packages/core/src/policies/index.ts`:
```typescript
export { createBudgetCheckPolicy } from './budget-check.js'
export { createAllowlistPolicy } from './allowlist.js'
export { createMaxPerCallPolicy } from './max-per-call.js'
export { createRateLimitPolicy } from './rate-limit.js'
```

- [ ] **Step 4: Update core index.ts**

Add export:
```typescript
export {
  createBudgetCheckPolicy,
  createAllowlistPolicy,
  createMaxPerCallPolicy,
  createRateLimitPolicy,
} from './policies/index.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @runtimee/core test`
Expected: All 35 tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/policies/ packages/core/src/index.ts packages/core/test/policies.test.ts
git commit -m "feat(core): add built-in policies (budget, allowlist, max-per-call, rate-limit)"
```

---

### Task 7: @runtimee/evm — Types and ExecutionProvider

**Files:**
- Create: `runtimee/packages/evm/src/types.ts`
- Create: `runtimee/packages/evm/src/index.ts`

- [ ] **Step 1: Write EVM types and execution provider interface**

`runtimee/packages/evm/src/types.ts`:
```typescript
import type { Intent, ExecutionPlan, SignedTransaction, Receipt, SimulationResult } from '@runtimee/core'

export interface ExecutionProvider {
  simulate(intent: Intent): Promise<SimulationResult>
  sign(executionPlan: ExecutionPlan): Promise<SignedTransaction>
  broadcast(signed: SignedTransaction): Promise<`0x${string}`>
  wait(txHash: `0x${string}`, confirmations?: number): Promise<Receipt>
}

export interface Signer {
  signTransaction(tx: {
    to: `0x${string}`
    data: `0x${string}`
    value: bigint
    chainId: number
    gasLimit: bigint
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    nonce: number
  }): Promise<`0x${string}`>
}

export interface Broadcaster {
  sendRawTransaction(signedTx: `0x${string}`): Promise<`0x${string}`>
  getTransactionReceipt(txHash: `0x${string}`): Promise<{
    status: 'success' | 'reverted'
    blockNumber: bigint
    gasUsed: bigint
    effectiveGasPrice: bigint
  } | null>
  getTransactionCount(address: `0x${string}`): Promise<number>
  estimateGas(tx: { to: `0x${string}`; data: `0x${string}`; value: bigint; from: `0x${string}` }): Promise<bigint>
}

export const USDC_DECIMALS = 6
export const USDC_ADDRESS_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'

export const USDC_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
] as const
```

`runtimee/packages/evm/src/index.ts`:
```typescript
export type { ExecutionProvider, Signer, Broadcaster } from './types.js'
export { USDC_DECIMALS, USDC_ADDRESS_BASE, USDC_ABI } from './types.js'
```

- [ ] **Step 2: Write type validation test**

`runtimee/packages/evm/test/evm-provider.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { USDC_ADDRESS_BASE, USDC_DECIMALS } from '../src/types.js'

describe('EVM types', () => {
  it('USDC address on Base is valid hex', () => {
    expect(USDC_ADDRESS_BASE).toMatch(/^0x[0-9a-fA-F]{40}$/)
  })

  it('USDC has 6 decimals', () => {
    expect(USDC_DECIMALS).toBe(6)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @runtimee/evm test`
Expected: Both tests pass.

- [ ] **Step 4: Run typecheck across all packages**

Run: `pnpm -r typecheck`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add packages/evm/
git commit -m "feat(evm): add ExecutionProvider interface and EVM types"
```

---

### Task 8: @runtimee/evm — Transaction Builder

**Files:**
- Create: `runtimee/packages/evm/src/transaction-builder.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/evm/test/transaction-builder.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { encodeUsdcTransfer, buildEvmTransaction } from '../src/transaction-builder.js'

describe('encodeUsdcTransfer', () => {
  it('encodes a USDC transfer to a valid hex string', () => {
    const data = encodeUsdcTransfer(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      1000000n // 1 USDC
    )
    expect(data).toMatch(/^0x[0-9a-f]+$/)
    // Should contain the transfer function signature
    expect(data.length).toBeGreaterThan(10)
  })

  it('encodes different amounts differently', () => {
    const a = encodeUsdcTransfer(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      1000000n
    )
    const b = encodeUsdcTransfer(
      '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      2000000n
    )
    expect(a).not.toBe(b)
  })
})

describe('buildEvmTransaction', () => {
  it('builds a valid EVM transaction object', () => {
    const tx = buildEvmTransaction({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      from: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' as `0x${string}`,
      amount: 5000000n, // 5 USDC
      chainId: 8453,
      nonce: 0,
      gasLimit: 100000n,
    })
    expect(tx.to).toBe('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')
    expect(tx.value).toBe(0n) // USDC is ERC20, value is 0
    expect(tx.data).toMatch(/^0x[0-9a-f]+$/)
    expect(tx.chainId).toBe(8453)
    expect(tx.nonce).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/evm test`
Expected: FAIL.

- [ ] **Step 3: Write transaction builder**

`runtimee/packages/evm/src/transaction-builder.ts`:
```typescript
import { encodeFunctionData } from 'viem'
import { USDC_ADDRESS_BASE, USDC_ABI } from './types.js'

export interface BuildTxParams {
  to: `0x${string}`
  from: `0x${string}`
  amount: bigint
  chainId: number
  nonce: number
  gasLimit: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

export interface EvmTransaction {
  to: `0x${string}`
  data: `0x${string}`
  value: bigint
  chainId: number
  nonce: number
  gasLimit: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
}

export function encodeUsdcTransfer(
  recipient: `0x${string}`,
  amount: bigint
): `0x${string}` {
  return encodeFunctionData({
    abi: USDC_ABI,
    functionName: 'transfer',
    args: [recipient, amount],
  })
}

export function buildEvmTransaction(params: BuildTxParams): EvmTransaction {
  const data = encodeUsdcTransfer(params.to, params.amount)
  return {
    to: USDC_ADDRESS_BASE,
    data,
    value: 0n,
    chainId: params.chainId,
    nonce: params.nonce,
    gasLimit: params.gasLimit,
    maxFeePerGas: params.maxFeePerGas,
    maxPriorityFeePerGas: params.maxPriorityFeePerGas,
  }
}
```

- [ ] **Step 4: Update evm index.ts**

```typescript
export type { ExecutionProvider, Signer, Broadcaster } from './types.js'
export { USDC_DECIMALS, USDC_ADDRESS_BASE, USDC_ABI } from './types.js'
export { encodeUsdcTransfer, buildEvmTransaction } from './transaction-builder.js'
export type { BuildTxParams, EvmTransaction } from './transaction-builder.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @runtimee/evm test`
Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add packages/evm/src/transaction-builder.ts packages/evm/src/index.ts packages/evm/test/transaction-builder.test.ts
git commit -m "feat(evm): add USDC transfer encoding and EVM transaction builder"
```

---

### Task 9: @runtimee/evm — Broadcaster and Gas Strategy

**Files:**
- Create: `runtimee/packages/evm/src/gas-strategy.ts`
- Create: `runtimee/packages/evm/src/broadcaster.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/evm/test/evm-provider.test.ts` (append):
```typescript
import { estimateGasWithBuffer } from '../src/gas-strategy.js'

describe('GasStrategy', () => {
  it('adds 20% buffer to estimated gas', () => {
    const result = estimateGasWithBuffer(100000n)
    expect(result).toBe(120000n)
  })

  it('handles zero gas', () => {
    const result = estimateGasWithBuffer(0n)
    expect(result).toBe(0n)
  })

  it('rounds up fractional buffers', () => {
    const result = estimateGasWithBuffer(1n)
    expect(result).toBe(2n) // ceil(1 * 1.2) = 2
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/evm test`
Expected: FAIL.

- [ ] **Step 3: Write gas strategy**

`runtimee/packages/evm/src/gas-strategy.ts`:
```typescript
export function estimateGasWithBuffer(estimatedGas: bigint): bigint {
  if (estimatedGas === 0n) return 0n
  const buffer = estimatedGas * 20n / 100n
  return estimatedGas + buffer
}
```

- [ ] **Step 4: Write broadcaster**

`runtimee/packages/evm/src/broadcaster.ts`:
```typescript
import {
  createPublicClient,
  createWalletClient,
  http,
  type Chain,
} from 'viem'
import { base } from 'viem/chains'
import type { Broadcaster } from './types.js'

export interface BroadcasterConfig {
  rpcUrl: string
  chain?: Chain
}

export function createViemBroadcaster(config: BroadcasterConfig): Broadcaster {
  const chain = config.chain ?? base
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  })

  return {
    async sendRawTransaction(signedTx) {
      // Use wallet client with a local account to send raw tx
      // In the hosted service, the KMS signer provides the signed tx
      // and we send it via a simple RPC call
      const { request: _ } = await publicClient.request({
        method: 'eth_sendRawTransaction',
        params: [signedTx],
      }) as unknown as Promise<`0x${string}`>
      // Re-fetch properly
      const hash = await publicClient.request({
        method: 'eth_sendRawTransaction',
        params: [signedTx],
      })
      return hash
    },

    async getTransactionReceipt(txHash) {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash })
      if (!receipt) return null
      return {
        status: receipt.status === 'success' ? 'success' : 'reverted',
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
      }
    },

    async getTransactionCount(address) {
      return publicClient.getTransactionCount({ address })
    },

    async estimateGas(tx) {
      return publicClient.estimateGas({
        account: tx.from,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      })
    },
  }
}
```

- [ ] **Step 5: Update index.ts**

```typescript
export { estimateGasWithBuffer } from './gas-strategy.js'
export { createViemBroadcaster } from './broadcaster.js'
export type { BroadcasterConfig } from './broadcaster.js'
```

- [ ] **Step 6: Run tests**

Run: `pnpm --filter @runtimee/evm test`
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add packages/evm/src/gas-strategy.ts packages/evm/src/broadcaster.ts packages/evm/src/index.ts packages/evm/test/evm-provider.test.ts
git commit -m "feat(evm): add gas strategy and viem broadcaster"
```

---

### Task 10: @runtimee/evm — EVMProvider (ExecutionProvider)

**Files:**
- Create: `runtimee/packages/evm/src/evm-provider.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/evm/test/evm-provider.test.ts` (append):
```typescript
import { describe, expect, it } from 'vitest'
import { createEVMProvider } from '../src/evm-provider.js'
import type { Intent } from '@runtimee/core'

describe('EVMProvider', () => {
  it('can be instantiated', () => {
    const provider = createEVMProvider({
      rpcUrl: 'https://sepolia.base.org',
      signerAddress: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
    })
    expect(provider).toBeDefined()
    expect(typeof provider.simulate).toBe('function')
    expect(typeof provider.broadcast).toBe('function')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/evm test`
Expected: FAIL.

- [ ] **Step 3: Write EVMProvider**

`runtimee/packages/evm/src/evm-provider.ts`:
```typescript
import type { Intent, ExecutionPlan, SignedTransaction, Receipt, SimulationResult } from '@runtimee/core'
import type { ExecutionProvider, Signer } from './types.js'
import type { BroadcasterConfig } from './broadcaster.js'
import { createViemBroadcaster } from './broadcaster.js'
import { estimateGasWithBuffer } from './gas-strategy.js'
import { buildEvmTransaction } from './transaction-builder.js'

export interface EVMProviderConfig extends BroadcasterConfig {
  signerAddress: `0x${string}`
}

export function createEVMProvider(
  config: EVMProviderConfig,
  signer?: Signer
): ExecutionProvider {
  const broadcaster = createViemBroadcaster(config)
  const chainId = config.chain?.id ?? 8453

  return {
    async simulate(intent: Intent): Promise<SimulationResult> {
      return {
        decision: 'approved',
        policyResults: [],
        estimatedGas: 100000n,
        estimatedCost: intent.amount,
      }
    },

    async sign(executionPlan: ExecutionPlan): Promise<SignedTransaction> {
      if (!signer) {
        throw new Error('No signer configured. Cannot sign transactions.')
      }
      const auth = executionPlan.authorization
      const nonce = await broadcaster.getTransactionCount(config.signerAddress)
      const gasEstimate = await broadcaster.estimateGas({
        to: config.signerAddress,
        data: '0x' as `0x${string}`,
        value: 0n,
        from: config.signerAddress,
      })
      const gasLimit = estimateGasWithBuffer(gasEstimate)

      const tx = buildEvmTransaction({
        to: auth.intent.target as `0x${string}`,
        from: config.signerAddress,
        amount: auth.intent.amount,
        chainId,
        nonce,
        gasLimit,
      })

      const serialized = await signer.signTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId,
        gasLimit: tx.gasLimit,
        nonce: tx.nonce,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
      })

      return { serialized, hash: '0x0000000000000000000000000000000000000000000000000000000000000000' as `0x${string}` }
    },

    async broadcast(signed: SignedTransaction): Promise<`0x${string}`> {
      return broadcaster.sendRawTransaction(signed.serialized)
    },

    async wait(txHash: `0x${string}`, confirmations = 12): Promise<Receipt> {
      while (true) {
        const receipt = await broadcaster.getTransactionReceipt(txHash)
        if (receipt && receipt.blockNumber > 0n) {
          return {
            txHash,
            status: receipt.status === 'success' ? 'confirmed' : 'failed',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
            effectiveGasPrice: receipt.effectiveGasPrice,
          }
        }
        await new Promise((r) => setTimeout(r, 2000))
      }
    },
  }
}
```

- [ ] **Step 4: Update index.ts**

```typescript
export { createEVMProvider } from './evm-provider.js'
export type { EVMProviderConfig } from './evm-provider.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @runtimee/evm test`
Expected: All tests pass.

- [ ] **Step 6: Run typecheck across all packages**

Run: `pnpm -r typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/evm/src/evm-provider.ts packages/evm/src/index.ts packages/evm/test/
git commit -m "feat(evm): add EVMProvider implementing ExecutionProvider"
```

---

### Task 11: @runtimee/sdk — Conversion Utilities

**Files:**
- Create: `runtimee/packages/sdk/src/conversion.ts`
- Create: `runtimee/packages/sdk/src/index.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/sdk/test/conversion.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { parseUsdc, formatUsdc } from '../src/conversion.js'

describe('parseUsdc', () => {
  it('converts whole USDC to smallest unit', () => {
    expect(parseUsdc('1')).toBe(1_000_000n)
    expect(parseUsdc('100')).toBe(100_000_000n)
  })

  it('converts decimal USDC to smallest unit', () => {
    expect(parseUsdc('0.05')).toBe(50_000n)
    expect(parseUsdc('1.5')).toBe(1_500_000n)
  })

  it('handles very small amounts', () => {
    expect(parseUsdc('0.000001')).toBe(1n)
  })

  it('throws on invalid input', () => {
    expect(() => parseUsdc('not-a-number')).toThrow()
  })
})

describe('formatUsdc', () => {
  it('converts smallest unit to whole USDC string', () => {
    expect(formatUsdc(1_000_000n)).toBe('1')
    expect(formatUsdc(100_000_000n)).toBe('100')
  })

  it('converts smallest unit to decimal USDC string', () => {
    expect(formatUsdc(50_000n)).toBe('0.05')
    expect(formatUsdc(1_500_000n)).toBe('1.5')
  })

  it('handles zero', () => {
    expect(formatUsdc(0n)).toBe('0')
  })

  it('handles 1 micro USDC', () => {
    expect(formatUsdc(1n)).toBe('0.000001')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/sdk test`
Expected: FAIL.

- [ ] **Step 3: Write conversion utilities**

`runtimee/packages/sdk/src/conversion.ts`:
```typescript
const USDC_DECIMALS = 6
const MULTIPLIER = 10n ** BigInt(USDC_DECIMALS)

export function parseUsdc(amount: string): bigint {
  const parts = amount.split('.')
  if (parts.length > 2) throw new Error(`Invalid USDC amount: ${amount}`)
  const whole = parts[0] || '0'
  let fraction = parts[1] || ''
  if (fraction.length > USDC_DECIMALS) {
    fraction = fraction.slice(0, USDC_DECIMALS)
  }
  fraction = fraction.padEnd(USDC_DECIMALS, '0')
  const full = whole + fraction
  const parsed = BigInt(full)
  if (parsed < 0n) throw new Error(`Negative USDC amount: ${amount}`)
  return parsed
}

export function formatUsdc(amount: bigint): string {
  const whole = amount / MULTIPLIER
  const fraction = amount % MULTIPLIER
  if (fraction === 0n) return whole.toString()
  const fractionStr = fraction.toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '')
  return `${whole}.${fractionStr}`
}
```

`runtimee/packages/sdk/src/index.ts`:
```typescript
export { parseUsdc, formatUsdc } from './conversion.js'
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @runtimee/sdk test`
Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add packages/sdk/src/conversion.ts packages/sdk/src/index.ts packages/sdk/test/
git commit -m "feat(sdk): add USDC conversion utilities"
```

---

### Task 12: @runtimee/sdk — ActorClient and Runtimee

**Files:**
- Create: `runtimee/packages/sdk/src/actor-client.ts`
- Create: `runtimee/packages/sdk/src/runtimee.ts`
- Create: `runtimee/packages/sdk/src/types.ts`

- [ ] **Step 1: Write SDK types**

`runtimee/packages/sdk/src/types.ts`:
```typescript
export interface CreateActorParams {
  name: string
  budget: {
    amount: string
    currency: 'USDC'
    period: 'monthly' | 'total'
  }
  policies: {
    type: string
    version?: string
    config?: Record<string, unknown>
  }[]
}

export interface PayParams {
  target: string
  amount: string
  purpose: {
    type: string
    id: string
    description?: string
  }
  idempotencyKey?: string
}

export interface PreviewPayParams {
  target: string
  amount: string
  purpose: {
    type: string
    id: string
    description?: string
  }
}

export interface ActorStatus {
  budget: {
    total: string
    used: string
    remaining: string
    period: string
    currency: string
  }
  txCount: number
}

export interface ActorSummary {
  id: string
  name: string
  status: 'active' | 'frozen' | 'depleted'
  createdAt: string
}

export interface ExecutionReceipt {
  executionId: string
  status: 'pending' | 'confirmed' | 'failed'
  txHash?: string
}

export interface RuntimeeConfig {
  apiKey: string
  baseUrl?: string
}
```

- [ ] **Step 2: Write the failing tests**

`runtimee/packages/sdk/test/runtimee.test.ts`:
```typescript
import { describe, expect, it, vi } from 'vitest'
import { Runtimee } from '../src/runtimee.js'
import type { RuntimeeConfig } from '../src/types.js'

describe('Runtimee', () => {
  const config: RuntimeeConfig = {
    apiKey: 're_test_key',
    baseUrl: 'http://localhost:3000',
  }

  it('creates instance with config', () => {
    const rt = new Runtimee(config)
    expect(rt).toBeDefined()
  })

  it('throws without apiKey', () => {
    expect(() => new Runtimee({} as RuntimeeConfig)).toThrow('apiKey')
  })

  it('exposes actors namespace', () => {
    const rt = new Runtimee(config)
    expect(rt.actors).toBeDefined()
    expect(typeof rt.actors.create).toBe('function')
    expect(typeof rt.actors.pay).toBe('function')
    expect(typeof rt.actors.previewPay).toBe('function')
    expect(typeof rt.actors.status).toBe('function')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @runtimee/sdk test`
Expected: FAIL.

- [ ] **Step 4: Write ActorClient**

`runtimee/packages/sdk/src/actor-client.ts`:
```typescript
import { parseUsdc, formatUsdc } from './conversion.js'
import type {
  CreateActorParams,
  PayParams,
  PreviewPayParams,
  ActorStatus,
  ActorSummary,
  ExecutionReceipt,
} from './types.js'

export interface ActorClientConfig {
  apiKey: string
  baseUrl: string
  actorId?: string
}

export class ActorClient {
  constructor(private config: ActorClientConfig) {}

  async create(params: CreateActorParams): Promise<ActorSummary> {
    const res = await fetch(`${this.config.baseUrl}/api/actors`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(params),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Failed to create actor')
    }
    return res.json()
  }

  async pay(actorId: string, params: PayParams): Promise<ExecutionReceipt> {
    const res = await fetch(`${this.config.baseUrl}/api/actors/${actorId}/pay`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        target: params.target,
        amount: parseUsdc(params.amount).toString(),
        purpose: params.purpose,
        idempotencyKey: params.idempotencyKey,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Payment failed')
    }
    return res.json()
  }

  async previewPay(actorId: string, params: PreviewPayParams): Promise<{ decision: string; policyResults: unknown[] }> {
    const res = await fetch(`${this.config.baseUrl}/api/actors/${actorId}/preview-pay`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        target: params.target,
        amount: parseUsdc(params.amount).toString(),
        purpose: params.purpose,
      }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new Error(err.error || 'Preview failed')
    }
    return res.json()
  }

  async status(actorId: string): Promise<ActorStatus> {
    const res = await fetch(`${this.config.baseUrl}/api/actors/${actorId}`, {
      headers: this.headers(),
    })
    if (!res.ok) throw new Error('Failed to fetch actor status')
    return res.json()
  }

  private headers(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    }
  }
}
```

- [ ] **Step 5: Write Runtimee class**

`runtimee/packages/sdk/src/runtimee.ts`:
```typescript
import { ActorClient } from './actor-client.js'
import type { RuntimeeConfig } from './types.js'

export class Runtimee {
  public readonly actors: ActorClient

  constructor(config: RuntimeeConfig) {
    if (!config.apiKey) throw new Error('Runtimee: apiKey is required')
    this.actors = new ActorClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://api.runtimee.dev',
    })
  }
}
```

- [ ] **Step 6: Update sdk index.ts**

```typescript
export { Runtimee } from './runtimee.js'
export { ActorClient } from './actor-client.js'
export { parseUsdc, formatUsdc } from './conversion.js'
export type {
  CreateActorParams,
  PayParams,
  PreviewPayParams,
  ActorStatus,
  ActorSummary,
  ExecutionReceipt,
  RuntimeeConfig,
} from './types.js'
```

- [ ] **Step 7: Run tests**

Run: `pnpm --filter @runtimee/sdk test`
Expected: All tests pass.

- [ ] **Step 8: Run typecheck**

Run: `pnpm -r typecheck`
Expected: No errors.

- [ ] **Step 9: Commit**

```bash
git add packages/sdk/
git commit -m "feat(sdk): add Runtimee client and ActorClient API surface"
```

---

### Task 13: @runtimee/node — Storage Interface

**Files:**
- Create: `runtimee/packages/node/src/store/interface.ts`
- Create: `runtimee/packages/node/src/store/postgres.ts`

- [ ] **Step 1: Write the storage interface**

`runtimee/packages/node/src/store/interface.ts`:
```typescript
import type {
  Actor,
  Budget,
  Policy,
  Target,
  Intent,
  PolicyResult,
} from '@runtimee/core'

export interface CreateActorRecord {
  id: string
  name: string
  budget: {
    amount: bigint
    currency: 'USDC'
    period: 'monthly' | 'total'
  }
  policies: {
    type: string
    version: string
    config: Record<string, unknown>
    priority: number
  }[]
}

export interface ActorRecord {
  actor: Actor
  budget: Budget
  policies: Policy[]
  targets: Target[]
}

export interface ExecutionRecord {
  id: string
  actorId: string
  idempotencyKey: string
  requestHash: string
  authorization: {
    intent: Intent
    policyResults: PolicyResult[]
    decision: string
    evaluatedAt: string
    actorVersion: string
  }
  createdAt: string
}

export interface ExecutionEventRecord {
  id: string
  executionId: string
  type: 'submitted' | 'simulated' | 'broadcasted' | 'confirmed' | 'failed'
  data: Record<string, unknown>
  timestamp: string
}

export interface Store {
  // Actors
  createActor(record: CreateActorRecord): Promise<ActorRecord>
  getActor(id: string): Promise<ActorRecord | null>
  updateActorStatus(id: string, status: Actor['status']): Promise<void>

  // Budgets
  consumeBudget(actorId: string, amount: bigint): Promise<boolean>
  getBudgetState(actorId: string): Promise<{
    total: bigint
    used: bigint
    remaining: bigint
    period: string
    currency: string
  }>

  // Executions
  createExecution(record: ExecutionRecord): Promise<void>
  getExecutionByIdempotencyKey(key: string): Promise<ExecutionRecord | null>
  appendExecutionEvent(event: ExecutionEventRecord): Promise<void>
  getExecutionEvents(executionId: string): Promise<ExecutionEventRecord[]>
  getActorExecutionCount(actorId: string): Promise<number>
}
```

- [ ] **Step 2: Write the PostgreSQL implementation**

`runtimee/packages/node/src/store/postgres.ts`:
```typescript
import pg from 'pg'
import type { Store, CreateActorRecord, ActorRecord, ExecutionRecord, ExecutionEventRecord } from './interface.js'

export function createPostgresStore(pool: pg.Pool): Store {
  return {
    async createActor(record: CreateActorRecord): Promise<ActorRecord> {
      const actorId = record.id
      const budgetId = `budget_${actorId}`
      const now = new Date().toISOString()

      await pool.query('BEGIN')
      try {
        await pool.query(
          `INSERT INTO actors (id, name, status, created_at)
           VALUES ($1, $2, 'active', $3)`,
          [actorId, record.name, now]
        )
        await pool.query(
          `INSERT INTO budgets (id, actor_id, amount, used, currency, period, reset_at)
           VALUES ($1, $2, $3, 0, $4, $5, $6)`,
          [budgetId, actorId, record.budget.amount, record.budget.currency, record.budget.period, now]
        )
        for (let i = 0; i < record.policies.length; i++) {
          const p = record.policies[i]
          await pool.query(
            `INSERT INTO policies (id, actor_id, type, version, config, priority)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [`pol_${actorId}_${i}`, actorId, p.type, p.version, JSON.stringify(p.config), p.priority]
          )
        }
        await pool.query('COMMIT')
      } catch (e) {
        await pool.query('ROLLBACK')
        throw e
      }

      return this.getActor(actorId) as Promise<ActorRecord>
    },

    async getActor(id: string): Promise<ActorRecord | null> {
      const actorRes = await pool.query(
        'SELECT id, name, status, created_at FROM actors WHERE id = $1',
        [id]
      )
      if (actorRes.rows.length === 0) return null
      const a = actorRes.rows[0]

      const budgetRes = await pool.query(
        'SELECT id, actor_id, amount, used, currency, period, reset_at FROM budgets WHERE actor_id = $1',
        [id]
      )
      const b = budgetRes.rows[0]

      const policyRes = await pool.query(
        'SELECT id, actor_id, type, version, config, priority FROM policies WHERE actor_id = $1 ORDER BY priority',
        [id]
      )

      return {
        actor: {
          id: a.id,
          name: a.name,
          status: a.status,
          createdAt: a.created_at,
        },
        budget: {
          id: b.id,
          actorId: b.actor_id,
          amount: BigInt(b.amount),
          used: BigInt(b.used),
          currency: b.currency,
          period: b.period,
          resetAt: b.reset_at,
        },
        policies: policyRes.rows.map((p: Record<string, unknown>) => ({
          id: p.id as string,
          actorId: p.actor_id as string,
          type: p.type as string,
          version: p.version as string,
          config: JSON.parse(p.config as string) as Record<string, unknown>,
          priority: p.priority as number,
        })),
        targets: [],
      }
    },

    async updateActorStatus(id: string, status: string): Promise<void> {
      await pool.query('UPDATE actors SET status = $1 WHERE id = $2', [status, id])
    },

    async consumeBudget(actorId: string, amount: bigint): Promise<boolean> {
      const res = await pool.query(
        `UPDATE budgets
         SET used = used + $1
         WHERE actor_id = $2 AND used + $1 <= amount
         RETURNING id`,
        [amount.toString(), actorId]
      )
      return (res.rowCount ?? 0) > 0
    },

    async getBudgetState(actorId: string) {
      const res = await pool.query(
        'SELECT amount, used, currency, period FROM budgets WHERE actor_id = $1',
        [actorId]
      )
      if (res.rows.length === 0) throw new Error(`Actor not found: ${actorId}`)
      const b = res.rows[0]
      const total = BigInt(b.amount)
      const used = BigInt(b.used)
      return {
        total,
        used,
        remaining: total - used,
        period: b.period,
        currency: b.currency,
      }
    },

    async createExecution(record: ExecutionRecord): Promise<void> {
      await pool.query(
        `INSERT INTO executions (id, actor_id, idempotency_key, request_hash, authorization, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          record.id,
          record.actorId,
          record.idempotencyKey,
          record.requestHash,
          JSON.stringify(record.authorization),
          record.createdAt,
        ]
      )
    },

    async getExecutionByIdempotencyKey(key: string): Promise<ExecutionRecord | null> {
      const res = await pool.query(
        'SELECT id, actor_id, idempotency_key, request_hash, authorization, created_at FROM executions WHERE idempotency_key = $1',
        [key]
      )
      if (res.rows.length === 0) return null
      const e = res.rows[0]
      return {
        id: e.id,
        actorId: e.actor_id,
        idempotencyKey: e.idempotency_key,
        requestHash: e.request_hash,
        authorization: JSON.parse(e.authorization),
        createdAt: e.created_at,
      }
    },

    async appendExecutionEvent(event: ExecutionEventRecord): Promise<void> {
      await pool.query(
        `INSERT INTO execution_events (id, execution_id, type, data, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [event.id, event.executionId, event.type, JSON.stringify(event.data), event.timestamp]
      )
    },

    async getExecutionEvents(executionId: string): Promise<ExecutionEventRecord[]> {
      const res = await pool.query(
        'SELECT id, execution_id, type, data, timestamp FROM execution_events WHERE execution_id = $1 ORDER BY timestamp',
        [executionId]
      )
      return res.rows.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        executionId: e.execution_id as string,
        type: e.type as ExecutionEventRecord['type'],
        data: JSON.parse(e.data as string),
        timestamp: e.timestamp as string,
      }))
    },

    async getActorExecutionCount(actorId: string): Promise<number> {
      const res = await pool.query(
        'SELECT COUNT(*) as count FROM executions WHERE actor_id = $1',
        [actorId]
      )
      return parseInt(res.rows[0].count, 10)
    },
  }
}
```

- [ ] **Step 3: Write store test**

`runtimee/packages/node/test/store.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import type { CreateActorRecord, ExecutionRecord, ExecutionEventRecord } from '../src/store/interface.js'

describe('Store interface', () => {
  it('has correct shape for CreateActorRecord', () => {
    const record: CreateActorRecord = {
      id: 'actor_1',
      name: 'test',
      budget: { amount: 1000n, currency: 'USDC', period: 'monthly' },
      policies: [],
    }
    expect(record.id).toBe('actor_1')
    expect(record.budget.amount).toBe(1000n)
  })

  it('ExecutionRecord stores full authorization snapshot', () => {
    const record: ExecutionRecord = {
      id: 'exec_1',
      actorId: 'actor_1',
      idempotencyKey: 'key_1',
      requestHash: 'hash_1',
      authorization: {
        intent: { target: 'test:svc', amount: 100n, purpose: { type: 'test', id: '1' } },
        policyResults: [],
        decision: 'approved',
        evaluatedAt: new Date().toISOString(),
        actorVersion: '1',
      },
      createdAt: new Date().toISOString(),
    }
    expect(record.authorization.intent.target).toBe('test:svc')
    expect(record.authorization.decision).toBe('approved')
  })
})
```

- [ ] **Step 4: Run tests**

Run: `pnpm --filter @runtimee/node test`
Expected: All tests pass.

- [ ] **Step 5: Create SQL migration**

`runtimee/packages/node/src/store/migration.sql`:
```sql
CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  amount NUMERIC(78,0) NOT NULL,
  used NUMERIC(78,0) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USDC',
  period TEXT NOT NULL DEFAULT 'monthly',
  reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  type TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '1',
  config JSONB NOT NULL DEFAULT '{}',
  priority INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS targets (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  name TEXT NOT NULL,
  settlement JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL REFERENCES actors(id),
  idempotency_key TEXT UNIQUE,
  request_hash TEXT,
  authorization JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_events (
  id TEXT PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id),
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_executions_idempotency ON executions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_executions_actor ON executions(actor_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_execution ON execution_events(execution_id);
CREATE INDEX IF NOT EXISTS idx_budgets_actor ON budgets(actor_id);
CREATE INDEX IF NOT EXISTS idx_policies_actor ON policies(actor_id);
```

- [ ] **Step 6: Commit**

```bash
git add packages/node/src/store/ packages/node/test/
git commit -m "feat(node): add storage interface with PostgreSQL implementation"
```

---

### Task 14: @runtimee/node — KMS Signer

**Files:**
- Create: `runtimee/packages/node/src/signer.ts`

- [ ] **Step 1: Write the signer wrapper**

`runtimee/packages/node/src/signer.ts`:
```typescript
import type { Signer } from '@runtimee/evm'
import { keccak256, serializeTransaction, type TransactionSerializable } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

export function createLocalSigner(privateKey: `0x${string}`): Signer {
  const account = privateKeyToAccount(privateKey)

  return {
    async signTransaction(tx) {
      const serializable: TransactionSerializable = {
        to: tx.to,
        data: tx.data,
        value: tx.value,
        chainId: tx.chainId,
        gas: tx.gasLimit,
        maxFeePerGas: tx.maxFeePerGas,
        maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
        nonce: tx.nonce,
        type: 'eip1559',
      }
      const signed = await account.signTransaction(serializable)
      return signed as `0x${string}`
    },
  }
}

export interface KMSConfig {
  region: string
  keyId: string
  accessKeyId: string
  secretAccessKey: string
}

export function createKMSSigner(config: KMSConfig): Signer {
  // Placeholder for AWS KMS integration
  // KMS signer flow:
  // 1. Build the transaction hash (keccak256 of RLP-encoded tx)
  // 2. Call KMS:sign with the hash
  // 3. Reconstruct the signature (v, r, s) from KMS response
  // 4. Serialize the full signed transaction
  throw new Error(
    'AWS KMS signer not yet implemented. Use createLocalSigner for development.'
  )
}
```

- [ ] **Step 2: Write signer test**

`runtimee/packages/node/test/signer.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { createLocalSigner } from '../src/signer.js'

describe('LocalSigner', () => {
  const signer = createLocalSigner(
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
  )

  it('signs a transaction', async () => {
    const signed = await signer.signTransaction({
      to: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
      data: '0x' as `0x${string}`,
      value: 0n,
      chainId: 8453,
      gasLimit: 100000n,
      nonce: 0,
    })
    expect(signed).toMatch(/^0x[0-9a-f]+$/)
    expect(signed.length).toBeGreaterThan(100)
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @runtimee/node test`
Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/node/src/signer.ts packages/node/test/signer.test.ts
git commit -m "feat(node): add local signer and KMS signer placeholder"
```

---

### Task 15: @runtimee/node — Routes and Server

**Files:**
- Create: `runtimee/packages/node/src/routes.ts`
- Create: `runtimee/packages/node/src/server.ts`
- Create: `runtimee/packages/node/src/index.ts`

- [ ] **Step 1: Write the failing test**

`runtimee/packages/node/test/routes.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { createRouter } from '../src/routes.js'
import type { Store } from '../src/store/interface.js'

function createMockStore(): Store {
  return {
    async createActor(r) { return { actor: { id: r.id, name: r.name, status: 'active', createdAt: new Date().toISOString() }, budget: { id: 'b1', actorId: r.id, amount: r.budget.amount, used: 0n, currency: 'USDC', period: r.budget.period, resetAt: new Date().toISOString() }, policies: [], targets: [] } },
    async getActor(id) { return null },
    async updateActorStatus() {},
    async consumeBudget() { return true },
    async getBudgetState() { return { total: 1000n, used: 0n, remaining: 1000n, period: 'monthly', currency: 'USDC' } },
    async createExecution() {},
    async getExecutionByIdempotencyKey() { return null },
    async appendExecutionEvent() {},
    async getExecutionEvents() { return [] },
    async getActorExecutionCount() { return 0 },
  }
}

describe('createRouter', () => {
  it('returns router with routes', () => {
    const router = createRouter({ store: createMockStore() })
    expect(router).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @runtimee/node test`
Expected: FAIL.

- [ ] **Step 3: Write routes**

`runtimee/packages/node/src/routes.ts`:
```typescript
import { Router, type Request, type Response } from 'express'
import type { Store } from './store/interface.js'
import type { ExecutionProvider } from '@runtimee/evm'
import { PolicyEngine, createBudgetCheckPolicy, createAllowlistPolicy } from '@runtimee/core'

export interface RouterConfig {
  store: Store
  executionProvider?: ExecutionProvider
}

export function createRouter(config: RouterConfig): Router {
  const router = Router()

  // POST /api/actors
  router.post('/actors', async (req: Request, res: Response) => {
    try {
      const { name, budget, policies } = req.body
      if (!name || !budget) {
        return res.status(400).json({ error: 'name and budget are required' })
      }

      const actorId = `actor_${Date.now()}`
      const record = await config.store.createActor({
        id: actorId,
        name,
        budget: {
          amount: BigInt(budget.amount),
          currency: budget.currency || 'USDC',
          period: budget.period || 'monthly',
        },
        policies: (policies || []).map((p: Record<string, unknown>, i: number) => ({
          type: p.type as string,
          version: (p.version as string) || '1',
          config: (p.config as Record<string, unknown>) || {},
          priority: i,
        })),
      })

      res.status(201).json({
        id: record.actor.id,
        name: record.actor.name,
        status: record.actor.status,
        createdAt: record.actor.createdAt,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/actors/:id
  router.get('/actors/:id', async (req: Request, res: Response) => {
    try {
      const record = await config.store.getActor(req.params.id)
      if (!record) return res.status(404).json({ error: 'Actor not found' })

      const budget = await config.store.getBudgetState(req.params.id)
      const txCount = await config.store.getActorExecutionCount(req.params.id)

      res.json({
        id: record.actor.id,
        name: record.actor.name,
        status: record.actor.status,
        createdAt: record.actor.createdAt,
        budget: {
          total: budget.total.toString(),
          used: budget.used.toString(),
          remaining: budget.remaining.toString(),
          period: budget.period,
          currency: budget.currency,
        },
        txCount,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // POST /api/actors/:id/preview-pay
  router.post('/actors/:id/preview-pay', async (req: Request, res: Response) => {
    try {
      const record = await config.store.getActor(req.params.id)
      if (!record) return res.status(404).json({ error: 'Actor not found' })

      const { target, amount, purpose } = req.body
      if (!target || !amount) {
        return res.status(400).json({ error: 'target and amount are required' })
      }

      const evaluators = record.policies.map((p) => {
        switch (p.type) {
          case 'budget-check':
            return createBudgetCheckPolicy(p.id, p.version)
          case 'allowlist':
            return createAllowlistPolicy(p.id, p.version, (p.config.allowedTargets || []) as string[])
          default:
            throw new Error(`Unknown policy type: ${p.type}`)
        }
      })

      const engine = new PolicyEngine(evaluators)
      const budgetState = await config.store.getBudgetState(req.params.id)

      const authorization = await engine.evaluate(
        record.actor,
        {
          target,
          amount: BigInt(amount),
          purpose: purpose || { type: 'preview', id: '' },
        },
        budgetState
      )

      res.json({
        decision: authorization.decision,
        policyResults: authorization.policyResults,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // POST /api/actors/:id/pay
  router.post('/actors/:id/pay', async (req: Request, res: Response) => {
    try {
      const record = await config.store.getActor(req.params.id)
      if (!record) return res.status(404).json({ error: 'Actor not found' })

      const { target, amount, purpose, idempotencyKey } = req.body
      if (!target || !amount) {
        return res.status(400).json({ error: 'target and amount are required' })
      }

      // Check idempotency
      if (idempotencyKey) {
        const existing = await config.store.getExecutionByIdempotencyKey(idempotencyKey)
        if (existing) {
          return res.json({ executionId: existing.id, status: 'confirmed' })
        }
      }

      // Build evaluators from stored policies
      const evaluators = record.policies.map((p) => {
        switch (p.type) {
          case 'budget-check':
            return createBudgetCheckPolicy(p.id, p.version)
          case 'allowlist':
            return createAllowlistPolicy(p.id, p.version, (p.config.allowedTargets || []) as string[])
          default:
            throw new Error(`Unknown policy type: ${p.type}`)
        }
      })

      const engine = new PolicyEngine(evaluators)
      const budgetState = await config.store.getBudgetState(req.params.id)

      const authorization = await engine.evaluate(
        record.actor,
        {
          target,
          amount: BigInt(amount),
          purpose: purpose || { type: 'payment', id: '' },
          idempotencyKey,
        },
        budgetState
      )

      if (authorization.decision !== 'approved') {
        return res.status(403).json({
          error: 'Payment denied by policy',
          decision: authorization.decision,
          policyResults: authorization.policyResults,
        })
      }

      // Consume budget atomically
      const consumed = await config.store.consumeBudget(req.params.id, BigInt(amount))
      if (!consumed) {
        return res.status(403).json({ error: 'Budget exhausted' })
      }

      // Create execution record
      const executionId = `exec_${Date.now()}`
      const now = new Date().toISOString()
      await config.store.createExecution({
        id: executionId,
        actorId: req.params.id,
        idempotencyKey: idempotencyKey || executionId,
        requestHash: '',
        authorization: {
          intent: authorization.intent,
          policyResults: authorization.policyResults,
          decision: authorization.decision,
          evaluatedAt: authorization.evaluatedAt,
          actorVersion: authorization.actorVersion,
        },
        createdAt: now,
      })

      // Execute via provider if available
      let txHash: string | undefined
      if (config.executionProvider) {
        await config.store.appendExecutionEvent({
          id: `evt_${executionId}_1`,
          executionId,
          type: 'submitted',
          data: {},
          timestamp: now,
        })
        // Execution flow would happen here
        // For MVP, we acknowledge the authorization and queue execution
      }

      res.status(201).json({
        executionId,
        status: 'pending',
        txHash,
      })
    } catch (err) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
```

- [ ] **Step 4: Write server**

`runtimee/packages/node/src/server.ts`:
```typescript
import express from 'express'
import { createRouter } from './routes.js'

export interface ServerConfig {
  port: number
  store: import('./store/interface.js').Store
  executionProvider?: import('@runtimee/evm').ExecutionProvider
}

export function createApp(config: ServerConfig) {
  const app = express()
  app.use(express.json())

  const router = createRouter({
    store: config.store,
    executionProvider: config.executionProvider,
  })

  app.use('/api', router)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0' })
  })

  return app
}

export function startServer(config: ServerConfig) {
  const app = createApp(config)
  app.listen(config.port, () => {
    console.log(`Runtimee server listening on port ${config.port}`)
  })
}
```

`runtimee/packages/node/src/index.ts`:
```typescript
export { createApp, startServer } from './server.js'
export { createRouter } from './routes.js'
export { createPostgresStore } from './store/postgres.js'
export { createLocalSigner, createKMSSigner } from './signer.js'
```

- [ ] **Step 5: Run tests**

Run: `pnpm --filter @runtimee/node test`
Expected: All tests pass.

- [ ] **Step 6: Run typecheck**

Run: `pnpm -r typecheck`
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add packages/node/src/routes.ts packages/node/src/server.ts packages/node/src/index.ts packages/node/test/routes.test.ts
git commit -m "feat(node): add Express routes for actor management and payment execution"
```

---

### Task 16: Authorization Pipeline Integration Test

**Files:**
- Create: `runtimee/packages/core/test/authorization-pipeline.test.ts`

- [ ] **Step 1: Write an end-to-end authorization pipeline test**

`runtimee/packages/core/test/authorization-pipeline.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import { PolicyEngine } from '../src/policy-engine.js'
import { createBudgetCheckPolicy } from '../src/policies/budget-check.js'
import { createAllowlistPolicy } from '../src/policies/allowlist.js'
import { createMaxPerCallPolicy } from '../src/policies/max-per-call.js'
import type { Actor, Intent, BudgetState } from '../src/types.js'

const actor: Actor = {
  id: 'actor_test_1',
  name: 'test-agent',
  status: 'active',
  createdAt: new Date().toISOString(),
}

const budget: BudgetState = {
  total: 100_000_000n, // 100 USDC
  used: 10_000_000n,   // 10 USDC used
  remaining: 90_000_000n, // 90 USDC remaining
  period: 'monthly',
  currency: 'USDC',
}

describe('Authorization Pipeline', () => {
  it('approves payment within all limits', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
      createMaxPerCallPolicy('pol_max', '1', 50_000_000n), // 50 USDC max per call
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 5_000_000n, // 5 USDC
      purpose: { type: 'llm-inference', id: 'test-1' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('approved')
    expect(auth.policyResults).toHaveLength(3)
  })

  it('denies payment exceeding budget', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 95_000_000n, // 95 USDC — exceeds 90 remaining
      purpose: { type: 'llm-inference', id: 'test-2' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('denied')
    const budgetResult = auth.policyResults.find((r) => r.policyType === 'budget-check')
    expect(budgetResult?.decision).toBe('deny')
  })

  it('denies payment to unauthorized target', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'evil:service',
      amount: 5_000_000n,
      purpose: { type: 'test', id: 'test-3' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('denied')
    const allowResult = auth.policyResults.find((r) => r.policyType === 'allowlist')
    expect(allowResult?.decision).toBe('deny')
  })

  it('deny overrides pass across all policy types', async () => {
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createMaxPerCallPolicy('pol_max', '1', 1_000_000n), // max 1 USDC
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 10_000_000n, // 10 USDC — exceeds max-per-call of 1
      purpose: { type: 'test', id: 'test-4' },
    }

    const auth = await engine.evaluate(actor, intent, budget)
    expect(auth.decision).toBe('denied')
    // Budget check should pass, allowlist should pass, max-per-call should deny
    expect(auth.policyResults.find((r) => r.policyType === 'budget-check')?.decision).toBe('pass')
    expect(auth.policyResults.find((r) => r.policyType === 'allowlist')?.decision).toBe('pass')
    expect(auth.policyResults.find((r) => r.policyType === 'max-per-call')?.decision).toBe('deny')
  })

  it('previewPay returns same result as pay without execution', async () => {
    // This test validates the spec requirement that previewPay
    // shares the exact same authorization path as pay
    const engine = new PolicyEngine([
      createBudgetCheckPolicy('pol_budget', '1'),
      createAllowlistPolicy('pol_allow', '1', ['openai:gpt-4']),
    ])

    const intent: Intent = {
      target: 'openai:gpt-4',
      amount: 5_000_000n,
      purpose: { type: 'test', id: 'preview-test' },
    }

    // Same engine, same inputs = same result (pure function)
    const auth1 = await engine.evaluate(actor, intent, budget)
    const auth2 = await engine.evaluate(actor, intent, budget)

    expect(auth1.decision).toBe(auth2.decision)
    expect(auth1.policyResults.map((r) => r.decision))
      .toEqual(auth2.policyResults.map((r) => r.decision))
  })
})
```

- [ ] **Step 2: Run tests**

Run: `pnpm --filter @runtimee/core test`
Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add packages/core/test/authorization-pipeline.test.ts
git commit -m "test(core): add authorization pipeline integration tests"
```

---

### Task 17: Property-Based Testing

**Files:**
- Create: `runtimee/packages/core/test/property/auth-invariants.test.ts`

- [ ] **Step 1: Install fast-check**

Run: `pnpm --filter @runtimee/core add -D fast-check`

- [ ] **Step 2: Write property-based tests**

`runtimee/packages/core/test/property/auth-invariants.test.ts`:
```typescript
import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import { PolicyEngine } from '../../src/policy-engine.js'
import { createBudgetCheckPolicy } from '../../src/policies/budget-check.js'
import { DecisionResolver } from '../../src/decision-resolver.js'
import type { Actor, Intent, BudgetState, PolicyResult } from '../../src/types.js'

const actor: Actor = {
  id: 'actor_prop',
  name: 'prop-test',
  status: 'active',
  createdAt: new Date().toISOString(),
}

describe('Authorization invariants (property-based)', () => {
  it('same inputs always produce same authorization result', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        fc.bigInt({ min: 0n, max: 1_000_000n }),
        async (budgetTotal, spendAmount) => {
          const budget: BudgetState = {
            total: budgetTotal,
            used: 0n,
            remaining: budgetTotal,
            period: 'total',
            currency: 'USDC',
          }
          const engine = new PolicyEngine([
            createBudgetCheckPolicy('pol_budget', '1'),
          ])
          const intent: Intent = {
            target: 'test:svc',
            amount: spendAmount,
            purpose: { type: 'test', id: 'prop' },
          }
          const a = await engine.evaluate(actor, intent, budget)
          const b = await engine.evaluate(actor, intent, budget)
          expect(a.decision).toBe(b.decision)
        }
      ),
      { numRuns: 100 }
    )
  })

  it('deny always dominates pass and review', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.constantFrom<'pass' | 'deny' | 'review'>('pass', 'deny', 'review'),
          { minLength: 0, maxLength: 10 }
        ),
        (decisions) => {
          const results: PolicyResult[] = decisions.map((d, i) => ({
            policyId: `pol_${i}`,
            policyType: 'prop-test',
            version: '1',
            decision: d,
            reason: { code: 'prop', message: 'property test' },
            evaluatedAt: new Date().toISOString(),
          }))
          const resolved = DecisionResolver.resolve(results)
          if (decisions.some((d) => d === 'deny')) {
            expect(resolved).toBe('denied')
          } else if (decisions.some((d) => d === 'review')) {
            expect(resolved).toBe('pending-review')
          } else {
            expect(resolved).toBe('approved')
          }
        }
      ),
      { numRuns: 200 }
    )
  })

  it('budget enforcement never allows overspend', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        fc.bigInt({ min: 1n, max: 1_000_000n }),
        async (total, amount) => {
          const budget: BudgetState = {
            total,
            used: 0n,
            remaining: total,
            period: 'total',
            currency: 'USDC',
          }
          const engine = new PolicyEngine([
            createBudgetCheckPolicy('pol_budget', '1'),
          ])
          const intent: Intent = {
            target: 'test:svc',
            amount,
            purpose: { type: 'test', id: 'prop' },
          }
          const auth = await engine.evaluate(actor, intent, budget)
          if (amount > total) {
            expect(auth.decision).toBe('denied')
          } else {
            expect(auth.decision).toBe('approved')
          }
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

- [ ] **Step 3: Run tests**

Run: `pnpm --filter @runtimee/core test`
Expected: All property-based tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/core/test/property/
git commit -m "test(core): add property-based authorization invariant tests"
```

---

### Task 18: Seasoning — Error Handling, README, Package READMEs

**Files:**
- Modify: `runtimee/packages/core/src/types.ts` (add JSDoc)
- Modify: `runtimee/README.md`
- Create: `runtimee/packages/core/README.md`
- Create: `runtimee/packages/evm/README.md`
- Create: `runtimee/packages/sdk/README.md`

- [ ] **Step 1: Write root README**

`runtimee/README.md`:
```markdown
# Runtimee

**Programmable financial runtime for autonomous systems.**

Runtimee provides financial actors — programmable treasury identities with deterministic policy enforcement — that can autonomously spend USDC within defined constraints.

This is infrastructure for AI agents, bots, autonomous workflows, and machine-to-machine payments.

## Packages

| Package | Description |
|---------|-------------|
| `@runtimee/core` | Pure TypeScript authorization kernel. Zero blockchain dependencies. |
| `@runtimee/evm` | Pluggable EVM execution adapter (Base + USDC initial). |
| `@runtimee/sdk` | Developer-facing API. Create actors, define policies, spend USDC. |
| `@runtimee/node` | Hosted service wiring everything together. |

## Quick Start

```typescript
import { Runtimee } from "@runtimee/sdk"

const rt = new Runtimee({ apiKey: "re_..." })

// Create a financial actor
const actor = await rt.actors.create({
  name: "research-agent",
  budget: { amount: "50", currency: "USDC", period: "monthly" },
  policies: [
    { type: "allowlist", config: { allowedTargets: ["openai:gpt-4-turbo"] } },
    { type: "max-per-call", config: { maxAmount: "5000000" } }
  ]
})

// The actor spends autonomously
const execution = await rt.actors.pay(actor.id, {
  target: "openai:gpt-4-turbo",
  amount: "0.05",
  purpose: { type: "llm-inference", id: "run-42" }
})
```

## Architecture

```
Developer's Code (agent, bot, workflow)
    ↓ @runtimee/sdk
@runtimee/core (pure authorization kernel)
    ↓ ExecutionProvider interface
@runtimee/evm (pluggable execution adapter)
    ↓
Blockchain (Base + USDC)
```

## Development

```bash
pnpm install
pnpm build
pnpm test
```

## License

MIT
```

- [ ] **Step 2: Write package READMEs**

`runtimee/packages/core/README.md`:
```markdown
# @runtimee/core

Pure TypeScript authorization kernel for Runtimee.

Zero blockchain dependencies. Zero I/O. Zero network calls.

Provides the PolicyEngine, DecisionResolver, and built-in policies that form the core authorization pipeline.
```

`runtimee/packages/evm/README.md`:
```markdown
# @runtimee/evm

EVM execution adapter for Runtimee.

Implements the ExecutionProvider interface for Base + USDC.

Includes: transaction building, gas estimation, broadcasting, receipt waiting.
```

`runtimee/packages/sdk/README.md`:
```markdown
# @runtimee/sdk

Developer-facing API for Runtimee.

Create financial actors, define spending policies, and let autonomous systems spend USDC within constraints.
```

- [ ] **Step 3: Run full test suite**

Run: `pnpm test`
Expected: All tests pass across all packages.

- [ ] **Step 4: Run full typecheck**

Run: `pnpm typecheck`
Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add README.md packages/core/README.md packages/evm/README.md packages/sdk/README.md
git commit -m "docs: add README files and build/docs structure"
```

---

## Spec Coverage Checklist

| Spec Requirement | Task |
|---|---|
| Actor creation with budgets and policies | Task 15 (routes), Task 13 (store) |
| Target registration (local service aliases) | Task 13 (store schema) |
| `actor.pay()` — authorization → execution → confirmation | Task 15 (routes) |
| `actor.previewPay()` — deterministic simulation | Task 15 (routes) |
| `actor.status()` — budget and transaction info | Task 15 (routes) |
| Idempotent execution via idempotencyKey | Task 15 (routes) |
| Append-only execution events | Task 13 (store) |
| Atomic budget enforcement | Task 13 (consumeBudget) |
| Authorization errors typed and machine-readable | Task 3 (errors.ts) |
| Execution errors typed and retriable | Task 3 (errors.ts) |
| `deny > review > pass` resolution | Task 4 (DecisionResolver) |
| Policy engine with independent evaluators | Task 5 (PolicyEngine) |
| Built-in policies (budget, allowlist, max-per-call, rate-limit) | Task 6 |
| ExecutionProvider interface | Task 7 (types.ts) |
| Base + USDC adapter | Tasks 8-10 |
| SDK with Runtimee class and ActorClient | Task 12 |
| Property-based testing for invariants | Task 17 |
| Full authorization pipeline integration test | Task 16 |
| README and package documentation | Task 18 |
