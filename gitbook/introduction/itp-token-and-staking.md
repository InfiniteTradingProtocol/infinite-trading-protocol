# 🪙 ITP Token & Staking (Staking V1)

You’re right to expect concrete details. This section now documents the actual ITP staking implementation used in production flows.

## Network and contract addresses (current Staking V1 flow)

| Item | Network | Address |
|---|---|---|
| ITP token (staking asset) | Optimism | `0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0` |
| Staking vault contract (Staking V1) | Optimism | `0x23371aEEaF8718955C93aEC726b3CAFC772B9E37` |
| Price oracle used by staking UI | Optimism | `0x395942C2049604a314d39F370Dfb8D87AAC89e16` |

## What Staking V1 does

Staking V1 lets users lock ITP with lock multipliers (1–4 years), then withdraw when unlocked or early-withdraw with penalty logic.

Core user actions:

1. Approve ITP to staking vault
2. Deposit with selected lock multiplier
3. Track lock entries and unlock timestamps
4. Withdraw on unlock (or early withdraw with penalty)
5. Optionally extend lock

## Contract functions used by the frontend

From the Staking V1 ABI integration:

- `deposit(uint256 amount, uint256 lockMultiplier)`
- `withdraw(uint256[] tokenIds)`
- `earlyWithdraw(uint256 tokenId)`
- `extendLock(uint256 tokenId, uint256 lockMultiplier)`
- `getStakeInfo(address account)`
- `getVaultInfo()`

Admin/treasury functions exposed in ABI also include:

- `depositRewards(uint256 amount)`
- `withdrawRewards(uint256 amount)`
- `withdrawPenalty(uint256 amount)`
- `burnPenalty(uint256 amount)`
- `convertPenaltyIntoRewards(uint256 amount)`

## Staking mechanics reflected in UI

The staking UI reads and displays:

- `totalStaked`
- `totalRewards`
- `totalRewardsLeft`
- `totalPenalty`
- `totalPenaltyBurned`
- `rewardsRatePerLockMultiplierBps`
- `penaltyRateBps`

User-facing behavior includes:

- dynamic APY by lock period (1Y/2Y/3Y/4Y)
- rewards projection by amount + lock duration
- early-withdraw penalty explanation (decreasing over lock time)
- lock table with status and action buttons

## Where this is implemented (frontend repo)

Primary implementation surfaces:

- `app/staking/page.tsx` (main staking page and contract calls)
- `components/LocksActions.tsx` (withdraw, earlyWithdraw, extendLock)
- `components/TableLocks.tsx` (lock table/status UX)
- `abi/ITP/ItpStakingV1.json` and `abi/ITP/ItpStakingV1.ts` (contract ABI)
- `constants/index.ts` (staking contract + token + oracle addresses)
- `app/api/tvl/_lib/staking.ts` (staking TVL aggregation and caching)
- `types/staking.ts` (staking data structures used in UI)

## Where this is represented in this protocol repo

This repository includes staking analytics/context artifacts used by the ecosystem docs/tooling, including:

- `src/R/utils/staking_yield.R` (staking yield modeling utility)
- `images/staking_yield.png` (staking-yield visualization asset)

## Burns and penalties relationship

Staking penalties and burn metrics are part of the staking contract state model (`totalPenalty`, `totalPenaltyBurned`) and are surfaced in frontend staking analytics.

For broader ecosystem burn context (including operations/revenue narrative), see [🔥 ITP Burns](itp-burns.md).

## Practical notes for users

- Staking is on Optimism in the current documented flow.
- Always verify contract address in-app before transacting.
- Early withdraw can reduce principal via penalty path.
- Lock duration choice materially changes reward profile and liquidity flexibility.
