<p align="center">
  <img src="https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/logos/ITP.png" alt="Infinite Trading Protocol Diagram"/>
</p>


---

# Infinite Trading Protocol 

Welcome to the official code repository for Infinite Trading Protocol. The protocol offers a comprehensive suite of tools designed for advanced financial analysis, data integration, trading bots, and more.

---

## Introduction

The Infinite Trading Protocol API is designed to provide developers with the tools necessary for creating advanced trading strategies and integrating blockchain technology into their financial applications.

## Features

- **Advanced Financial Analysis**: Utilize our tools for comprehensive financial data analysis and insights.
- **Data Integration**: Seamlessly integrate financial data from various sources.
- **Trading Bots**: Develop, test, and deploy sophisticated trading bots to automate your trading strategies.
- **Blockchain Integration**: Leverage blockchain technology to enhance transparency and security in financial transactions.

## Code Structure

### `/src` Directory

The `/src` directory contains various scripts and functions implemented in different programming languages to support the Infinite Trading Protocol. Below is a detailed description of the contents and functionalities of each script within the `/src` directory.

---

#### `/src/R/`

- **`dhedge_graphql.R`**: Interacts with the dHedge GraphQL API to fetch fund compositions and monitor vault deposits; sends alerts to Discord.
- **`ds_price.R`**: Fetches price, price change, and liquidity data from DexScreener for various pairs.
- **`itp_incentives_dexscreener.R`**: Fetches price, price change, and liquidity data from DexScreener for ITP pairs and calculates total incentives for each pool.
- **`staking_yield.R`**: Generates a Staking Yield Per Epoch chart; calculates compound yield over several epochs.
- **`tradfi_correlations.R`**: Retrieves financial data from traditional finance indices and calculates their correlations.
- **Subfolder `/api/`**:
  - **`adapter.R`**: Adapter script for API interactions.

### `/src/Typescript/`

- **`api/adapter.ts`**: Adapter script for API interactions using TypeScript and Axios.

### `/src/python/`

- **`coinbase.py`**: Fetches historical OHLCV candle data from the Coinbase API for various trading pairs.
- **`defi.py`**: Contains utility functions for DeFi operations across different networks, including fetching Uniswap fees, dHedge pool compositions, transaction status, and wallet balances.
- **`itp_incentives_dexscreener.py`**: Fetches LP data from DexScreener and calculates total ITP incentives for each pool.
- **Subfolder `/api/`**:
  - **`adapter.py`**: Adapter script for API interactions using Python and Requests.

---

## Usage

### Aero classic-pool automation

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

Deployed 2026-10-22 (DAO and treasury: the DAO Safe above; mandatory keepers:
the two keepers above; DAO reward fee 2%, DAO entry/exit share 10%):

| Chain | AeroFactory |
|---|---|
| Optimism (10) | `0x8f378C71368Fb50084c2A540592502F0b1Ef8787` (superseded by Aero v2, see below) |
| Base (8453) | `0xf5cf6231b21B1De1dedB00a49B98bd0a6867C7AB` |
| Ethereum (1) | `0x90b2D147ab7d4979168Ec0C425FF460E2ebFa5EA` |
| Robinhood (4663) | `0x9b62904003e52D4019daeA89dC97f5FE817ffbDF` |

Base keeps Aero v1: AERO/USDC vault `0x8a69C3b16FECd6865210858D3E67B948BF71395f`
with zap `0x64Bf868a02CfA1bce82a0711eB090E28a9dc8688`.

**Superseded on Optimism (empty, replaced by Aero v2):** v1 factory
`0x8f378C71368Fb50084c2A540592502F0b1Ef8787`, v1 zap
`0xb797413B59882f42B1Ceb18214911d6eA189c561`, v1 ITP/wstETH vault
`0xA15a7219EE74630AA7B5B0413C3082f2b775220D` and v1 ITP/USDC no-gauge vault
`0xD24a64a6387bb53A5682818564467E75a118eEf0` (`iaITP-USDC`). Do not deposit into
them; dashboards no longer list them. The Robinhood Safe
at the same address currently has a different owner set and threshold than the
other chains. All five contracts are source-verified on Etherscan. Operators
manage them from the local ops dashboard (Trading & Vaults > Aero Automation):
live state, keeper harvests and simulated Safe batches for DAO-owned actions.
The public frontend's `/automation` workflow defaults to these factories.

#### Aero v2 (Optimism)

