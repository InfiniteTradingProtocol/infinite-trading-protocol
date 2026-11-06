# Aero classic-pool auto-compounders

> Source, audits, deployment records and changelog: [contracts/src/aero/](../contracts/src/aero/README.md).
> This page describes the design of both versions and lists their deployments.

## Aero v1 design

The isolated `contracts/src/aero/` module creates shared, non-upgradeable LP
vaults through `AeroFactory`. Existing Velodrome vaults and fees are unchanged.
This follows their LP/gauge compounding workflow, but uses the new Aero V2 ABI
(`claimEmissions`, `claimFees(recipient)`, direct pool swaps/mint), not the
legacy Solidly router ABI. Slipstream NFTs are not supported.

- The DAO takes **2% of newly claimed rewards first**, in the reward's original
  token; only the DAO can change it (1–1,000 bps, never zero).
- Strategist rewards are 0–10% and keeper rewards are independently 0.1–2%
  of post-DAO rewards. Zero strategist rewards do not disable keeper payment.
- Entry and exit fees each cap at 2%. The DAO receives 10% of those fees by
  default; the DAO can reduce that share to zero, but cannot exceed 10%.
- The deployer manages its strategist recipient, bounded fees and extra keepers.
  Mandatory factory keepers cannot be removed. The immutable factory, DAO and
  treasury cannot be replaced by a vault owner. Mandatory keepers are additive.
- Deposits use LP tokens and a proportional contribution to the uninvested
  reward basket, bounded by `maxExtra`. This prevents capturing pre-existing
  rewards without needing an oracle or forcing a swap during user withdrawals.
  Withdrawals return LP plus that basket, bounded by minimum outputs. The first
  deposit permanently locks 1,000 share units. Fee-on-transfer/rebasing tokens
  are unsupported. Entry/exit fees apply to each contributed/redeemed token.
- `estimateKeeperReward()` returns raw amounts in its three-token array; use
  `eth_call` to simulate `harvest` with an authorized keeper. The estimate is not
  a USD value or a profitability promise. Deposits/redemptions settle reward
  fees to the factory's default keeper; harvest pays the actual authorized caller.
- Base pays AERO; Ethereum, Optimism and Robinhood pay local xAERO. Base emissions
  below Aero's redemption threshold remain deferred at its handler. Exiting
  users retain `deferredCredits`, redeemable via `claimDeferredRewards()` after
  Aero releases the funds. Reserved credits cannot be compounded or captured by
  later entrants. Reward and exit fees on these credits apply when claimed.
- Owners can disable staking and withdraw the LP to earn pool fees without a
  gauge. No DAO gauge allowlist exists: `createVault` accepts a gauge only if
  the pool type's official Aero gauge factory registers it (`isGauge`), its
  deterministic `computeGaugeAddress(pool)` matches, its staking token and voter
  match, and LeafVoter reports it activated (`AeroFactory.isGauge`). External
  claim failures explicitly revert; no reward or swap failure is silently hidden.
- Keepers are trusted execution operators: only registered Aero pools and the
  vault's reward/pair tokens are usable, but swap quotes are spot quotes, not
  manipulation-resistant oracles. Production requires fork validation, keeper
  operational controls and independent review; offline mocks are not an audit.

## Testing

Run the isolated offline suite from `contracts/`:

```bash
FOUNDRY_PROFILE=aero forge test --match-path 'test/aero/*' -vv
FOUNDRY_PROFILE=aero forge build --sizes
```

The Aero profile uses Cancun because deployed gauges use Cancun opcodes.
Opt-in read-only Base fork acceptance (all state changes stay inside Foundry):

```bash
AERO_FORK_TESTS=true FOUNDRY_PROFILE=aero forge test --match-path 'test/aero/AeroBase.fork.t.sol' -vv
```

Set `AERO_FORK_RPC_URL` to an alternate Base RPC if needed. The fork exercises
the actual WETH/USDC volatile pool, a funded stable pool, real gauge
staking/claim/redemption, and compounding both pool tokens; it does not send signed transactions.
`AeroOptimism.fork.t.sol` exercises the Optimism ITP/USDC classic pool the same
way. Ethereum and Robinhood had no classic pools at deployment time, so only
their deployment constructors were simulated against live state.

## Deploying v1

