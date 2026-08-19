---
description: MetaMask reference for Infinite Trading users
---

# 🦊 MetaMask

MetaMask is a self-custody wallet used to sign transactions and interact with EVM applications.

## Role in Infinite Trading workflows

MetaMask can be used for:

- wallet connection to the application interface
- token approvals for vault interactions
- deposit and withdrawal transaction signing
- network switching across Ethereum, Optimism, Base, Arbitrum, and Polygon

## Setup checklist

1. Install MetaMask from the official source.
2. Create or import a wallet.
3. Back up seed phrase offline.
4. Add required networks.
5. Fund the wallet with native gas tokens for each network in use.

## Security baseline

- verify domain and contract details before signing
- review token allowance scope for each approval
- avoid storing seed phrase or private keys in cloud notes or chat systems
- use hardware-wallet integration for larger balances

## Practical notes

- transaction cost depends on network conditions
- bridge transfers should be confirmed before vault deposit attempts
- failed transactions generally consume gas and should be retried only after root-cause review
