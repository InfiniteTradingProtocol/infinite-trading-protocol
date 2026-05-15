# UniV3AutoCompounder — Frontend Integration Guide

## Deployment

| Property | Value |
|---|---|
| **Contract** | `0x44f1F33fA17C8Bd369E22f4D162aa049CdBc877B` |
| **Chain** | Base mainnet (chain ID `8453`) |
| **Basescan** | https://basescan.org/address/0x44f1F33fA17C8Bd369E22f4D162aa049CdBc877B |
| **Token0 (USDC)** | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| **Token1 (ITP)** | `0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440` |
| **Uniswap V3 Pool** | `0x16A1E7F62b702d84AAa0D1f534121DE9d17B0E18` |
| **Pool fee tier** | `10000` (1%) |
| **ITP DAO** | `0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB` |

---

## ABI (user-facing functions only)

```json
[
  {
    "name": "deposit",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "amount0Desired", "type": "uint256" },
      { "name": "amount1Desired", "type": "uint256" },
      { "name": "tickLower",      "type": "int24"   },
      { "name": "tickUpper",      "type": "int24"   }
    ],
    "outputs": []
  },
  {
    "name": "withdraw",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "shareAmount", "type": "uint256" }
    ],
    "outputs": []
  },
  {
    "name": "zap",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "tokenIn",    "type": "address" },
      { "name": "amountIn",   "type": "uint256" },
      { "name": "slippageBps","type": "uint16"  },
      { "name": "tickLower",  "type": "int24"   },
      { "name": "tickUpper",  "type": "int24"   }
    ],
    "outputs": [
      { "name": "shares", "type": "uint256" }
    ]
  },
  {
    "name": "totalShares",      "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "uint256" }]
  },
  {
    "name": "userShares",       "type": "function", "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "type": "uint256" }]
  },
  {
    "name": "totalLiquidity",   "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "uint128" }]
  },
  {
    "name": "userLiquidity",    "type": "function", "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "type": "uint256" }]
  },
  {
    "name": "pendingFees",      "type": "function", "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "amount0", "type": "uint128" },
      { "name": "amount1", "type": "uint128" }
    ]
  },
  {
    "name": "tokenId",          "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "uint256" }]
  },
  {
    "name": "token0",           "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "address" }]
  },
  {
    "name": "token1",           "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "address" }]
  },
  {
    "name": "maxSlippageBps",   "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "uint16" }]
  },
  {
    "name": "poolFee", "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "uint24" }]
  },
  {
    "name": "pool",    "type": "function", "stateMutability": "view",
    "inputs": [], "outputs": [{ "type": "address" }]
  },
  {
    "name": "setPool", "type": "function", "stateMutability": "nonpayable",
    "inputs": [
      { "name": "_pool",    "type": "address" },
      { "name": "_poolFee", "type": "uint24"  }
    ],
    "outputs": []
  },
  {
    "name": "PoolUpdated", "type": "event",
    "inputs": [
      { "name": "newPool",    "type": "address", "indexed": false },
      { "name": "newPoolFee", "type": "uint24",  "indexed": false }
    ]
  },
  {
    "name": "isKeeper",         "type": "function", "stateMutability": "view",
    "inputs": [{ "name": "addr", "type": "address" }],
    "outputs": [{ "type": "bool" }]
  },
  {
    "name": "Deposited",        "type": "event",
    "inputs": [
      { "name": "user",      "type": "address", "indexed": true  },
      { "name": "tokenId",   "type": "uint256", "indexed": false },
      { "name": "liquidity", "type": "uint256", "indexed": false },
      { "name": "shares",    "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "Withdrawn",        "type": "event",
    "inputs": [
      { "name": "user",     "type": "address", "indexed": true  },
      { "name": "liquidity","type": "uint256", "indexed": false },
      { "name": "amount0",  "type": "uint256", "indexed": false },
      { "name": "amount1",  "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "ZappedIn",         "type": "event",
    "inputs": [
      { "name": "user",           "type": "address", "indexed": true  },
      { "name": "tokenIn",        "type": "address", "indexed": true  },
      { "name": "amountIn",       "type": "uint256", "indexed": false },
      { "name": "zapFee",         "type": "uint256", "indexed": false },
      { "name": "liquidityAdded", "type": "uint128", "indexed": false },
      { "name": "shares",         "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "Compounded",       "type": "event",
    "inputs": [
      { "name": "fee0",           "type": "uint256", "indexed": false },
      { "name": "fee1",           "type": "uint256", "indexed": false },
      { "name": "liquidityAdded", "type": "uint128", "indexed": false }
    ]
  }
]
```

