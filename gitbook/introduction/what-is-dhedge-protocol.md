# 🚀 Ecosystem Deployments: stSATO + cbEGGS

ITP has evolved from early dHEDGE-native deployment patterns into a broader product ecosystem with independent deployments and vault primitives.

## stSATO

stSATO is an ITP ecosystem deployment based on a bonding-curve liquid-staking model:

- backed by SATO mechanics
- buy/sell/borrow flows with explicit contract semantics
- no admin control after launch bootstrap sequence
- fully onchain state for transparency and integrations

**Official site:** https://stsato.org

## cbEGGS

cbEGGS is another ITP-linked deployment with token + vault-like behavior on Base, used in ecosystem products and liquidity surfaces.

It contributes ecosystem activity through:

- mint/burn user flows
- protocol TVL visibility
- LP integrations including cbEGGS-based pairs
- compatibility with ITP-aligned vault and frontend integrations

**Official site:** https://cbeggs.finance

## Contracts and token addresses

| Asset | Network | Address |
|---|---|---|
| stSATO | Ethereum | `0xe6A47B3a09aCD76d2B42268b7F6B2D65603eFAB8` |
| SATO (backing token) | Ethereum | `0x829f4B62EEBE12Af653b4dD4fFc480966F7d7f09` |
| cbEGGS | Base | `0xdDbAbe113c376f51E5817242871879353098c296` |
| ITP (Base) | Base | `0xBA8CD87120aCA631F59231f9fD6c5469BbEE3440` |
| ITP (Optimism, Staking V1 token) | Optimism | `0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0` |
| ITP (Optimism, legacy burn-history tracked token) | Optimism | `0x2aF68d8e6f0964789e3ee0e54427258B69E9B8F0` |

> Always verify addresses in the current product UI and official channels before transacting.

## How ITP can capture value around these deployments

At the ecosystem level, value accrual can come from:

1. **Vault fee surfaces** around cbEGGS-linked products (entry/compounding/performance structures where configured)
2. **Liquidity and compounding activity** in ITP-related pairs
3. **Cross-product user migration** from deployment-specific frontends into ITP vault products
4. **API and automation usage** that scales with strategy activity

For cbEGGS specifically, the practical monetization path is not just token price exposure: it is the ongoing product activity around cbEGGS pairs and vault flows that can generate repeat fee surfaces inside the ITP ecosystem.

## Legacy note on dHEDGE

dHEDGE remains part of the historical and operational context for certain manager workflows, but ITP documentation now centers on ITP-native product surfaces and deployment architecture.