`contracts/src/aero/v2/` replaces v1 on Optimism. Vaults are non-upgradeable
clones of one implementation, launched permissionlessly through `AeroFactoryV2`
(the caller becomes owner; only the DAO marks vaults official). Shares are a claim
on LP only. Harvest compounds pool fees and gauge emissions into LP, checking every
swap against an `AeroTwapOracle` TWAP (it skips if no TWAP or spot is more than
the configured deviation away); harvested LP unlocks into the share price over
`profitUnlockTime` (24h default). Fees are independent percentages of gross
income: DAO 2% (cap 10%), strategist 0–10%, keeper 0–2% (default 0.5%), accrued
and pull-claimed. The optional exit fee (0–1%) stays with remaining holders. There
is no entry fee, reward basket or deferred reward. Deposits and redemptions never
trade. Keepers call `oracle.updateMany([pool, ...rewardRoute])`, then `harvest`
30–60 minutes later.

| Contract | Optimism (10) |
|---|---|
| AeroFactoryV2 | `0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc` |
| AeroTwapOracle | `0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf` |
| AeroVaultV2 implementation (not a vault) | `0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a` |
| AeroVaultV2 ITP/wstETH (`acITP-wstETH`) | `0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58` |
| AeroZapV2 | `0x95E97Def5456d5860a26DD3108A71Dd13b3E3592` |

The ITP/wstETH vault uses pool `0x76817cf226aa94b164295AED4f62e7a1EEd41d36` and
earns xAERO `0xbdEaeA5205d16f34Cb40038052d91235D87B4C54`. DAO and treasury are the
DAO Safe above; the default keeper is `0xE6C312d661bE5e3eC022e2F18e084713A434A340`.
Vault ownership transfer to the DAO Safe is pending its `acceptOwnership()`.
The factory admin dashboard (Aero Auto Compounders) manages v1 on Base and v2 on
Optimism side by side, see [aero.md](dashboard/factory-admin/aero.md).

### Protocol administration dashboard

The static [factory admin dashboard](dashboard/factory-admin/index.html) provides
vault, staking, treasury, deployment and Safe batch workflows. From
`dashboard/factory-admin`, run `python3 serve.py` and open the localhost URL it
prints. The server builds the contract artifacts needed by deployment tools;
Foundry and the contract dependencies must already be installed.

A companion POC frontend, [managed-vault-factory.html](dashboard/factory-admin/managed-vault-factory.html),
lets a deployer create a single-owner vault with DAO-controlled asset/route/executor
allowlists, a factory fee split and a multicall-friendly `executor`/`rewardRecipient`
trade flow. It is intentionally simple: the owner can deposit, withdraw, transfer
ownership and route strategy trades, while the factory enforces the base policy.

The dashboard uses the frontend's dark-violet palette, purple controls and
bundled Infinite Trading logo. Module navigation sits beside the workspace on
desktop and becomes a wrapping navigation grid on mobile. Each module retains
its own section navigation. Wallet signing, simulations and network-scoped Safe
batches are unchanged by the visual styling.

### R Scripts

To use the R scripts, make sure you have the required packages installed in your R environment. You can install them using the following command:

```R
install.packages(c("tidyr", "ggplot2", "dplyr", "httr", "jsonlite", "PerformanceAnalytics", "quantmod", "xts"))
```

### Python Scripts

To use the Python scripts, ensure you have Python installed on your system along with the necessary dependencies. You can install the dependencies using the following commands:

```sh
pip install requests pandas numpy
```

Run any of the Python scripts using the following command:

```sh
python <script_name>.py
```

### TypeScript Scripts

To use the TypeScript scripts, ensure you have Node.js and npm installed on your system along with the necessary dependencies. You can install the dependencies using the following command:

```sh
npm install
```

Compile and run the TypeScript scripts using the following commands:

```sh
tsc <script_name>.ts
node <script_name>.js
```

---

## Contributing

We welcome contributions from the community. If you wish to contribute to the Infinite Trading Protocol API, please fork the repository, make your changes, and submit a pull request.

## License

This project is licensed under the terms of the [MIT license](LICENSE).

---

## Contact

For support or any queries, please reach out to admin@infinitetrading.io, telegram: @infinitetradingprotocol, or X: @infinitetradepr.

## Copyright

Copyright (c) 2025 Infinite Trading. All rights reserved.

Unauthorized copying of this file, via any medium is strictly prohibited.
```
