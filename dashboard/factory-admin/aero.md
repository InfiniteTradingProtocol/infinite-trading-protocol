# Aero factory administration

Select **Aero Auto Compounders** in the existing dashboard. This separate module
does not deploy contracts, request signatures, approve tokens, or send transactions.
Existing contract-family modules are unchanged.

## Registry and discovery

`config.js` → `ITP_CONFIG.aero[chainId]` holds the current factory, an optional
`version` (omitted = Aero v1, `2` = Aero v2) and explicit
`vaults: [{ name, address, zap, symbol, pool, token0, token1, route }]` metadata
(token entries carry `{ symbol, address, decimals }`; `route` presets `setRewardRoute`). Both versions run side by side and
each network selects its ABI from `version`.

| Network | Version | Factory | Vault | Zap |
|---|---|---|---|---|
| Base (8453) | v2 | `0xB60ce95161506EeC22A2D68A784DD21cf78adcA9` | AERO / USDC `0xA7e2E4Cb6B4938AAaDE3EbDEDe373205818129fC` | `0xAdF1288917495F806b6014f354638F905B9Ce3fa` |
| Optimism (10) | v2 | `0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc` | ITP / wstETH `0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58` | `0x95E97Def5456d5860a26DD3108A71Dd13b3E3592` |
| Optimism (10) | v2 | same | ITP / USDC `0x579f6D1646fDEb59B37a4DC880DbB6857004BafD` | same |
| Optimism (10) | v2 | same | ITP / WBTC `0x6E276D140230C6f967ee2c79AEd69C90A24e115D` | same |

Optimism v2 also pins the TWAP oracle `0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf`
and vault implementation `0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a` (the
implementation is not a vault; the factory panel refuses to manage a factory whose
`oracle()` or `implementation()` differ). `routePools` presets the DAO-approved
reward-route pools (xAERO/USDC `0x686c9942020a80EE853EaEF7663A266ae7991965`,
ITP/USDC `0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01`). Per-vault routes: ITP/wstETH and
ITP/WBTC use xAERO → USDC → ITP (both pools); ITP/USDC uses xAERO → USDC only.
Optimism vault pools: ITP/wstETH `0x76817cf226aa94b164295AED4f62e7a1EEd41d36`,
ITP/USDC `0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01` (ITP / USDC 6 dec),
ITP/WBTC `0x96E354C66e56c6083064d30FCE5FeD009C3a6651` (ITP / WBTC
`0x68f180fcCe6836688e9084f035309E29Bf0A2095`, 8 dec).

Base v2 pins oracle `0x4751B11220919d8A76Bf3998d85Ecb6524D0Ed82` and implementation
`0x3f81c3E6cDaB6139E62fec8800F6093b9b2405C0` (not a vault). Its AERO/USDC vault
(`acAERO-USDC`, pool `0xF634058dC94e6BF8e828E27621320C423bC8B18E`, AERO token0,
USDC token1) earns AERO, which is token0, so it has no reward route; the DAO batch
attaches gauge `0xd424BA8ca9d4E278753DE76651a0095451e65cD1` and enables staking.
Deferred Base AERO pushed later by Aero's handler counts as income at the next harvest.
Every v2 vault stays pending owner = DAO Safe until the Safe batch runs
`acceptOwnership`.

Aero v2 replaces v1 on Optimism. The v1 Optimism factory
`0x8f378C71368Fb50084c2A540592502F0b1Ef8787`, zap
`0xb797413B59882f42B1Ceb18214911d6eA189c561` and vaults ITP / wstETH
`0xA15a7219EE74630AA7B5B0413C3082f2b775220D` and ITP / USDC
`0xD24a64a6387bb53A5682818564467E75a118eEf0` are superseded (all empty). They are
kept only as a labelled `legacy` reference and are never discovered or managed.
Likewise Aero v2 replaces v1 on Base: the v1 Base factory
`0xf5cf6231b21B1De1dedB00a49B98bd0a6867C7AB`, zap
`0x64Bf868a02CfA1bce82a0711eB090E28a9dc8688` and AERO / USDC vault
`0x8a69C3b16FECd6865210858D3E67B948BF71395f` are superseded (empty) `legacy` entries.
Never substitute retired Base contracts. For future deployments, only add a
zap after confirming its factory; empty zap metadata still allows vault inspection
and discovery of vaults registered with the newest factory.

Discovery reads `vaultCount()` and pages through `vaults(index)`, twenty at a time.
Configured vaults appear alongside each page. The market label and zap only apply
to an exact configured vault address, never to an arbitrary discovered vault.

