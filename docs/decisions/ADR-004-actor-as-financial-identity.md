# ADR-004: Actor as Financial Identity (Not Wallet)

**Status:** Accepted

## Context

Runtimee's fundamental abstraction needed to represent an autonomous spending entity. The natural crypto-native choice was a "wallet" — an EOA with a private key. However, modeling the system around wallets would:

- Make custody the central abstraction (the platform becomes "wallet infrastructure")
- Couple the runtime to key management semantics
- Limit the concept to crypto-native developers
- Fail to represent non-wallet financial actors (workspaces, bots, services with multiple addresses)

The long-term thesis requires that Runtimee own financial authorization orchestration, not key management.

## Decision

The `Actor` is a financial identity — an authorization context with policy scope and treasury state. It is explicitly not a wallet.

```typescript
interface Actor {
  id: string
  name: string
  status: "active" | "frozen" | "depleted"
  createdAt: string
}
```

The Actor has:
- **Authorization context**: policies, budget, allowed targets
- **Treasury state**: current balance, spending history, budget consumption
- **Financial identity**: a stable reference that outlives any particular key or address

Wallets and signers are attached execution mechanisms — they exist at the adapter layer (`@runtimee/evm` → `Signer`), not on the Actor model. An Actor can have multiple addresses across chains, multiple signers across providers, or no wallet at all (inbound-only mode).

The SDK never surfaces "wallet" or "private key" to the developer. Developers create actors, define policies, and call `actor.pay()`. Key management is invisible.

## Consequences

**Positive:**
- The platform identity is "programmable financial authorization," not "wallet infrastructure"
- Actors can represent any autonomous financial entity: AI agents, SaaS workspaces, machine identities, DAO treasuries
- Multiple execution paths per actor are natural (one actor, many addresses/signers)
- Non-crypto-native developers are not blocked by key management concepts
- Future capabilities (multi-sig, delegation, role-based access) attach to actors naturally

**Negative:**
- Crypto-native developers may initially look for wallet concepts and not find them — requires clear documentation
- The actor abstraction is less tangible than "a wallet" — harder to demo with existing crypto tools
- Some operations (funding the actor) require bridging the abstraction gap: the developer sends USDC to an address, but we must surface which address without centering "wallet" in the model

## Alternatives Considered

- **Wallet as the core primitive**: Model everything around EOAs with keys. Rejected because it makes the platform "custody infrastructure" — a commoditized category with different strategic dynamics.
- **Account abstraction (ERC-4337)**: Model actors as smart contract accounts. Rejected for MVP because it couples the architecture to a specific EVM standard and adds gas complexity without demonstrated need.
- **No abstraction — developer brings address**: The developer provides an address and key; Runtimee just does policy. Rejected because it abdicates the orchestration layer and collapses the product to a rule engine.
