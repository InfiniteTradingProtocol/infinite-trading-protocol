# New Functions — Frontend Update Reference

Additions since the original integration guide. Paste these into your ABI arrays and component files.

---

## New ABI entries

### `zapOut` — single-token exit

```json
{
  "name": "zapOut",
  "type": "function",
  "stateMutability": "nonpayable",
  "inputs": [
    { "name": "shareAmount", "type": "uint256" },
    { "name": "tokenOut",    "type": "address" },
    { "name": "slippageBps", "type": "uint16"  }
  ],
  "outputs": [
    { "name": "amountOut", "type": "uint256" }
  ]
}
```

### `setPool` — owner: migrate to a different pool/fee tier

```json
{
  "name": "setPool",
  "type": "function",
  "stateMutability": "nonpayable",
  "inputs": [
    { "name": "_pool",    "type": "address" },
    { "name": "_poolFee", "type": "uint24"  }
  ],
  "outputs": []
}
```

### `poolFee` — read current fee tier

```json
{
  "name": "poolFee",
  "type": "function",
  "stateMutability": "view",
  "inputs": [],
  "outputs": [{ "type": "uint24" }]
}
```

### `pool` — read current pool address

```json
{
  "name": "pool",
  "type": "function",
  "stateMutability": "view",
  "inputs": [],
  "outputs": [{ "type": "address" }]
}
```

### `ZappedOut` event

```json
{
  "name": "ZappedOut",
  "type": "event",
  "inputs": [
    { "name": "user",      "type": "address", "indexed": true  },
    { "name": "tokenOut",  "type": "address", "indexed": true  },
    { "name": "shares",    "type": "uint256", "indexed": false },
    { "name": "amountOut", "type": "uint256", "indexed": false },
    { "name": "zapFee",    "type": "uint256", "indexed": false }
  ]
}
```

### `PoolUpdated` event

```json
{
  "name": "PoolUpdated",
  "type": "event",
  "inputs": [
    { "name": "newPool",    "type": "address", "indexed": false },
    { "name": "newPoolFee", "type": "uint24",  "indexed": false }
  ]
}
```

---

## TypeScript ABI additions (wagmi / viem format)

Add these to your `VAULT_ABI` array in `lib/abi/vault.ts`:

```ts
// zapOut
{ name: 'zapOut', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: 'shareAmount', type: 'uint256' },
    { name: 'tokenOut',    type: 'address' },
    { name: 'slippageBps', type: 'uint16'  },
  ],
  outputs: [{ name: 'amountOut', type: 'uint256' }],
},

// setPool (owner only)
{ name: 'setPool', type: 'function', stateMutability: 'nonpayable',
  inputs: [
    { name: '_pool',    type: 'address' },
    { name: '_poolFee', type: 'uint24'  },
  ],
  outputs: [],
},

// read pool state
{ name: 'poolFee', type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ type: 'uint24' }] },
{ name: 'pool',    type: 'function', stateMutability: 'view',
  inputs: [], outputs: [{ type: 'address' }] },

// events
{ name: 'ZappedOut', type: 'event',
  inputs: [
    { name: 'user',      type: 'address', indexed: true  },
    { name: 'tokenOut',  type: 'address', indexed: true  },
    { name: 'shares',    type: 'uint256', indexed: false },
    { name: 'amountOut', type: 'uint256', indexed: false },
    { name: 'zapFee',    type: 'uint256', indexed: false },
  ],
},
{ name: 'PoolUpdated', type: 'event',
  inputs: [
    { name: 'newPool',    type: 'address', indexed: false },
    { name: 'newPoolFee', type: 'uint24',  indexed: false },
  ],
},
```

---

## `zapOut` — how it works

1. Burns `shareAmount` shares
2. Removes proportional liquidity from the position
3. Collects both tokens to the contract
4. Swaps the unwanted token entirely into `tokenOut` via the vault's Uniswap pool
5. Deducts 0.3% DAO fee from the output
6. Transfers the remainder to the caller

