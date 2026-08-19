# API

The Infinite Trading API is the automation backbone for strategy operators and advanced users.

## Architecture

The production stack follows a layered model:

1. **Gateway layer** (public entry)
2. **Validation/routing layer**
3. **Execution layer** for blockchain interactions

This separation improves reliability, endpoint management, and protocol-specific execution flows.

## What the API can do

- Configure and update automated bot behavior (`setBot`, status, deletion flows)
- Execute vault trades (`vaultTrade`)
- Manage approvals and portfolio operations
- Support lending/borrowing workflows across integrated routes
- Return machine-readable endpoint docs with `llmIntrospect`

## Authentication model

- Manager or gas-wallet API keys are used for privileged actions
- Non-sensitive introspection and selected query routes can be open/read-only

## Monetization model

API execution is monetized by action class, with live conversion into native gas-token payments from configured wallets.

Documented examples from the current gateway stack include:

| Action class | Example documented price |
|---|---|
| trade | $0.10 |
| approve | $0.02 |
| lend / borrow / repay | $0.05 |
| deposit / withdraw / composition reads | free-tier in current documentation |

Exact behavior can vary by route and environment, but the model is consistently usage-based.

## Why this matters for ITP

The API is core product infrastructure that:

- powers vault automation and strategy operations
- enables third-party integration paths
- increases sticky ecosystem usage across ITP products

## LLM and agent support

The `/llmIntrospect` endpoint provides structured endpoint metadata so AI agents can discover and safely call API capabilities without hardcoded assumptions.
