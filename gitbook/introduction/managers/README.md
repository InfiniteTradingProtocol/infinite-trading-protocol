# 🧑‍💼 Managers: Deploy Vaults & Tradebots

This page is for managers using the frontend manager area and API to deploy and operate Agentic Managed Vaults.

## Frontend manager navigation map

Manager interface sections:

- **Gas Wallets** ([https://www.infinitetrading.io/managers?section=gaswallets](https://www.infinitetrading.io/managers?section=gaswallets)): create, associate, monitor, and refill gas wallets
- **Managed Vaults** ([https://www.infinitetrading.io/managers?section=vaults](https://www.infinitetrading.io/managers?section=vaults)): review vaults and trader linkage
- **API Linked Vaults** ([https://www.infinitetrading.io/managers?section=api](https://www.infinitetrading.io/managers?section=api)): verify vault-to-gas-wallet associations
- **Trading Bots** ([https://www.infinitetrading.io/managers?section=bots](https://www.infinitetrading.io/managers?section=bots)): deploy bots, edit parameters, and generate API code snippets
- **Create Vault** (`Create Vault` tab in manager navigation): create a new dHEDGE vault from the manager workflow

## What this guide covers

- creating and securing gas wallet credentials
- refilling gas wallets from the frontend ("Fill Gas Tank" flow)
- creating a vault and setting trader permissions
- approving assets and deploying the bot
- generating tradebot code snippets for automation

## Prerequisites

- Manager access in the frontend manager area
- A vault address (created on dHEDGE app flow)
- Supported network selection (Optimism, Base, Arbitrum, or Polygon where applicable)

## Step 1) Create and secure a gas wallet

Generate a wallet from **Gas Wallets** (backed by `GET /createGasWallet`).

The generated payload includes:

- gas wallet address
- private key
- gas-wallet API key

Immediately:

- back up private key and API key in secure storage
- associate the wallet in the manager flow so it appears in the manager wallet list

## Step 2) Refill the gas tank in the frontend

In **Gas Wallets**, **Managed Vaults**, and **Trading Bots**, each linked wallet shows a gas-tank icon.

1. Click the gas-tank icon (**Click to refill**)
2. Confirm network and destination wallet in the refill modal
3. Enter amount (USD), use MAX or percentage shortcuts if needed
4. Submit **Refill** and confirm wallet transaction

Operational notes:

- ETH is used on Optimism/Base/Arbitrum/Ethereum
- POL is used on Polygon
- Balance checks are available through `GET /getGasBalance?apiKey=...&network=...`

## Step 3) Create vault and assign trader permission

Create the vault in the dHEDGE flow, then set the gas wallet as **Trader** for that vault.

Verify trader assignment:

`GET /isPoolTrader?apiKey=...&protocol=dhedge&network=...&pool=...`

## Step 4) Deploy the tradebot from Trading Bots

Before bot trades can run, approve each required asset:

`POST /approve`

Typical payload fields include:

- `apiKey`
- `network`
- `protocol` (`dhedge`)
- `pool` (vault address)
- `asset` (e.g., USDC, WETH, WBTC, MORPHO)
- `platform` (e.g., odos)

Then configure bot parameters and deploy through `POST /setBot`:

`pair`, `side`, `threshold`, `slippage`, `share`, `platform`, `lending`

## Step 5) Generate tradebot code snippets in the frontend

In **Trading Bots**:

1. Open create/edit bot dialog
2. Click **Show API Code**
3. Select output format:
   - Webhook URL
   - Python
   - R
   - JavaScript
4. Copy snippet and run it in the target automation environment

These snippets are generated from the current bot payload, matching the selected vault, pair, network, and side.

## Step 6) Verify bot status

`GET /getBotStatus?apiKey=...&protocol=dhedge&network=...&pool=...`

Use this to confirm side, pair, and active status.

## Step 7) Optional immediate trade

For immediate positioning:

`POST /vaultTrade`

with `from`, `to`, `share`, `slippage`, and routing fields.

## Common manager mistakes

- not funding gas wallet before approvals/trades
- forgetting to add gas wallet as vault Trader
- skipping the refill step after creating a new gas wallet
- calling `setBot` before approvals are done
- misconfigured side/share/slippage values

## Security checklist

- rotate/restrict keys in internal systems
- never expose private keys in frontend bundles
- use dedicated wallets per strategy cluster
- monitor gas wallet balances continuously
