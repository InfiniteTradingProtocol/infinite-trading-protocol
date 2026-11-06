/**
 * velodromeManagedDeposits.mjs
 *
 * Lists the veVELO NFTs that are still deposited into a Velodrome managed veNFT
 * (Optimism), with their current owners. Read-only: uses a public RPC, no keys.
 *
 * Usage:
 *   node velodromeManagedDeposits.mjs [managedTokenId]   # default 22729
 */

import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem'
import { optimism } from 'viem/chains'

const VOTING_ESCROW = '0xFAf8FD17D9840595845582fCB047DF13f006787d'
const managedTokenId = BigInt(process.argv[2] ?? '22729')

const client = createPublicClient({ chain: optimism, transport: http('https://mainnet.optimism.io') })
const depositManaged = parseAbiItem(
  'event DepositManaged(address indexed _owner, uint256 indexed _tokenId, uint256 indexed _mTokenId, uint256 _weight, uint256 _ts)',
)
const votingEscrowAbi = parseAbi([
  'function idToManaged(uint256) view returns (uint256)',
  'function ownerOf(uint256) view returns (address)',
])

try {
  const logs = await client.getLogs({
    address: VOTING_ESCROW,
    event: depositManaged,
    args: { _mTokenId: managedTokenId },
    fromBlock: 0n,
    toBlock: 'latest',
  })
  for (const log of logs) {
    const tokenId = log.args._tokenId
    const managed = await client.readContract({
      address: VOTING_ESCROW,
      abi: votingEscrowAbi,
      functionName: 'idToManaged',
      args: [tokenId],
    })
    if (managed === managedTokenId) {
      const owner = await client.readContract({
        address: VOTING_ESCROW,
        abi: votingEscrowAbi,
        functionName: 'ownerOf',
        args: [tokenId],
      })
      console.log('still deposited', tokenId, owner)
    }
  }
  console.log('total deposit events', logs.length)
} catch (error) {
  console.error('ERR', error.shortMessage?.split('\n')[0] ?? error.message)
  process.exitCode = 1
}