## Verification and management

- The configured factory must have code and its immutable `dao()` must match
  the dashboard DAO Safe. AeroFactory has no `owner` or `pendingOwner`.
- Before displaying management, each vault must have code, factory membership,
  the matching `automationFactory` (v1) or `factory` (v2), a recognized LP pool, and a valid gauge
  (when nonzero). A configured zap must have code and the matching `factory()`.
- Vault ownership, pending ownership, tokens, fees, strategist, staking, raw LP
  assets and share supply are read on-chain. LP assets exclude the reward basket.
  Keeper lookup distinguishes mandatory, extra and effective permissions.
- Factory fee/default-keeper changes and permanent mandatory-keeper additions
  use DAO authority. Vault fee, extra-keeper, staking and ownership-transfer
  changes require the DAO to own that vault. `acceptOwnership` instead requires
  the DAO to be its pending owner.
- **Build & simulate** fixes the target and calldata and runs `eth_call` as the
  DAO Safe. Editing inputs requires rebuilding. **Re-simulate & add to batch**
  repeats authorization checks and simulation before queuing the fixed call.
  Network changes, refreshes and vault-selection changes invalidate old previews.
- Review exported transactions in the existing **Batch** view and Safe.
  Simulating independently is not a guarantee that an ordered multi-call batch
  will execute; state and permissions can change before execution.
- Adding mandatory keepers is permanent. Disabling gauge staking withdraws LP
  and collects rewards. No harvest/zap/deposit/redeem action is exposed here.

## Aero v2 actions (Optimism, Base)

All are built, simulated as the DAO Safe and queued exactly like v1 actions.

- **Factory (DAO only):** `setDaoFee` (0–1000 bps of gross income), `setTreasury`,
  `setKeeper(keeper, enabled)` (the default keeper cannot be disabled),
  `setDefaultKeeper` (must already be a factory keeper), `setApprovedPool`
  (approving requires an Aero classic pool), `setOfficial` (factory vaults only)
  and `createVault(pool, strategist, strategistBps, name, symbol)`. `createVault`
  is permissionless; queued from the Safe, the Safe becomes the vault owner.
- **Vault owner:** `acceptOwnership`, `setFees(strategist, strategistBps 0–1000,
  keeperBps 0–200, exitBps 0–100)`, `setRisk(deviation 10–1000, slippage 10–500,
  swap 10–500)`, `setProfitUnlockTime(3600–172800 s, applies next harvest)`,
  `setKeeper`, `setOpenHarvest`, `setRewardRoute` (≤4 unique pools, each the vault
  pool or DAO-approved), `transferOwnership`.
- **DAO gauge actions (no vault ownership needed):** `setGauge` (only while not
  staking; nonzero gauges must pass `factory.isGauge`) and `setStaking`. Enabling
  needs a gauge and, when the reward token is not a pair token, a reward route.
  Disabling (DAO or owner) claims emissions and returns all LP to the vault.
- Vault inspection shows the DAO / strategist / keeper income fees (independent
  percentages of gross income), exit fee (kept by holders), risk limits, unlocking
  profit, profit-unlock times, last harvest, staked LP, open-harvest flag, reward
  route and official label. Keeper lookup reports factory, extra and effective.

## Zap source inspection

Vault inspection includes **Open verified deployed source**, opening a separate
window with the exact Sourcify-verified compilation, dependency file selector,
Copy button, explorer code link and repository location
`contracts/src/aero/v2/AeroZapV2.sol` (Optimism and Base v2; the v1 `AeroZap.sol`
snapshot is kept for the superseded v1 zaps). The v2 zaps were
not yet verified on Sourcify when this was written, so the viewer reports
verification as unavailable until it is. The viewer requires creation/runtime matches, validates
the contract name and compares source SHA-256 with the local repository snapshot.
Changing either maintained Solidity file requires updating its snapshot hash in
`contract-source.js`; the focused test detects drift. The GitHub main link can be
unavailable until local source changes are pushed.

AeroZap is immutable and has no administrative owner, upgrade function, or
management setters. The dashboard deliberately does not invent owner controls.

## Focused offline validation

```sh
node --test dashboard/factory-admin/aero.test.cjs dashboard/factory-admin/contract-source.test.cjs
node --check dashboard/factory-admin/aero.js
node --check dashboard/factory-admin/aero-core.js
```

The tests stub RPC/contracts and never touch live funds.
