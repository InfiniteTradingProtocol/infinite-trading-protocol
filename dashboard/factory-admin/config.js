// Public on-chain addresses only. Never put private keys or API keys in this file.
window.ITP_CONFIG = {
  chainId: 10,
  chainIdHex: "0xa",
  chainName: "Optimism",
  rpcUrls: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"],

  factory: "0x88E883a28C8C2f7524C7aAd0a44309E190337D5b",
  dao: "0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  velodromeVoter: "0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C",

  defaults: {
    router: "0xa062aE8A9c5e11aaA026fc2670B0D65cCc8B2858",
    feeRecipient: "0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB",
  },

  knownVaultImplementations: [
    { label: "v2.1 – killed-gauge fee compounding", address: "0x36471C8330d4F3527997CC9B379cbF862eD42944" },
    { label: "v2 – 2026-09-30 (current audit)", address: "0xaE62D9A7682C1c8ca780dCe94E53D0153bb679dd" },
    { label: "v1 – original", address: "0x65c1D7Ae1F840f288c2CCD9a5871fca6497a65f2" },
  ],

  explorer: "https://optimistic.etherscan.io",
  blockscout: "https://optimism.blockscout.com",
  safeApp: "https://app.safe.global/home?safe=oeth:",
  repo: "https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main",
  vaultSourcePath: "contracts/src/velodrome/InfiniteVaultStrategy.sol",
  auditsPath: "contracts_audits",
};