---

## Fee Constants

| Constant | BPS | % | Description |
|---|---|---|---|
| `ZAP_FEE_BPS` | 30 | 0.3% | Charged on `zap()` entry, paid to DAO |
| `DAO_FEE_BPS` | 150 | 1.5% | Of compounded fees, paid to DAO |
| `EXECUTOR_FEE_BPS` | 50 | 0.5% | Of compounded fees, paid to caller of `compound()` |

---

## Functions

### `zap(tokenIn, amountIn, slippageBps, tickLower, tickUpper)` — Single-token entry ⭐

The primary entry point for most users. Accepts either USDC or ITP, swaps to the optimal ratio for the position, and deposits as liquidity.

**Flow:**
1. User approves `amountIn` of `tokenIn` on the ERC-20
2. Call `zap(tokenIn, amountIn, slippageBps, tickLower, tickUpper)`
3. Contract deducts 0.3% DAO fee upfront
4. Contract reads pool price and computes optimal token ratio
5. Swaps one token for the other as needed
6. Adds both tokens as liquidity
7. Mints shares proportional to liquidity added
8. Returns unused dust to caller

**Parameters:**

| Param | Type | Notes |
|---|---|---|
| `tokenIn` | `address` | USDC (`0x8335...`) or ITP (`0xBA8C...`) |
| `amountIn` | `uint256` | Raw token amount (USDC: 6 decimals, ITP: 18 decimals) |
| `slippageBps` | `uint16` | Slippage in basis points (e.g. `50` = 0.5%). Pass `0` to use the contract default (`maxSlippageBps`) |
| `tickLower` | `int24` | Lower tick of the LP range. **Only used on the very first deposit.** Ignored for subsequent calls |
| `tickUpper` | `int24` | Upper tick of the LP range. Only used on first deposit |

**Returns:** `uint256 shares` — shares minted to the caller.

**Example (ethers.js v6):**
```ts
const VAULT = "0x44f1F33fA17C8Bd369E22f4D162aa049CdBc877B";
const USDC  = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Approve first
const usdc = new Contract(USDC, ERC20_ABI, signer);
await usdc.approve(VAULT, amountIn);

// Zap in with USDC, 0.5% slippage, tickLower/tickUpper irrelevant after first deposit
const vault = new Contract(VAULT, VAULT_ABI, signer);
const tx = await vault.zap(USDC, amountIn, 50, tickLower, tickUpper);
const receipt = await tx.wait();

// Parse shares from ZappedIn event
const event = receipt.logs
  .map(l => vault.interface.parseLog(l))
  .find(e => e?.name === "ZappedIn");
const shares = event.args.shares;
```

---

### `deposit(amount0Desired, amount1Desired, tickLower, tickUpper)` — Dual-token entry

Deposits both USDC and ITP in the exact ratio the user specifies. Uniswap will only use the amounts that match the current pool ratio and return the rest as dust directly to the caller.

**Flow:**
1. Approve both `amount0Desired` (USDC) and `amount1Desired` (ITP)
2. Call `deposit(...)`
3. Contract adds liquidity, mints shares, returns any unused dust

**Parameters:**

| Param | Type | Notes |
|---|---|---|
| `amount0Desired` | `uint256` | USDC amount (6 decimals). Can be 0 |
| `amount1Desired` | `uint256` | ITP amount (18 decimals). Can be 0 |
| `tickLower` | `int24` | Only used on first deposit |
| `tickUpper` | `int24` | Only used on first deposit |

**Example:**
```ts
await usdc.approve(VAULT, amount0);
await itp.approve(VAULT, amount1);
await vault.deposit(amount0, amount1, tickLower, tickUpper);
```

> Tip: to get the optimal split, read `slot0()` from the pool and calculate the ratio using the position's tick range. For most frontends, `zap()` is simpler.

