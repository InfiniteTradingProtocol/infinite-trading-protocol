# Security Policy

The contracts in this repository hold user funds on mainnet. We take reports
seriously and respond quickly.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead, email
**admin@infinitetrading.io** with:

- the affected contract(s), chain and address (if deployed),
- a description of the issue and its impact,
- steps or a Foundry test that reproduces it.

We aim to acknowledge reports within 48 hours and to share a remediation plan
once the issue is confirmed. Please give us a reasonable window to fix the issue
before any public disclosure.

## Scope

- Solidity sources under [`contracts/src/`](contracts/src) and their deployed
  instances listed in the [README](README.md#deployments).
- Out of scope: mocks under `contracts/src/mock/`, third-party code under
  `contracts/lib/`, and the example scripts under `src/`.

## Reviews

Published security reviews are indexed in the [README](README.md#security-reviews).
