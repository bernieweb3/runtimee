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

const actor = await rt.actors.create({
  name: "research-agent",
  budget: { amount: "50", currency: "USDC", period: "monthly" },
  policies: [
    { type: "allowlist", config: { allowedTargets: ["openai:gpt-4-turbo"] } },
    { type: "max-per-call", config: { maxAmount: "5000000" } }
  ]
})

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
