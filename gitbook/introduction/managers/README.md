# 🧑‍💼 Managers: Deploy Vaults & Tradebots

This page is for managers using the frontend manager section and API to deploy and operate Agentic Managed Vaults.

## What this guide covers

- creating and funding gas wallets
- API key usage model
- creating a vault and enabling trader permissions
- approving assets
- configuring and running the tradebot (`setBot`)

## Prerequisites

- Manager access in the frontend manager area
- A vault address (created on dHEDGE app flow)
- Supported network selection (Optimism, Base, Arbitrum, or Polygon where applicable)

## Step 1) Get manager/gas-wallet credentials

Manager workflows use API keys for privileged actions.

- Manager onboarding/key flow is exposed in the manager area.
- Gas-wallet APIs use a gas-wallet API key for execution calls.

You should keep these keys private and never expose them client-side in public code.

## Step 2) Create a gas wallet

Create a dedicated gas wallet for automated operations:

`GET /createGasWallet`

The response includes:

- wallet address
- private key
- gas-wallet API key

Store all three securely.

## Step 3) Fund gas wallet

Fund with native gas token:

- ETH for Optimism/Base/Arbitrum
- POL for Polygon

Check balance:

`GET /getGasBalance?apiKey=...&network=...`

## Step 4) Create vault + add trader permission

Create vault in the manager-supported vault creation flow (dHEDGE-based flow), then add the gas wallet address as a **Trader** for that vault.

Verify trader status:

`GET /isPoolTrader?apiKey=...&protocol=dhedge&network=...&pool=...`

## Step 5) Approve assets for execution

Before bot trades can run, approve each required asset:

`POST /approve`

Typical payload fields include:

- `apiKey`
- `network`
- `protocol` (`dhedge`)
- `pool` (vault address)
- `asset` (e.g., USDC, WETH, WBTC, MORPHO)
- `platform` (e.g., odos)

## Step 6) Configure the tradebot

Set the bot configuration:

`POST /setBot`

Typical config includes:

- `pair` (e.g., `ETH-USD`, `BTC-USD`)
- `side` (`long`, `neutral`, `short`, `hold`)
- `threshold`
- `slippage`
- `share`
- `platform`
- `lending` (`true`/`false`)

This is the core endpoint that activates your Agentic Managed Vault behavior.

## Step 7) Verify bot status

`GET /getBotStatus?apiKey=...&protocol=dhedge&network=...&pool=...`

Use this to confirm side, pair, and active status.

## Step 8) Optional immediate trade

If you need immediate positioning:

`POST /vaultTrade`

with `from`, `to`, `share`, `slippage`, and routing fields.

## Common manager mistakes

- not funding gas wallet before approvals/trades
- forgetting to add gas wallet as vault Trader
- calling `setBot` before approvals are done
- misconfigured side/share/slippage values

## Security checklist

- rotate/restrict keys in internal systems
- never expose private keys in frontend bundles
- use dedicated wallets per strategy cluster
- monitor gas wallet balances continuously
