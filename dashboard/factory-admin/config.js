// Public on-chain addresses only. Never put private keys or API keys in this file.
window.ITP_CONFIG = {
  chainId: 10,
  chainIdHex: "0xa",
  chainName: "Optimism",
  rpcUrls: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"],

  networks: {
    1: {
      chainId: 1,
      chainIdHex: "0x1",
      chainName: "Ethereum",
      rpcUrls: ["https://ethereum-rpc.publicnode.com", "https://cloudflare-eth.com"],
      explorer: "https://etherscan.io",
      safeNetwork: "eth",
    },
    10: {
      chainId: 10,
      chainIdHex: "0xa",
      chainName: "Optimism",
      rpcUrls: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"],
      explorer: "https://optimistic.etherscan.io",
      safeNetwork: "oeth",
    },
    8453: {
      chainId: 8453,
      chainIdHex: "0x2105",
      chainName: "Base",
      rpcUrls: ["https://base-rpc.publicnode.com", "https://mainnet.base.org"],
      explorer: "https://basescan.org",
      safeNetwork: "base",
    },
  },

  factory: "0x88E883a28C8C2f7524C7aAd0a44309E190337D5b",
  dao: "0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB",
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11",
  velodromeVoter: "0x41C914ee0c7E1A5edCD0295623e6dC557B5aBf3C",
  staking: "0x23371aEEaF8718955C93aEC726b3CAFC772B9E37",

  tokens: {
    itpOptimism: "0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0",
    satoEthereum: "0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09",
    stSatoEthereum: "0xdee7f7a032326148e65ec3068f1c9b29e26b75b3",
    itpBase: "0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440",
    wethBase: "0x4200000000000000000000000000000000000006",
    aeroBase: "0x940181a94A35A4569E4529A3CDfB74e38FD98631",
    cbEggsBase: "0xdDbAbe113c376f51E5817242871879353098c296",
    cbXrpBase: "0xcb585250f852C6c6bf90434AB21A00f02833a4af",
  },

  v3Compounders: [
    { name: "ITP / USDC", address: "0xf0e3305e81744e4dfa2d01c0a145814357a89018", token0: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", token1: "0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440", chainId: 8453 },
    { name: "ITP / AERO", address: "0xd75d5d3ef0880ff25fd66d4fdf5b461ffb97674d", token0: "0x940181a94A35A4569E4529A3CDfB74e38FD98631", token1: "0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440", chainId: 8453 },
    { name: "ITP / cbEGGS", address: "0xa1bca9f6d9618348e7c33284082e2959a3449aa8", token0: "0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440", token1: "0xdDbAbe113c376f51E5817242871879353098c296", chainId: 8453 },
    { name: "ITP / cbXRP", address: "0x2fe57c7a0978d5ba39461572b87db41131b43646", token0: "0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440", token1: "0xcb585250f852C6c6bf90434AB21A00f02833a4af", chainId: 8453 },
    { name: "WETH / cbEGGS", address: "0xd248b1e882c4444674d83ef912713113b719f7ce", token0: "0x4200000000000000000000000000000000000006", token1: "0xdDbAbe113c376f51E5817242871879353098c296", chainId: 8453 },
  ],

  stsato: "0xdee7f7a032326148e65ec3068f1c9b29e26b75b3",
  sato: "0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09",

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