---

### `withdraw(shareAmount)` — Withdraw

Burns `shareAmount` shares and receives the proportional underlying USDC + ITP directly.

**Flow:**
1. Call `withdraw(shareAmount)`
2. Contract decreases liquidity proportionally
3. Tokens sent directly to the caller's wallet
4. No approvals needed

**Parameters:**

| Param | Type | Notes |
|---|---|---|
| `shareAmount` | `uint256` | Number of shares to redeem. Use `userShares(address)` to get the user's balance |

**To withdraw 100%:**
```ts
const shares = await vault.userShares(userAddress);
await vault.withdraw(shares);
```

**To withdraw 50%:**
```ts
const shares = await vault.userShares(userAddress);
await vault.withdraw(shares / 2n);
```

---

## View Functions

### Portfolio display

```ts
const vault = new Contract(VAULT, VAULT_ABI, provider);

// User's share balance
const userShareBalance = await vault.userShares(address);

// Total shares outstanding
const total = await vault.totalShares();

// User's ownership % (multiply by 100 for display)
const ownershipPct = (userShareBalance * 10000n) / total; // basis points

// User's underlying liquidity units
const liq = await vault.userLiquidity(address);

// Total liquidity in the vault
const totalLiq = await vault.totalLiquidity();
```

### Pending fees (compound trigger)

Returns uncollected fees accrued in the position. Keepers use this to decide when `compound()` is worth calling. Useful for displaying estimated pending yield to users.

```ts
const [fee0, fee1] = await vault.pendingFees();
// fee0: USDC (uint128, 6 decimals)
// fee1: ITP  (uint128, 18 decimals)
```

> Note: `pendingFees()` returns the Uniswap-snapshotted owed amounts. Actual accrued fees may be slightly higher until a pool interaction triggers a snapshot update.

### Position info

```ts
const tokenId = await vault.tokenId();      // NFT ID, 0 if no position yet
const token0  = await vault.token0();       // USDC address
const token1  = await vault.token1();       // ITP address
const slip    = await vault.maxSlippageBps(); // default slippage (bps)
```

---

## User Flow Summary

```
First time:                               Returning user:
  1. Approve USDC or ITP                    1. Approve USDC or ITP
  2. Call zap() with tickLower/tickUpper    2. Call zap() (ticks ignored)
  3. Shares minted                          3. More shares minted

                      Withdraw:
                        1. Read userShares(address)
                        2. Call withdraw(shareAmount)
                        3. Receive USDC + ITP
```

---

## Tick Range

The tick range (`tickLower`, `tickUpper`) only matters for the **very first deposit** that creates the position. After that, all subsequent `deposit()` and `zap()` calls add to the existing position and the tick parameters are ignored.

The current active position's tick range can be read from the Uniswap V3 position NFT:

```ts
const POSITION_MANAGER = "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1";
const tokenId = await vault.tokenId();

const pm = new Contract(POSITION_MANAGER, POSITION_MANAGER_ABI, provider);
const pos = await pm.positions(tokenId);
const tickLower = pos.tickLower;
const tickUpper = pos.tickUpper;
```

---

## Share Accounting

Shares represent fractional ownership of the vault's LP position:

$$\text{userValue} = \frac{\text{userShares}}{\text{totalShares}} \times \text{totalLiquidity}$$

When `compound()` is called, fees are re-added as liquidity without minting new shares — so each share's underlying liquidity grows over time. This is the auto-compounding yield.

---

## Events to Index

| Event | When to use |
|---|---|
| `Deposited(user, tokenId, liquidity, shares)` | Track dual-token deposits |
| `ZappedIn(user, tokenIn, amountIn, zapFee, liquidityAdded, shares)` | Track zap deposits |
| `Withdrawn(user, liquidity, amount0, amount1)` | Track withdrawals |
| `Compounded(fee0, fee1, liquidityAdded)` | Show compound history / APY data |
| `FeesDistributed(executor, daoFee0, daoFee1, execFee0, execFee1)` | Protocol fee tracking |

---

## Security Notes

