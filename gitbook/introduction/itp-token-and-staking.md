# 🪙 ITP Token & Staking (Staking V1)

This section documents the ITP staking implementation used in production flows.

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

## Core staking actions and methods

Staking V1 exposes the following primary methods:

- `deposit(uint256 amount, uint256 lockMultiplier)`
- `withdraw(uint256[] tokenIds)`
- `earlyWithdraw(uint256 tokenId)`
- `extendLock(uint256 tokenId, uint256 lockMultiplier)`
- `getStakeInfo(address account)`
- `getVaultInfo()`

Operational methods also include:

- `depositRewards(uint256 amount)`
- `withdrawRewards(uint256 amount)`
- `withdrawPenalty(uint256 amount)`
- `burnPenalty(uint256 amount)`
- `convertPenaltyIntoRewards(uint256 amount)`

## Staking metrics shown in the app

The staking interface displays:

- `totalStaked`
- `totalRewards`
- `totalRewardsLeft`
- `totalPenalty`
- `totalPenaltyBurned`
- `rewardsRatePerLockMultiplierBps`
- `penaltyRateBps`

Staking behavior includes:

- dynamic APY by lock period (1Y/2Y/3Y/4Y)
- rewards projection by amount + lock duration
- early-withdraw penalty explanation (decreasing over lock time)
- lock table with status and action buttons

## Interface behavior

The app workflow includes approvals, lock creation, lock extension, standard withdrawal after unlock, and early withdrawal with penalty conditions.

## Burns and penalties relationship

Staking penalties and burn metrics are part of the staking contract state model (`totalPenalty`, `totalPenaltyBurned`) and are surfaced in frontend staking analytics.

For broader ecosystem burn context (including operations and revenue linkage), see [🔥 ITP Burns](itp-burns.md).

## Practical notes for users

- Staking is on Optimism in the current documented flow.
- Always verify contract address in-app before transacting.
- Early withdraw can reduce principal via penalty path.
- Lock duration choice materially changes reward profile and liquidity flexibility.
