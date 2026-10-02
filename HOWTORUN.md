# How to Run

## Infinite Trading Administration Dashboard

The dashboard is a static page; it does not have an npm build or dev-server script. From the repository root, start a local server with Python 3:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dashboard/factory-admin
```

Open <http://127.0.0.1:8765/> in your browser. Keep the terminal running while you use the dashboard, and press `Ctrl+C` to stop the server. If port 8765 is already in use, change the port in the command and URL (for example, use 8766).

The dashboard reads Optimism, Base, and Ethereum RPCs. Wallet transactions prompt a network switch as needed. Safe batches are exported one network at a time using the Network selector in the Batch tab. Staking V1 and Uniswap V3 compounders have management controls; cbEGGS is currently registered as a Base token for supply and vault-balance monitoring.