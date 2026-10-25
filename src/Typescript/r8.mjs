import { createPublicClient, http, parseAbi, parseAbiItem } from 'viem';
import { optimism } from 'viem/chains';
const c = createPublicClient({ chain: optimism, transport: http('https://mainnet.optimism.io') });
const VE='0xFAf8FD17D9840595845582fCB047DF13f006787d';
const ev = parseAbiItem('event DepositManaged(address indexed _owner, uint256 indexed _tokenId, uint256 indexed _mTokenId, uint256 _weight, uint256 _ts)');
try {
  const logs = await c.getLogs({address:VE, event:ev, args:{_mTokenId:22729n}, fromBlock:0n, toBlock:'latest'});
  const veA = parseAbi(['function idToManaged(uint256) view returns (uint256)','function ownerOf(uint256) view returns (address)']);
  for (const l of logs) { const id=l.args._tokenId; const m = await c.readContract({address:VE,abi:veA,functionName:'idToManaged',args:[id]}); if (m===22729n) console.log('still deposited', id, await c.readContract({address:VE,abi:veA,functionName:'ownerOf',args:[id]})); }
  console.log('total deposit events', logs.length);
} catch(e) { console.log('ERR', e.shortMessage?.split('\n')[0]); }
