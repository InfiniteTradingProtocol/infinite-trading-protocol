# Factory admin dashboard

A static, dependency-free web console for Infinite Trading protocol administration:
vault factories, staking, treasury monitoring, deployments and Safe batch export.
It talks to public RPCs and the connected wallet only; nothing is sent to a backend.

| Module | Files |
|---|---|
| Vaults, staking, treasury, Safe batches | [index.html](index.html), [app.js](app.js), [config.js](config.js) |
| Aero auto-compounders (v1 and v2) | [aero.js](aero.js), [aero-core.js](aero-core.js), [aero.md](aero.md) |
| USD yield vault deployment | [yield-vault.js](yield-vault.js), [deployment.js](deployment.js) |
| Managed vault factory (proof of concept) | [managed-vault-factory.html](managed-vault-factory.html), [managed-vault-factory.js](managed-vault-factory.js) |
| Verified source viewer | [contract-source.html](contract-source.html), [contract-source.js](contract-source.js) |

## Run

From this folder:

```sh
python3 serve.py            # http://127.0.0.1:8765/ (override with PORT=8766)
```

`serve.py` serves the page and builds the Foundry artifacts that the deployment
tools need, so Foundry and the contract dependencies must be installed first
(see [contracts/README.md](../../contracts/README.md)). For read-only use, any
static server works:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dashboard/factory-admin
```

The dashboard reads Optimism, Base and Ethereum RPCs. Wallet transactions prompt
a network switch as needed. Safe batches are exported one network at a time from
the **Batch** tab.

## Test

```sh
node --test aero.test.cjs contract-source.test.cjs
```
