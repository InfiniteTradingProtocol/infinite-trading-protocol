# Infinite Trading Protocol — Contracts

Solidity sources, tests and deployment scripts for the Infinite Trading Protocol,
built with [Foundry](https://book.getfoundry.sh/).

## Layout

| Path | Contents |
|---|---|
| [`src/aero/`](src/aero/README.md) | Aero classic-pool auto-compounders: v1 and v2 (`AeroFactoryV2`, `AeroVaultV2`, `AeroTwapOracle`, `AeroZapV2`), deployments, Safe batches, audits |
| [`src/velodrome/`](src/velodrome) | `InfiniteVaultStrategy`: Velodrome LP auto-compounding strategy (Beefy-style) |
| [`src/yield/`](src/yield) | USD yield vault stack: `InfiniteTradingRegistry`, yield/weighted allocators and factories, bootstrappers, rate readers, Compound V3 adapter (Morpho Vault V2 based) |
| [`src/UniV3AutoCompounder.sol`](src/UniV3AutoCompounder.sol), [`src/UniV4AutoCompounder.sol`](src/UniV4AutoCompounder.sol) | UUPS-upgradeable Uniswap V3 / V4 concentrated-liquidity auto-compounders |
| [`src/ManagedVault.sol`](src/ManagedVault.sol), [`src/ManagedVaultFactory.sol`](src/ManagedVaultFactory.sol) | Single-owner managed vaults with DAO-controlled asset, route and executor allowlists |
| [`src/TraderRouter.sol`](src/TraderRouter.sol) | Allowlisted trade router for vault executors |
| [`src/AgentSeats.sol`](src/AgentSeats.sol), [`src/VelodromeItpOracle.sol`](src/VelodromeItpOracle.sol) | Infinite Agents memberships paid in ITP, priced by a Velodrome TWAP |
| [`src/stsato.sol`](src/stsato.sol) | stSATO bonding-curve staking wrapper |
| [`src/InfiniteBoost.sol`](src/InfiniteBoost.sol), [`src/autocompounder.sol`](src/autocompounder.sol) | Legacy staking boost and auto-compounder |
| [`src/ERC20/`](src/ERC20), [`src/interfaces/`](src/interfaces) | Shared token and protocol interfaces |
| [`src/mock/`](src/mock) | Test mocks (not deployed) |
| [`test/`](test) | Unit, fuzz, invariant and fork tests |
| [`script/`](script) | `forge script` deployment scripts |
| [`lib/morpho-vault-v2/`](lib/morpho-vault-v2) | Vendored Morpho Vault V2 sources (own license) |
| [`UPGRADE.md`](UPGRADE.md) | UUPS upgrade runbook for the Uniswap V3 auto-compounder |

## Setup

Requires [Foundry](https://book.getfoundry.sh/getting-started/installation) and Node.js.
OpenZeppelin and `forge-std` are resolved from `node_modules` (see [`remappings.txt`](remappings.txt)):

```sh
cd contracts
npm install          # or: bun install
cp .env.example .env # only needed for fork tests, deployments and verification
```

## Build and test

Modules target different EVM versions, so each has its own Foundry profile in
[`foundry.toml`](foundry.toml). The default profile builds the Shanghai sources and
skips the Cancun-only modules.

| Module | Command |
|---|---|
| Default (Uniswap compounders, stSATO, TraderRouter, legacy) | `forge test` |
| Aero auto-compounders | `FOUNDRY_PROFILE=aero forge test` |
| Velodrome strategy | `FOUNDRY_PROFILE=velodrome forge test --match-path 'test/InfiniteVaultStrategy*'` |
| AgentSeats | `FOUNDRY_PROFILE=agent-seats forge test --match-path 'test/AgentSeats*'` |
| USD yield vault | `FOUNDRY_PROFILE=yield forge test` |

Fork tests (`*.fork.t.sol`) read live chain state and are opt-in; each one documents
its RPC environment variables in its header and never broadcasts transactions. Contract sizes:
`forge build --sizes` with the matching profile.

Formatting and linting:

```sh
forge fmt --check
npx solhint "{script,src,test}/**/*.sol"
```

## Deploying

Every script under [`script/`](script) can be run without `--broadcast` for a dry
run against a fork. Ownership of production contracts is transferred to the DAO
Safe `0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB`; admin actions are executed as
Safe batches. Deployed addresses are listed in the
[repository README](../README.md#deployments).

## Security

See [SECURITY.md](../SECURITY.md) for responsible disclosure and the
[README](../README.md#security-reviews) for published reviews.
