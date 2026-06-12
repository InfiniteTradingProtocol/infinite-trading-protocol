/**
 * proposeUpgradeV3.ts
 *
 * Proposes a batched Safe transaction to upgrade all three UniV3AutoCompounder
 * vault proxies to a new implementation on Base mainnet.
 *
 * Usage:
 *   NEW_IMPL=0x<address> PROPOSER_PK=0x<key> npx tsx proposeUpgradeV3.ts
 *
 * Or set variables in .env and run:
 *   npx tsx proposeUpgradeV3.ts
 *
 * The PROPOSER_PK must be a signer on the Safe — it does not need to be the
 * full threshold; it only proposes + signs. Other signers confirm via Safe UI.
 */

import SafeApiKitModule from '@safe-global/api-kit'
import SafeModule from '@safe-global/protocol-kit'
import { MetaTransactionData, OperationType } from '@safe-global/types-kit'

// CJS/ESM interop: the actual classes live one level deeper
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Safe = ((SafeModule as any).default ?? SafeModule) as typeof SafeModule
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SafeApiKit = ((SafeApiKitModule as any).default ?? SafeApiKitModule) as typeof SafeApiKitModule
import { encodeFunctionData } from 'viem'

// ── Config ────────────────────────────────────────────────────────────────────

const SAFE_ADDRESS = '0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB'
const BASE_CHAIN_ID = BigInt(8453)
const BASE_RPC_URL = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org'
const PROPOSER_PK = process.env.PROPOSER_PK ?? process.env.DEPLOYER_PRIVATE_KEY ?? ''
const NEW_IMPL = process.env.NEW_IMPL ?? ''

// All three live vault proxies on Base
const PROXIES: { name: string; address: `0x${string}` }[] = [
    { name: 'ITP/USDC', address: '0xF0E3305E81744e4dFa2d01c0A145814357a89018' },
    { name: 'cbEGGS/WETH', address: '0xD248B1e882c4444674D83eF912713113B719f7Ce' },
    { name: 'ITP/cbXRP', address: '0x2fe57c7a0978d5bA39461572b87db41131b43646' },
]

// ── ABI fragment for UUPS upgradeToAndCall ────────────────────────────────────

const UPGRADE_ABI = [{
    name: 'upgradeToAndCall',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
        { name: 'newImplementation', type: 'address' },
        { name: 'data', type: 'bytes' },
    ],
    outputs: [],
}] as const

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    if (!PROPOSER_PK) throw new Error('Set PROPOSER_PK or DEPLOYER_PRIVATE_KEY env var')
    if (!NEW_IMPL) throw new Error('Set NEW_IMPL env var to the deployed v3 implementation address')

    const newImpl = NEW_IMPL as `0x${string}`
    console.log(`Safe:     ${SAFE_ADDRESS}`)
    console.log(`New impl: ${newImpl}`)
    console.log(`Chain:    Base mainnet (${BASE_CHAIN_ID})\n`)

    // Initialise Safe SDK
    const pk = PROPOSER_PK.startsWith('0x') ? PROPOSER_PK : `0x${PROPOSER_PK}`
    const protocolKit = await Safe.init({
        provider: BASE_RPC_URL,
        signer: pk,
        safeAddress: SAFE_ADDRESS,
    })

    // Initialise Safe API Kit (Base mainnet)
    const apiKit = new SafeApiKit({ chainId: BASE_CHAIN_ID })

    // Build one MetaTransaction per proxy
    const transactions: MetaTransactionData[] = PROXIES.map(proxy => ({
        to: proxy.address,
        value: '0',
        data: encodeFunctionData({
            abi: UPGRADE_ABI,
            functionName: 'upgradeToAndCall',
            args: [newImpl, '0x'],
        }),
        operation: OperationType.Call,
    }))

    console.log(`Batching ${transactions.length} upgrade calls into one Safe transaction...`)
    for (const { name, address } of PROXIES) {
        console.log(`  → ${name.padEnd(12)} ${address}`)
    }

    // onlyCalls=true forces MultiSendCallOnly (no delegatecall), removing the
    // "Unexpected delegate call" warning in the Safe UI.
    const safeTx = await protocolKit.createTransaction({ transactions, onlyCalls: true })

    // Sign with the proposer key
    const signerAddress = (await protocolKit.getSafeProvider().getSignerAddress())!
    const safeTxHash = await protocolKit.getTransactionHash(safeTx)
    const signature = await protocolKit.signHash(safeTxHash)

    // Propose to the Safe Transaction Service
    await apiKit.proposeTransaction({
        safeAddress: SAFE_ADDRESS,
        safeTransactionData: safeTx.data,
        safeTxHash,
        senderAddress: signerAddress,
        senderSignature: signature.data,
    })

    console.log(`\nProposed! Safe tx hash: ${safeTxHash}`)
    console.log(`Review and confirm at: https://app.safe.global/transactions/queue?safe=base:${SAFE_ADDRESS}`)
}

main().catch(err => {
    console.error(err)
    process.exit(1)
})