**No approvals needed** — user only calls `zapOut`.

---

## `ZapOutPanel` component

```tsx
// components/ZapOutPanel.tsx
import { useState } from 'react'
import { formatUnits } from 'viem'
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { VAULT_ADDRESS, VAULT_ABI, TOKENS, USDC_DECIMALS, ITP_DECIMALS, ZAP_FEE_BPS } from '@/lib/contracts'
import { useVault } from '@/hooks/useVault'

export function ZapOutPanel() {
  const { address } = useAccount()
  const { userShares, maxSlippageBps, refetch } = useVault()

  const [selectedToken, setSelectedToken] = useState(TOKENS[0])   // tokenOut
  const [pct, setPct]                     = useState(100)
  const [slippage, setSlippage]           = useState<number | ''>('')

  const shareAmount = userShares ? (userShares * BigInt(pct)) / 100n : 0n

  const { writeContract, data: hash, isPending } = useWriteContract()
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash,
    onSuccess: refetch,
  })

  const handleZapOut = () =>
    writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: 'zapOut',
      args: [
        shareAmount,
        selectedToken.address,
        slippage !== '' ? slippage : 0,  // 0 → contract uses maxSlippageBps
      ],
    })

  return (
    <div className="zapout-panel">
      <h3>Zap Out</h3>

      {/* Receive token selector */}
      <div className="token-selector">
        {TOKENS.map(t => (
          <button
            key={t.address}
            onClick={() => setSelectedToken(t)}
            data-active={t.address === selectedToken.address}
          >
            Receive {t.symbol}
          </button>
        ))}
      </div>

      {/* Percentage of shares to exit */}
      <div className="pct-buttons">
        {[25, 50, 75, 100].map(p => (
          <button key={p} onClick={() => setPct(p)} data-active={pct === p}>
            {p}%
          </button>
        ))}
      </div>

      <p>Shares to burn: {shareAmount.toString()}</p>

      {/* Slippage override */}
      <input
        type="number"
        placeholder={`Slippage bps (default: ${maxSlippageBps ?? 50})`}
        value={slippage}
        onChange={e => setSlippage(e.target.value === '' ? '' : Number(e.target.value))}
        min="1"
        max="500"
      />

      <p className="fee-info">DAO fee (0.3%) deducted from output</p>

      <button
        onClick={handleZapOut}
        disabled={!address || shareAmount === 0n || isPending || isConfirming}
      >
        {isPending || isConfirming ? 'Pending…' : `Zap Out → ${selectedToken.symbol}`}
      </button>
    </div>
  )
}
```

---

## Updated page tab — add Zap Out

In your vault page, add a fourth tab:

```tsx
// Add to Tab type
type Tab = 'zap' | 'deposit' | 'withdraw' | 'zapout'

// Add tab button
<button onClick={() => setTab('zapout')} data-active={tab === 'zapout'}>Zap Out</button>

// Add panel render
{tab === 'zapout' && <ZapOutPanel />}
```

---

## `setPool` — admin usage (owner only)

Only callable by the DAO/owner. Not needed in user-facing UI. Example for an admin panel:

```ts
await vault.setPool(
  '0xNewPoolAddress',
  3000   // valid values: 100, 500, 3000, 10000
)
```

Valid fee tiers accepted by `setPool`:

| Value | Fee |
|---|---|
| `100` | 0.01% |
| `500` | 0.05% |
| `3000` | 0.3% |
| `10000` | 1% |

---

## Updated `useVault` hook additions

Add `pool` and `poolFee` to the `useReadContracts` call if you want to display them:

```ts
{ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'pool'    },
{ address: VAULT_ADDRESS, abi: VAULT_ABI, functionName: 'poolFee' },
```

---

## Events to index

| Event | When to use |
|---|---|
| `ZappedOut(user, tokenOut, shares, amountOut, zapFee)` | Track single-token exits |
| `PoolUpdated(newPool, newPoolFee)` | Alert if DAO migrates to a new pool |