- **No permit / EIP-2612**: Standard `approve` + call is required. No gasless approvals.
- **Dust returns**: Any tokens not used in `deposit()` or `zap()` are automatically returned to the caller in the same transaction.
- **Slippage**: Pass a non-zero `slippageBps` to `zap()` for custom per-call slippage. Max allowed is 500 bps (5%). Pass `0` to use the contract default.
- **Reentrancy**: The vault follows Checks-Effects-Interactions. Share state is updated before all external calls in `withdraw()`.

---

## Frontend Implementation (Next.js + wagmi + RainbowKit)

This section covers how to wire the contract into an existing auto-compounder frontend. All components follow a shared pattern so they can be dropped into any page that already uses wagmi.

### Dependencies

```bash
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
```


### 1. Contract constants

One file to import everywhere — keeps all addresses in a single place.

```ts
// lib/contracts.ts
import { parseUnits } from 'viem'

export const VAULT_ADDRESS = '0x44f1F33fA17C8Bd369E22f4D162aa049CdBc877B' as const
export const USDC_ADDRESS  = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' as const
export const ITP_ADDRESS   = '0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440' as const
export const POOL_ADDRESS  = '0x16A1E7F62b702d84AAa0D1f534121DE9d17B0E18' as const
export const POSITION_MANAGER = '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1' as const

export const USDC_DECIMALS = 6
export const ITP_DECIMALS  = 18

// BPS constants — mirror the contract values for UI display
export const ZAP_FEE_BPS      = 30    // 0.3%
export const DAO_FEE_BPS      = 150   // 1.5%
export const EXECUTOR_FEE_BPS = 50    // 0.5%

export const TOKENS = [
  { address: USDC_ADDRESS, symbol: 'USDC', decimals: USDC_DECIMALS },
  { address: ITP_ADDRESS,  symbol: 'ITP',  decimals: ITP_DECIMALS  },
] as const
```

### 3. ABI files

```ts
// lib/abi/vault.ts
export const VAULT_ABI = [
  // -- write --
  { name: 'zap',     type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn',    type: 'address' },
      { name: 'amountIn',   type: 'uint256' },
      { name: 'slippageBps',type: 'uint16'  },
      { name: 'tickLower',  type: 'int24'   },
      { name: 'tickUpper',  type: 'int24'   },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  { name: 'deposit', type: 'function', stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount0Desired', type: 'uint256' },
      { name: 'amount1Desired', type: 'uint256' },
      { name: 'tickLower',      type: 'int24'   },
      { name: 'tickUpper',      type: 'int24'   },
    ],
    outputs: [],
  },
  { name: 'withdraw', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'shareAmount', type: 'uint256' }],
    outputs: [],
  },
  // -- read --
  { name: 'totalShares',    type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'userShares',     type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'totalLiquidity', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint128' }] },
  { name: 'userLiquidity',  type: 'function', stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { name: 'pendingFees',    type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ name: 'amount0', type: 'uint128' }, { name: 'amount1', type: 'uint128' }] },
  { name: 'tokenId',        type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint256' }] },
  { name: 'maxSlippageBps', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint16' }] },
  { name: 'poolFee', type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'uint24' }] },
  { name: 'pool',    type: 'function', stateMutability: 'view',
    inputs: [], outputs: [{ type: 'address' }] },
  { name: 'setPool', type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: '_pool', type: 'address' }, { name: '_poolFee', type: 'uint24' }],
    outputs: [] },
  { name: 'PoolUpdated', type: 'event',
    inputs: [
      { name: 'newPool',    type: 'address', indexed: false },
      { name: 'newPoolFee', type: 'uint24',  indexed: false },
    ] },
  // -- events --
  { name: 'ZappedIn', type: 'event',
    inputs: [
      { name: 'user',           type: 'address', indexed: true  },
      { name: 'tokenIn',        type: 'address', indexed: true  },
      { name: 'amountIn',       type: 'uint256', indexed: false },
      { name: 'zapFee',         type: 'uint256', indexed: false },
      { name: 'liquidityAdded', type: 'uint128', indexed: false },
      { name: 'shares',         type: 'uint256', indexed: false },
    ],
  },
  { name: 'Deposited', type: 'event',
    inputs: [
      { name: 'user',      type: 'address', indexed: true  },
      { name: 'tokenId',   type: 'uint256', indexed: false },
      { name: 'liquidity', type: 'uint256', indexed: false },
      { name: 'shares',    type: 'uint256', indexed: false },
    ],
  },
  { name: 'Withdrawn', type: 'event',
    inputs: [
      { name: 'user',     type: 'address', indexed: true  },
      { name: 'liquidity',type: 'uint256', indexed: false },
      { name: 'amount0',  type: 'uint256', indexed: false },
      { name: 'amount1',  type: 'uint256', indexed: false },
    ],
  },
] as const

// lib/abi/erc20.ts
export const ERC20_ABI = [
  { name: 'approve',  type: 'function', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
  { name: 'allowance', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }] },
] as const
```

