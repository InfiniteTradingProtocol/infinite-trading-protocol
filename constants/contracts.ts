/**
 * contracts.ts
 *
 * Canonical contract registry for the Infinite Trading Protocol.
 * All addresses grouped by category and chain ID.
 *
 * Sources:
 *   - ITP deployed addresses: contracts/broadcast/ + contracts/script/
 *   - Uniswap V4 addresses: https://developers.uniswap.org/contracts/v4/deployments
 *
 * Usage:
 *   import { UNISWAP_V4, V3_COMPOUNDER_VAULTS, CHAIN_IDS } from '../../constants/contracts'
 */

// ── Chain IDs ─────────────────────────────────────────────────────────────────

export const CHAIN_IDS = {
  ETHEREUM: 1,
  OPTIMISM: 10,
  BASE:     8453,
} as const

export type ChainId = typeof CHAIN_IDS[keyof typeof CHAIN_IDS]

// ── ITP Governance / DAO ──────────────────────────────────────────────────────

/** Safe multisig — receives ownership of all vault proxies and 1.5% DAO fees */
export const DAO_SAFE = '0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB' as const

// ── SATO / StSATO (Ethereum Mainnet) ─────────────────────────────────────────

export const SATO_CONTRACTS = {
  [CHAIN_IDS.ETHEREUM]: {
    /** SATO ERC-20 governance / utility token */
    sato:   '0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09',
    /** StSATO — bonding-curve staking wrapper; rebases against SATO backing */
    stSATO: '0xdee7f7a032326148e65ec3068f1c9b29e26b75b3',
  },
} as const

// ── ITP Auto Compounder Implementations (Base) ────────────────────────────────

/** UUPS implementation contracts for UniV3AutoCompounder.  Proxies can be
 *  upgraded to a newer impl via the DAO Safe + proposeUpgradeV*.ts scripts. */
export const V3_COMPOUNDER_IMPL = {
  [CHAIN_IDS.BASE]: {
    v3:      '0x20e202c3074998b82e27161db58b255011b601cc',
    /** Current latest — deployed by DeployImplV4.s.sol */
    v4:      '0x1c0D7650E200199395b1b5AB109f7914D13D724d',
    /** Earlier implementation used for WETH/cbEGGS and ITP/cbXRP vaults */
    legacy:  '0x578621734b779162A954256cb2903632B8144D5E',
  },
} as const

// ── ITP Vault Proxies — Uniswap V3 Auto Compounders (Base) ───────────────────

/** ERC-1967 UUPS proxy vaults backed by UniV3AutoCompounder implementations.
 *  Each vault auto-compounds fees from the underlying Uniswap V3 pool. */
export const V3_COMPOUNDER_VAULTS = {
  [CHAIN_IDS.BASE]: {
    'ITP/AERO': {
      proxy:  '0xd75d5d3ef0880ff25fd66d4fdf5b461ffb97674d',
      pool:   '0x3819e346E6347d75ceF0CfFd3FF41489f543a9Cc',
      token0: '0x940181a94A35A4569E4529A3CDfB74e38FD98631', // AERO
      token1: '0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440', // ITP
      fee:    10000,
    },
    'ITP/cbEGGS': {
      proxy:  '0xa1bca9f6d9618348e7c33284082e2959a3449aa8',
      pool:   '0x750813fbFBD24310A31e9dcaE3b143C75F241344',
      token0: '0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440', // ITP
      token1: '0xdDbAbe113c376f51E5817242871879353098c296', // cbEGGS
      fee:    10000,
    },
    'ITP/cbXRP': {
      proxy:  '0x2fe57c7a0978d5ba39461572b87db41131b43646',
      pool:   '0x33840Ce3817ef3F79DA49EC70e4653c4aE20eE3F',
      token0: '0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440', // ITP
      token1: '0xcb585250f852C6c6bf90434AB21A00f02833a4af', // cbXRP
      fee:    10000,
    },
    'WETH/cbEGGS': {
      proxy:  '0xd248b1e882c4444674d83ef912713113b719f7ce',
      pool:   '0x95CB82D517A1Ce4e6ac4312BCf718cD0EE9f3884',
      token0: '0x4200000000000000000000000000000000000006', // WETH
      token1: '0xdDbAbe113c376f51E5817242871879353098c296', // cbEGGS
      fee:    10000,
    },
  },
} as const

// ── ITP Auto Compounder — Uniswap V4 (Base, not yet deployed) ────────────────

/** UniV4AutoCompounder implementation — deploy address TBD after live deploy */
export const V4_COMPOUNDER_IMPL = {
  [CHAIN_IDS.BASE]: {
    v1: null as string | null, // fill in after: forge script DeployUniV4AutoCompounder.s.sol
  },
} as const

// ── ITP Tokens ────────────────────────────────────────────────────────────────

export const TOKENS = {
  [CHAIN_IDS.ETHEREUM]: {
    SATO: '0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09',
  },
  [CHAIN_IDS.BASE]: {
    ITP:    '0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440',
    WETH:   '0x4200000000000000000000000000000000000006',
    AERO:   '0x940181a94A35A4569E4529A3CDfB74e38FD98631',
    cbEGGS: '0xdDbAbe113c376f51E5817242871879353098c296',
    cbXRP:  '0xcb585250f852C6c6bf90434AB21A00f02833a4af',
  },
} as const

// ── Uniswap V3 ────────────────────────────────────────────────────────────────

export const UNISWAP_V3 = {
  [CHAIN_IDS.BASE]: {
    positionManager: '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    /** SwapRouter02 */
    swapRouter:      '0x2626664c2603336E57B271c5C0b26F421741e481',
  },
} as const

// ── Uniswap V4 ────────────────────────────────────────────────────────────────
// Source: https://developers.uniswap.org/contracts/v4/deployments

export const UNISWAP_V4 = {
  [CHAIN_IDS.ETHEREUM]: {
    poolManager:     '0x000000000004444c5dc75cB358380D2e3dE08A90',
    positionManager: '0xbd216513d74c8cf14cf4747e6aaa6420ff64ee9e',
    universalRouter: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
    stateView:       '0x7ffe42c4a5deea5b0fec41c94c136cf115597227',
    quoter:          '0x52f0e24d1c21c8a0cb1e5a5dd6198556bd9e1203',
    permit2:         '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  [CHAIN_IDS.OPTIMISM]: {
    poolManager:     '0x9a13f98cb987694c9f086b1f5eb990eea8264ec3',
    positionManager: '0x3c3ea4b57a46241e54610e5f022e5c45859a1017',
    universalRouter: '0x851116d9223fabed8e56c0e6b8ad0c31d98b3507',
    stateView:       '0xc18a3169788f4f75a170290584eca6395c75ecdb',
    quoter:          '0x1f3131a13296fb91c90870043742c3cdbff1a8d7',
    permit2:         '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
  [CHAIN_IDS.BASE]: {
    poolManager:     '0x498581ff718922c3f8e6a244956af099b2652b2b',
    positionManager: '0x7C5f5A4bBd8fD63184577525326123B519429bDc',
    universalRouter: '0x6fF5693b99212Da76ad316178A184AB56D299b43',
    stateView:       '0xA3c0c9b65baD0b08107Aa264b0f3dB444b867A71',
    quoter:          '0x0d5e0f971ed27fbff6c2837bf31316121532048d',
    permit2:         '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
} as const

// ── Shared Infrastructure ─────────────────────────────────────────────────────

/** Canonical Permit2 address — identical on all EVM chains */
export const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const
