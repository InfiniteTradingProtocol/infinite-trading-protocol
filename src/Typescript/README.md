# TypeScript examples

| File | Purpose |
|---|---|
| [`api/adapter.ts`](api/adapter.ts) | `setSides()`: set a vault bot's side through the Infinite Trading API (`POST /setBot`), with retries |
| [`proposeUpgradeV3.ts`](proposeUpgradeV3.ts) | Propose a batched Safe transaction that upgrades the Uniswap V3 auto-compounder proxies on Base to a new implementation |
| [`velodromeManagedDeposits.mjs`](velodromeManagedDeposits.mjs) | List veVELO NFTs still deposited in a Velodrome managed veNFT (read-only) |

## Setup

```sh
npm ci
```

## Run

```sh
npx tsx api/adapter.ts
NEW_IMPL=0x... PROPOSER_PK=0x... npm run propose-upgrade   # proposer must be a Safe signer
node velodromeManagedDeposits.mjs 22729
```

`proposeUpgradeV3.ts` only proposes and signs; the remaining Safe signers confirm
in the Safe UI. Keep `PROPOSER_PK` in your shell or a local `.env` (git-ignored),
never in source.
