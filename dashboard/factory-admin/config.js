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
    42161: {
      chainId: 42161,
      chainIdHex: "0xa4b1",
      chainName: "Arbitrum",
      rpcUrls: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"],
      explorer: "https://arbiscan.io",
      safeNetwork: "arb1",
    },
    137: {
      chainId: 137,
      chainIdHex: "0x89",
      chainName: "Polygon",
      nativeSymbol: "POL",
      rpcUrls: ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com"],
      explorer: "https://polygonscan.com",
      safeNetwork: "matic",
    },
  },

  // DAO Safe treasury scan: Blockscout inventory + dHEDGE PoolFactory (getDeployedFunds) per network.
  // knownTokens / knownNfts are always balance-checked on-chain so the scan still works if Blockscout is down.
  safeTreasury: {
    1: {
      blockscout: "https://eth.blockscout.com",
      dhedgeFactory: "0x96d33bcf84dde326014248e2896f79bbb9c13d6d",
      knownTokens: ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0xdAC17F958D2ee523a2206206994597C13D831ec7", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "0x6B175474E89094C44Da98b954EedeAC495271d0F", "0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09", "0xdee7f7a032326148e65ec3068f1c9b29e26b75b3"],
      knownNfts: [{ address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", enumerate: "erc721" }],
    },
    8453: {
      blockscout: "https://base.blockscout.com",
      dhedgeFactory: "0x49Afe3abCf66CF09Fab86cb1139D8811C8afe56F",
      knownTokens: ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "0x4200000000000000000000000000000000000006", "0x940181a94A35A4569E4529A3CDfB74e38FD98631", "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf", "0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440", "0xdDbAbe113c376f51E5817242871879353098c296", "0xcb585250f852C6c6bf90434AB21A00f02833a4af"],
      knownNfts: [{ address: "0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1", enumerate: "erc721" }, { address: "0xeBf418Fe2512e7E6bd9b87a8F0f294aCDC67e6B4", enumerate: "veNFT" }],
    },
    42161: {
      blockscout: "https://arbitrum.blockscout.com",
      dhedgeFactory: "0xffFb5fB14606EB3a548C113026355020dDF27535",
      knownTokens: ["0xaf88d065e77c8cC2239327C5EDb3A432268e5831", "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "0x912CE59144191C1204E64559FE8253a0e49E6548", "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"],
      knownNfts: [{ address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", enumerate: "erc721" }],
    },
    137: {
      blockscout: "https://polygon.blockscout.com",
      dhedgeFactory: "0xfdc7b8bFe0DD3513Cc669bB8d601Cb83e2F69cB0",
      knownTokens: ["0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"],
      knownNfts: [{ address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", enumerate: "erc721" }],
    },
    10: {
      blockscout: "https://optimism.blockscout.com",
      dhedgeFactory: "0x5e61a079A178f0E5784107a4963baAe0c5a680c6",
      knownTokens: ["0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", "0x4200000000000000000000000000000000000006", "0x4200000000000000000000000000000000000042", "0x9560e827aF36c94D2Ac33a39bCE1Fe78631088Db", "0x68f180fcCe6836688e9084f035309E29Bf0A2095", "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb", "0xAF9fE3B5cCDAe78188B1F8b9a49Da7ae9510F151", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", "0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0"],
      knownNfts: [{ address: "0xC36442b4a4522E871399CD717aBDD847Ab11FE88", enumerate: "erc721" }, { address: "0xFAf8FD17D9840595845582fCB047DF13f006787d", enumerate: "veNFT" }],
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
