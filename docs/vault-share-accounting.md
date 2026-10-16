# Vault share accounting fixes

## Scope

F-1 concerns `UniV4AutoCompounder.deposit` and `UniV4AutoCompounder.zap`.
F-2 concerns `AutoCompoundVault` in `contracts/src/autocompounder.sol`, not
the separate `InfiniteVaultStrategy` implementation.

## F-1: first-depositor inflation

Both V4 entrypoints previously issued all initial liquidity as redeemable
shares and allowed subsequent deposits to mint zero shares after rounding.
Increasing position liquidity without issuing vault shares can inflate the
share price and turn a later deposit into a donation to existing shareholders.

Both paths now permanently retain 1,000 unowned shares on initial seeding,
matching V3's minimum-liquidity defense, require seed liquidity above this
minimum, and revert every zero-share entry. Reversion rolls back transfers,
zap fees, and position changes. The lock raises the cost of inflation; it
does not eliminate rounding or guarantee a minimum nonzero share output.

The new constant does not occupy storage or change the proxy storage layout.
Existing funded proxies are not retroactively seeded with locked shares;
the zero-share check still applies after an upgrade. Do not mint arbitrary
locked shares into existing supply, which would dilute current holders.

## F-2: post-stake denominator

Let A be the pre-deposit staked LP balance, S the existing share supply,
and d the newly minted LP tokens. The old deposit issued floor(d*S/(A+d))
because staking happened before reading the denominator. The corrected
deposit snapshots A and S before taking funds and issues floor(d*S/A).
An existing nonzero supply with no staked LP, or an entry issuing zero
shares, reverts. First-deposit shares remain equal to minted LP tokens.

For equal deposits without gains or losses, the old second depositor received
one third of the final supply rather than one half. This confirms an
accounting defect that benefits existing shareholders. This formula alone
does not establish the reported 1,000 USDC / 53% ownership / 50,000 USDC
profit scenario. Confirming that scenario requires the original PoC, fork
block, target vault address, and any preceding state manipulation.

## Verification

From `contracts/`:

```sh
FOUNDRY_OPTIMIZER_RUNS=200 forge test --match-path test/VaultShareAccounting.t.sol --skip script --evm-version cancun -vv
RUN_VAULT_ACCOUNTING_FORK=true FOUNDRY_OPTIMIZER_RUNS=200 forge test --match-contract AutoCompoundVaultShareAccountingForkTest --skip script --evm-version cancun -vv
```

The isolated regressions exercise V4 deposit/zap combinations, seed locking,
withdrawal lock retention, zero-share rollback, proportional gauge deposits,
compounded LP accounting, and deposit/withdraw round trips. The opt-in fork
test exercises the configured real Optimism router, pool, and gauge and
compares minted shares against both denominators. Mocks use a one-sided V4
position and do not validate swap execution or full V4 settlement behavior.
The local optimizer override does not change production build settings.

## Deployment boundary

These are source fixes, not on-chain remediation. Verify deployed bytecode
and ownership before rollout. V4 requires an authorized UUPS upgrade and
fork validation of the actual proxy. `AutoCompoundVault` is not upgradeable;
existing deployments require an explicitly approved migration. Neither fix
reconciles historically misallocated shares. No live transactions are
required for these tests, and none should be broadcast during verification.