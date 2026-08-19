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
- Support lending and credit workflows (`lend`, `unlend`, `borrow`, `repay`)
- Support Aave V3 route operations (`aaveV3`, health-factor and pool-data flows)
- Support additional lending routes including Compound and Fluid where enabled
- Return machine-readable endpoint docs with `llmIntrospect`

## API reference

- Interactive endpoint reference: `https://api.infinitetrading.io/__docs__`
- Machine-readable endpoint metadata: `/llmIntrospect`

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

## Endpoint billing matrix

### Paid endpoints

The following endpoints are billed in current gateway operations:

- `vaultTrade` (trade class)
- `approve` (approval class)
- `lend`
- `unlend`
- `borrow`
- `repay`
- `aaveV3` (including lending subroutes such as lend, unlend, borrow, repay)
- `addLiquidity`
- `removeLiquidity`
- `mintManagerFee`

Additional lending operations supported in current cloud API workflows are also billed when executed:

- `depositFluid`
- `withdrawFluid`
- `depositCompoundV3`
- `withdrawCompoundV3`
- `POST /api/cex/chargeFee` (CEX trading fee charge)

### Free endpoints

The following endpoints are currently free (no explicit API action fee):

- `associateGasWallet`
- `createGasWallet`
- `deactivateCEXBot`
- `deassociateGasWallet`
- `deleteBot`
- `deleteCEXBot`
- `deleteCEXSubaccount`
- `getAllBots`
- `getAllCEXSubaccounts`
- `getAllGasBalance`
- `getAllYields`
- `getAssociatedGasWallets`
- `getCEXSide`
- `getCandles`
- `getContract`
- `getEstimatedAnualYield`
- `getGasBalance`
- `getGasWalletPools`
- `getHealthFactor`
- `getNewApiKey`
- `getPoolAaveData`
- `getSymbol`
- `getTicks`
- `getTotalYield`
- `linkGasWallet`
- `llmIntrospect`
- `poolComposition`
- `registerCEXSubaccount`
- `setBot`
- `setCEXSide`
- `setCEXStrategy`
- `unlinkGasWallet`
- `GET /api/cex/calculateFee`
- `GET /eth-price`
- `GET /token-price/:network`
- `GET /calculate-fee/:action/:network`
- `GET /all-actions`
- `GET /test/:network`

### Notes on CEX and documentation endpoints

- `https://api.infinitetrading.io/__docs__` provides interactive route documentation.
- `/llmIntrospect` provides machine-readable endpoint metadata.
- CEX fee charging is exposed through dedicated CEX fee routes in the cloud API stack.

## Why this matters for ITP

The API is core product infrastructure that:

- powers vault automation and strategy operations
- enables third-party integration paths
- increases sticky ecosystem usage across ITP products

## LLM and agent support

The `/llmIntrospect` endpoint provides structured endpoint metadata so AI agents can discover and safely call API capabilities without hardcoded assumptions.
