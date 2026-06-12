# UniV3AutoCompounder – Upgrade Guide

## Live Deployment (Base mainnet, chain 8453)

| Contract | Address |
|---|---|
| **Proxy (vault – use this address)** | `0xf0e3305e81744e4dfa2d01c0a145814357a89018` |
| Implementation v1 | `0x01307f4753dC02C2B15682dd2Ae95d7Bd9992Ad7` |

- Owner/DAO (upgrade authority): `0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB`
- Keeper 1: `0xE6C312d661bE5e3eC022e2F18e084713A434A340`
- Keeper 2: `0x233EC2735d58698eFC4d5f24A521AA251252f0C0`
- Pool: ITP/USDC 1% (`0x16A1E7F62b702d84AAa0D1f534121DE9d17B0E18`)
- token0 = USDC (`0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`, 6 dec)
- token1 = ITP  (`0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440`, 18 dec)

---

## Upgrade Pattern: UUPS Proxy

All state (tokenId, shares, pendingReinvest, keepers, dao, etc.) lives in the **proxy's storage** and survives upgrades.
Only the logic bytecode is replaced — depositors do nothing.

```
User → Proxy (0xf0e3...) → delegates → Implementation (logic only)
         ↑ state lives here
```

---

## How to Upgrade

### 1. Edit the contract

Make changes to `src/UniV3AutoCompounder.sol`.

**CRITICAL storage rules (or you'll corrupt state):**
- **Never remove or reorder existing state variables.** New variables must be appended at the end.
- Current layout order (do not change positions 1–11):
  1. `token0` (address)
  2. `token1` (address)
  3. `poolFee` (uint24)
  4. `pool` (address)
  5. `tokenId` (uint256)
  6. `owner` (address)
  7. `dao` (address)
  8. `isKeeper` (mapping)
  9. `twapPeriod` (uint32)
  10. `maxSlippageBps` (uint16)
  11. `totalShares` (uint256)
  12. `userShares` (mapping)
  13. `pendingReinvest0` (uint256)
  14. `pendingReinvest1` (uint256)
- New variables go **after** `pendingReinvest1`.
- Do NOT add `initialize()` logic to a re-deployment — `_disableInitializers()` in the constructor prevents re-initialization.

### 2. Run tests

```bash
cd contracts
source .env
forge test --match-path "test/UniV3AutoCompounder.t.sol" \
  --fork-url "$BASE_RPC_URL" \
  --skip "test/Booster.t.sol" --skip "test/AutoCompoundVault.t.sol"
# All 50 must pass
```

### 3. Deploy new implementation (no proxy, no constructor args)

```bash
source .env
forge create src/UniV3AutoCompounder.sol:UniV3AutoCompounder \
  --rpc-url "$BASE_RPC_URL" \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --verify \
  --etherscan-api-key "$BASE_ETHERSCAN_API_KEY" \
  --optimizer-runs 200 \
  --via-ir
```

Note the new implementation address — call it `NEW_IMPL`.

Or use the deploy script with `--broadcast` but note it will also re-deploy the proxy (wasteful). Better to use `forge create` for upgrades.

### 4. Upgrade the proxy

The upgrade transaction must come from the **DAO address** (`0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB`) since it is the owner.

**Option A – cast (command line):**
```bash
cast send 0xf0e3305e81744e4dfa2d01c0a145814357a89018 \
  "upgradeToAndCall(address,bytes)" \
  NEW_IMPL \
  "0x" \
  --rpc-url "$BASE_RPC_URL" \
  --private-key "$DAO_PRIVATE_KEY"
```

**Option B – if DAO is a multisig (Safe):**
Create a transaction on the Safe UI to call `upgradeToAndCall(NEW_IMPL, "0x")` on the proxy address.

**Option C – if you want to call an initializer on upgrade (e.g. to set new default values):**
```bash
cast send 0xf0e3305e81744e4dfa2d01c0a145814357a89018 \
  "upgradeToAndCall(address,bytes)" \
  NEW_IMPL \
  "$(cast calldata 'myMigrationFn(uint256)' 123)" \
  --rpc-url "$BASE_RPC_URL" \
  --private-key "$DAO_PRIVATE_KEY"
```
The migration function must use `reinitializer(N)` modifier where N > 1.

### 5. Verify the proxy points to the new implementation

```bash
cast storage 0xf0e3305e81744e4dfa2d01c0a145814357a89018 \
  0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc \
  --rpc-url "$BASE_RPC_URL"
# Should return NEW_IMPL address (right-padded to 32 bytes)
```

---

## If You Need a Migration Function

Add to the new implementation before deploying:

```solidity
/// @dev Only runs once on upgrade (version 2). Use reinitializer(2) for v3, etc.
function initializeV2(/* new params */) external reinitializer(2) {
    require(msg.sender == owner, "Not owner");
    // set new state variables introduced in v2
    newVariable = defaultValue;
}
```

Then pass the encoded call to `upgradeToAndCall`:
```bash
"$(cast calldata 'initializeV2(uint256)' 42)"
```

---

## Key Files

| File | Purpose |
|---|---|
| `src/UniV3AutoCompounder.sol` | Contract source (edit this to upgrade) |
| `script/DeployUniV3AutoCompounder.s.sol` | Full proxy + impl deploy (first-time only) |
| `test/UniV3AutoCompounder.t.sol` | 50 fork tests — all must pass before upgrade |
| `.env` | All secrets and addresses |
| `foundry.toml` | `optimizer_runs = 200`, `via_ir = true`, `evm_version = shanghai` |

---

## Compiler Settings (must match for verification)

```
solc:            0.8.26
optimizer:       true
optimizer_runs:  200
via_ir:          true
evm_version:     shanghai
```

---

## Running Tests

```bash
# Standard (exclude broken legacy files)
forge test \
  --match-path "test/UniV3AutoCompounder.t.sol" \
  --fork-url "$BASE_RPC_URL" \
  --skip "test/Booster.t.sol" --skip "test/AutoCompoundVault.t.sol"

# Verbose (with traces on failures)
forge test \
  --match-path "test/UniV3AutoCompounder.t.sol" \
  --fork-url "$BASE_RPC_URL" \
  --skip "test/Booster.t.sol" --skip "test/AutoCompoundVault.t.sol" \
  -vvvv

# Requires Foundry nightly (v1.7.2+) — v1.7.1 panics on Base post-isthmus fork:
foundryup -i nightly
```

---

## Contract Size Budget

Max: 24,576 bytes. Current impl: ~21,100 bytes (~3,476 bytes of headroom).
If you hit the limit, lower `optimizer_runs` further (e.g. 100) or replace `require("long string")` with custom errors.

---

## Fee Structure (hardcoded constants — cannot be changed by upgrade)

| Recipient | Rate | Trigger |
|---|---|---|
| DAO | 1.5% (150 bps) | Fresh LP fees collected in `compound()` |
| Executor/keeper | 0.5% (50 bps) | Fresh LP fees collected in `compound()` |
| Re-invested | 98% | After fees |
| Zap fee (DAO) | 0.3% (30 bps) | On `zap()` / `zapOut()` entry amount |

Carryover (`pendingReinvest0/1`) is **never** charged fees again.

---

## Basescan Links

- Proxy: https://basescan.org/address/0xf0e3305e81744e4dfa2d01c0a145814357a89018
- Implementation v1: https://basescan.org/address/0x01307f4753dc02c2b15682dd2ae95d7bd9992ad7