### 4. Shared data hook — `useVault`

One hook provides all read data. Import it on any page or component.

```ts
// hooks/useVault.ts
import { useReadContracts, useAccount } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contracts'

export function useVault() {
  const { address } = useAccount()

  const { data, isLoading, refetch } = useReadContracts({
    contracts: [
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalShares' },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'totalLiquidity' },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'pendingFees' },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'maxSlippageBps' },
      { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'tokenId' },
      ...(address ? [
        { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'userShares',    args: [address] },
        { address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'userLiquidity', args: [address] },
      ] : []),
    ],
  })

  const [totalShares, totalLiquidity, pendingFees, maxSlippageBps, tokenId, userShares, userLiquidity] =
    data?.map(r => r.result) ?? []

  const ownershipBps = totalShares && userShares
    ? (BigInt(userShares as bigint) * 10000n) / BigInt(totalShares as bigint)
    : 0n

  return {
    totalShares:    totalShares    as bigint | undefined,
    totalLiquidity: totalLiquidity as bigint | undefined,
    pendingFees:    pendingFees    as [bigint, bigint] | undefined,
    maxSlippageBps: maxSlippageBps as number | undefined,
    tokenId:        tokenId        as bigint | undefined,
    userShares:     userShares     as bigint | undefined,
    userLiquidity:  userLiquidity  as bigint | undefined,
    ownershipBps,
    isLoading,
    refetch,
  }
}
```

### 5. Shared approve hook — `useApprove`

Reused by both ZapPanel and DepositPanel.

```ts
// hooks/useApprove.ts
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { maxUint256 } from 'viem'
import { ERC20_ABI, VAULT_ADDRESS } from '@/lib/contracts'

export function useApprove(tokenAddress: `0x${string}`) {
  const { address } = useAccount()

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [address!, VAULT_ADDRESS],
    query: { enabled: !!address },
  })

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  const approve = (amount?: bigint) =>
    writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: 'approve',
      args: [VAULT_ADDRESS, amount ?? maxUint256],
    })

  return {
    allowance: allowance as bigint | undefined,
    approve,
    isApproving: isPending || isConfirming,
    isApproved: isSuccess,
    refetchAllowance,
  }
}
```

### 6. Shared `TxButton` component

Reuse this for every write action. Shows Approve → Confirm → Pending → Done states.

```tsx
// components/TxButton.tsx
interface TxButtonProps {
  needsApprove: boolean
  onApprove: () => void
  onConfirm: () => void
  isApproving: boolean
  isPending: boolean
  isConfirming: boolean
  disabled?: boolean
  label: string
}

export function TxButton({
  needsApprove, onApprove, onConfirm,
  isApproving, isPending, isConfirming,
  disabled, label,
}: TxButtonProps) {
  if (needsApprove) {
    return (
      <button onClick={onApprove} disabled={isApproving || disabled}>
        {isApproving ? 'Approving…' : 'Approve'}
      </button>
    )
  }
  return (
    <button onClick={onConfirm} disabled={isPending || isConfirming || disabled}>
      {isPending || isConfirming ? 'Pending…' : label}
    </button>
  )
}
```

### 7. `VaultStats` component — reusable vault summary

Drop into any page that should show TVL, pending fees, user position.