`contracts/script/aero/DeployAero.s.sol` supports Base (8453), Ethereum (1),
Optimism (10), and Robinhood (4663). Addresses come from
[Aero's security page](https://app.aero.xyz/docs/security/); the script requires
on-chain code at the configured dependencies and DAO/treasury addresses.
Provide `AERO_DAO`, `AERO_TREASURY`, and comma-separated `AERO_KEEPERS` explicitly
for each chain, then run the script **without `--broadcast`** for a dry run.
Existing scripts identify the DAO Safe as
`0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB` and keepers as
`0xE6C312d661bE5e3eC022e2F18e084713A434A340` and
`0x233EC2735d58698eFC4d5f24A521AA251252f0C0`; their presence/authority
must be confirmed on the selected chain rather than assumed.

## Aero v1 deployments

Deployed 2026-10-22 (DAO and treasury: the DAO Safe above; mandatory keepers:
the two keepers above; DAO reward fee 2%, DAO entry/exit share 10%):

| Chain | AeroFactory |
|---|---|
| Optimism (10) | `0x8f378C71368Fb50084c2A540592502F0b1Ef8787` (superseded by Aero v2, see below) |
| Base (8453) | `0xf5cf6231b21B1De1dedB00a49B98bd0a6867C7AB` (superseded by Aero v2, see below) |
| Ethereum (1) | `0x90b2D147ab7d4979168Ec0C425FF460E2ebFa5EA` |
| Robinhood (4663) | `0x9b62904003e52D4019daeA89dC97f5FE817ffbDF` |

**Superseded on Base (empty, replaced by Aero v2):** v1 AERO/USDC vault
`0x8a69C3b16FECd6865210858D3E67B948BF71395f` and zap `0x64Bf868a02CfA1bce82a0711eB090E28a9dc8688`.

**Superseded on Optimism (empty, replaced by Aero v2):** v1 factory
`0x8f378C71368Fb50084c2A540592502F0b1Ef8787`, v1 zap
`0xb797413B59882f42B1Ceb18214911d6eA189c561`, v1 ITP/wstETH vault
`0xA15a7219EE74630AA7B5B0413C3082f2b775220D` and v1 ITP/USDC no-gauge vault
`0xD24a64a6387bb53A5682818564467E75a118eEf0` (`iaITP-USDC`). Do not deposit into
them; dashboards no longer list them. The Robinhood Safe
at the same address currently has a different owner set and threshold than the
other chains. All five contracts are source-verified on Etherscan. The public
frontend's `/automation` workflow defaults to these factories.

## Aero v2 (Optimism and Base)

`contracts/src/aero/v2/` replaces v1 on Optimism and Base. Full records (all versions, deployments, transactions, Safe batches, audit and changelog): [contracts/src/aero/README.md](../contracts/src/aero/README.md). Vaults are non-upgradeable
clones of one implementation, launched permissionlessly through `AeroFactoryV2`
(the caller becomes owner; only the DAO marks vaults official). Shares are a claim
on LP only. Harvest compounds pool fees and gauge emissions into LP, checking every
swap against an `AeroTwapOracle` TWAP (it skips if no TWAP or spot is more than
the configured deviation away); harvested LP unlocks into the share price over
`profitUnlockTime` (24h default). Fees are independent percentages of gross
income: DAO 2% (cap 10%), strategist 0–10%, keeper 0–2% (default 0.5%), accrued
and pull-claimed. The optional exit fee (0–1%) stays with remaining holders. There
is no entry fee or reward basket; on Base, deferred AERO counts as income when Aero's handler delivers it. Deposits and redemptions never
trade. Keepers call `oracle.updateMany([pool, ...rewardRoute])`, then `harvest`
30–60 minutes later.

| Contract | Optimism (10) | Base (8453) |
|---|---|---|
| AeroFactoryV2 | `0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc` | `0xB60ce95161506EeC22A2D68A784DD21cf78adcA9` |
| AeroTwapOracle | `0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf` | `0x4751B11220919d8A76Bf3998d85Ecb6524D0Ed82` |
| AeroVaultV2 implementation (not a vault) | `0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a` | `0x3f81c3E6cDaB6139E62fec8800F6093b9b2405C0` |
| AeroZapV2 | `0x95E97Def5456d5860a26DD3108A71Dd13b3E3592` | `0xAdF1288917495F806b6014f354638F905B9Ce3fa` |
| Vaults | ITP/wstETH `0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58`, ITP/USDC `0x579f6D1646fDEb59B37a4DC880DbB6857004BafD`, ITP/WBTC `0x6E276D140230C6f967ee2c79AEd69C90A24e115D` | AERO/USDC `0xA7e2E4Cb6B4938AAaDE3EbDEDe373205818129fC` |

Optimism vaults earn xAERO `0xbdEaeA5205d16f34Cb40038052d91235D87B4C54` (routes through the DAO-approved
xAERO/USDC and ITP/USDC pools); the Base vault stakes in gauge `0xd424BA8ca9d4E278753DE76651a0095451e65cD1` and
earns AERO, a pool token, so it needs no route. DAO and treasury are the
DAO Safe above; the default keeper is `0xE6C312d661bE5e3eC022e2F18e084713A434A340`.
Vault ownership transfer to the DAO Safe is pending its setup batches (`contracts/src/aero/deployments/safe-batches/`).
The factory admin dashboard (Aero Auto Compounders) manages v2 on Optimism and Base and
v1 on Ethereum and Robinhood side by side, see [aero.md](../dashboard/factory-admin/aero.md).