```tsx
// components/VaultStats.tsx
import { formatUnits } from 'viem'
import { useVault } from '@/hooks/useVault'
import { USDC_DECIMALS, ITP_DECIMALS } from '@/lib/contracts'

export function VaultStats() {
  const { totalLiquidity, pendingFees, userShares, userLiquidity, ownershipBps, isLoading } = useVault()

  if (isLoading) return <p>Loading…</p>

  return (
    <div className="vault-stats">
      <StatRow label="Total Liquidity"   value={totalLiquidity?.toString() ?? '—'} />
      <StatRow label="Your Shares"       value={userShares?.toString() ?? '0'} />
      <StatRow label="Your Liquidity"    value={userLiquidity?.toString() ?? '0'} />
      <StatRow label="Your Ownership"    value={`${Number(ownershipBps) / 100}%`} />
      {pendingFees && (
        <>
          <StatRow label="Pending USDC Fees"
            value={`${formatUnits(pendingFees[0], USDC_DECIMALS)} USDC`} />
          <StatRow label="Pending ITP Fees"
            value={`${formatUnits(pendingFees[1], ITP_DECIMALS)} ITP`} />
        </>
      )}
    </div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
```

### 8. `ZapPanel` component — single-token entry

```tsx
// components/ZapPanel.tsx
import { useState } from 'react'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI, TOKENS, ZAP_FEE_BPS } from '@/lib/contracts'
import { useApprove } from '@/hooks/useApprove'
import { useVault } from '@/hooks/useVault'
import { TxButton } from '@/components/TxButton'

// tickLower / tickUpper are only needed before the first deposit.
// After that the contract ignores them — pass the position's existing ticks.
interface ZapPanelProps {
  tickLower: number
  tickUpper: number
}

export function ZapPanel({ tickLower, tickUpper }: ZapPanelProps) {
  const { address } = useAccount()
  const { maxSlippageBps, refetch } = useVault()

  const [selectedToken, setSelectedToken] = useState(TOKENS[0])
  const [amount, setAmount]               = useState('')
  const [slippage, setSlippage]           = useState<number | ''>('')

  const parsedAmount = amount
    ? parseUnits(amount, selectedToken.decimals)
    : 0n

  const zapFeeDisplay = amount
    ? `${(parseFloat(amount) * ZAP_FEE_BPS / 10_000).toFixed(6)} ${selectedToken.symbol}`
    : '—'

  const { allowance, approve, isApproving, refetchAllowance } = useApprove(selectedToken.address)
  const needsApprove = allowance !== undefined && parsedAmount > 0n && allowance < parsedAmount

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    onSuccess: () => { refetch(); refetchAllowance() },
  })

  const handleZap = () =>
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'zap',
      args: [
        selectedToken.address,
        parsedAmount,
        slippage !== '' ? slippage : 0,   // 0 → contract uses maxSlippageBps
        tickLower,
        tickUpper,
      ],
    })

  return (
    <div className="zap-panel">
      <h3>Zap In</h3>

      {/* Token selector */}
      <div className="token-selector">
        {TOKENS.map(t => (
          <button
            key={t.address}
            onClick={() => { setSelectedToken(t); setAmount('') }}
            data-active={t.address === selectedToken.address}
          >
            {t.symbol}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <input
        type="number"
        placeholder={`Amount (${selectedToken.symbol})`}
        value={amount}
        onChange={e => setAmount(e.target.value)}
        min="0"
      />

      {/* Slippage override */}
      <input
        type="number"
        placeholder={`Slippage bps (default: ${maxSlippageBps ?? 50})`}
        value={slippage}
        onChange={e => setSlippage(e.target.value === '' ? '' : Number(e.target.value))}
        min="1"
        max="500"
      />

      {/* Fee breakdown */}
      <p className="fee-info">
        DAO fee (0.3%): {zapFeeDisplay}
      </p>

      <TxButton
        needsApprove={needsApprove}
        onApprove={() => approve(maxUint256)}
        onConfirm={handleZap}
        isApproving={isApproving}
        isPending={isPending}
        isConfirming={isConfirming}
        disabled={!address || parsedAmount === 0n}
        label="Zap In"
      />
    </div>
  )
}
```

### 9. `DepositPanel` component — dual-token LP entry

```tsx
// components/DepositPanel.tsx
import { useState } from 'react'
import { parseUnits, maxUint256 } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import {
  VAULT_ADDRESS, VAULT_ABI,
  USDC_ADDRESS, ITP_ADDRESS,
  USDC_DECIMALS, ITP_DECIMALS,
} from '@/lib/contracts'
import { useApprove } from '@/hooks/useApprove'
import { useVault } from '@/hooks/useVault'
import { TxButton } from '@/components/TxButton'

interface DepositPanelProps {
  tickLower: number
  tickUpper: number
}

export function DepositPanel({ tickLower, tickUpper }: DepositPanelProps) {
  const { address } = useAccount()
  const { refetch } = useVault()

  const [amount0, setAmount0] = useState('')
  const [amount1, setAmount1] = useState('')

  const parsed0 = amount0 ? parseUnits(amount0, USDC_DECIMALS) : 0n
  const parsed1 = amount1 ? parseUnits(amount1, ITP_DECIMALS)  : 0n

  // Each token needs its own approval
  const usdc = useApprove(USDC_ADDRESS)
  const itp  = useApprove(ITP_ADDRESS)

  // Approve USDC first, then ITP, then deposit
  const needsApproveUsdc = usdc.allowance !== undefined && parsed0 > 0n && usdc.allowance < parsed0
  const needsApproveItp  = itp.allowance  !== undefined && parsed1 > 0n && itp.allowance  < parsed1
  const needsApprove     = needsApproveUsdc || needsApproveItp

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    onSuccess: () => { refetch(); usdc.refetchAllowance(); itp.refetchAllowance() },
  })

  const handleApprove = () => {
    if (needsApproveUsdc) usdc.approve(maxUint256)
    else itp.approve(maxUint256)
  }

  const handleDeposit = () =>
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'deposit',
      args: [parsed0, parsed1, tickLower, tickUpper],
    })

  const isApproving = usdc.isApproving || itp.isApproving

  return (
    <div className="deposit-panel">
      <h3>Deposit LP</h3>

      <input
        type="number"
        placeholder="USDC amount"
        value={amount0}
        onChange={e => setAmount0(e.target.value)}
        min="0"
      />
      <input
        type="number"
        placeholder="ITP amount"
        value={amount1}
        onChange={e => setAmount1(e.target.value)}
        min="0"
      />

      <p className="info">Unused tokens are automatically returned to your wallet.</p>

      <TxButton
        needsApprove={needsApprove}
        onApprove={handleApprove}
        onConfirm={handleDeposit}
        isApproving={isApproving}
        isPending={isPending}
        isConfirming={isConfirming}
        disabled={!address || (parsed0 === 0n && parsed1 === 0n)}
        label="Deposit"
      />
    </div>
  )
}
```

### 10. `WithdrawPanel` component

```tsx
// components/WithdrawPanel.tsx
import { useState } from 'react'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI } from '@/lib/contracts'
import { useVault } from '@/hooks/useVault'

export function WithdrawPanel() {
  const { address } = useAccount()
  const { userShares, refetch } = useVault()
  const [pct, setPct] = useState(100)

  const shareAmount = userShares ? (userShares * BigInt(pct)) / 100n : 0n

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    onSuccess: refetch,
  })

  const handleWithdraw = () =>
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'withdraw',
      args: [shareAmount],
    })

  return (
    <div className="withdraw-panel">
      <h3>Withdraw</h3>
      <p>Your shares: {userShares?.toString() ?? '0'}</p>

      {/* Quick-select percentage buttons — reuse this pattern for any partial-exit UI */}
      <div className="pct-buttons">
        {[25, 50, 75, 100].map(p => (
          <button key={p} onClick={() => setPct(p)} data-active={pct === p}>
            {p}%
          </button>
        ))}
      </div>

      <p>Withdrawing: {shareAmount.toString()} shares</p>

      <button
        onClick={handleWithdraw}
        disabled={!address || shareAmount === 0n || isPending || isConfirming}
      >
        {isPending || isConfirming ? 'Pending…' : 'Withdraw'}
      </button>
    </div>
  )
}
```

### 11. Page assembly

Combine the panels in a tabbed layout. This pattern mirrors how other auto-compounder strategies are displayed — swap the vault config to reuse for any future strategy.

```tsx
// pages/vault/usdc-itp.tsx  (or app/vault/usdc-itp/page.tsx for App Router)
import { useState, useEffect } from 'react'
import { usePublicClient } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI, POSITION_MANAGER } from '@/lib/contracts'
import { POSITION_MANAGER_ABI } from '@/lib/abi/positionManager'
import { VaultStats }   from '@/components/VaultStats'
import { ZapPanel }     from '@/components/ZapPanel'
import { DepositPanel } from '@/components/DepositPanel'
import { WithdrawPanel } from '@/components/WithdrawPanel'

type Tab = 'zap' | 'deposit' | 'withdraw'

export default function VaultPage() {
  const client = usePublicClient()
  const [tab, setTab] = useState<Tab>('zap')
  const [ticks, setTicks] = useState<{ lower: number; upper: number } | null>(null)

  // Read the active position's tick range once so ZapPanel / DepositPanel can pass
  // them through without the user needing to know what ticks are.
  useEffect(() => {
    async function fetchTicks() {
      const tokenId = await client.readContract({
        address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'tokenId',
      }) as bigint
      if (tokenId === 0n) {
        // No position yet — default ticks; the owner should set these before launch
        setTicks({ lower: -887272, upper: 887272 })
        return
      }
      const pos = await client.readContract({
        address: POSITION_MANAGER, abi: POSITION_MANAGER_ABI, functionName: 'positions',
        args: [tokenId],
      }) as { tickLower: number; tickUpper: number }
      setTicks({ lower: pos.tickLower, upper: pos.tickUpper })
    }
    fetchTicks()
  }, [client])

  return (
    <main>
      <h1>USDC / ITP Auto-Compounder</h1>
      <p className="subtitle">Uniswap V3 · Base · LP fees auto-compound</p>

      <VaultStats />

      <nav className="tab-bar">
        <button onClick={() => setTab('zap')}     data-active={tab === 'zap'}>Zap In</button>
        <button onClick={() => setTab('deposit')} data-active={tab === 'deposit'}>Deposit LP</button>
        <button onClick={() => setTab('withdraw')}data-active={tab === 'withdraw'}>Withdraw</button>
      </nav>

      {ticks && tab === 'zap'     && <ZapPanel     tickLower={ticks.lower} tickUpper={ticks.upper} />}
      {ticks && tab === 'deposit' && <DepositPanel tickLower={ticks.lower} tickUpper={ticks.upper} />}
      {         tab === 'withdraw'&& <WithdrawPanel />}
    </main>
  )
}
```

### 12. Reuse pattern for additional strategies

To add a second auto-compounder vault (e.g. WETH/ITP), create a new constants object and pass it via props:

```ts
// lib/vaults.ts
export const VAULTS = {
  'usdc-itp': {
    address: '0x44f1F33fA17C8Bd369E22f4D162aa049CdBc877B',
    token0: { address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', symbol: 'USDC', decimals: 6 },
    token1: { address: '0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440', symbol: 'ITP',  decimals: 18 },
    pool:   '0x16A1E7F62b702d84AAa0D1f534121DE9d17B0E18',
    label:  'USDC / ITP',
  },
  // 'weth-itp': { ... }
} as const
```

Pass `vault` as a prop to `VaultStats`, `ZapPanel`, `DepositPanel`, and `WithdrawPanel` — all hooks accept the vault address as a parameter so they work without modification.

### 13. Component file structure

```
components/
  TxButton.tsx          ← shared approve/confirm/pending button
  VaultStats.tsx        ← TVL, user position, pending fees
  ZapPanel.tsx          ← single-token entry
  DepositPanel.tsx      ← dual-token LP entry
  WithdrawPanel.tsx     ← share redemption
hooks/
  useVault.ts           ← all vault read data
  useApprove.ts         ← ERC-20 approve + allowance
lib/
  wagmi.ts              ← chain + transport config
  contracts.ts          ← all addresses and constants
  abi/
    vault.ts            ← VAULT_ABI
    erc20.ts            ← ERC20_ABI
    positionManager.ts  ← minimal positions() ABI
pages/ (or app/)
  vault/
    usdc-itp.tsx        ← vault page using all panels
```
