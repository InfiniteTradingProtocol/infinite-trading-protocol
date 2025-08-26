# Gas Balance Monitoring and Reporting (Discord/Telegram/Print) Tool

EVM Gas Balance with USD Estimate - A simple Python CLI that:
- Fetches an address's **native gas balance** (ETH, POL, etc.) on **Ethereum, Polygon, Optimism, Base or Arbitrum** via the relevant *scan API.
- Pulls a **live USD price** from any CCXT-supported exchange (default: Kraken).
- Outputs results to **stdout**, **Discord**, **Telegram**, or all three.
- Supports monitoring **multiple wallets/networks** from a JSON config file.
- Can be scheduled with **cron** for automated reporting.
- **NEW:** Only sends notifications when the balance (in USD) drops **below a customizable threshold** for each network.

---

## 🚨 Threshold-Based Alerts

Set a USD threshold for each network. Alerts will only be sent if the wallet’s USD value drops below the threshold.

### CLI Example

```bash
python GasMonitoring.py "<name>" <address> <network> --threshold polygon=50,ethereum=100
```

### JSON Config Example

Add `thresholds` to your JSON config:

```json
{
  "exchange": "kraken",
  "notify": ["stdout", "telegram"],
  "thresholds": {
    "polygon": 50,
    "ethereum": 100,
    "optimism": 25
  },
  "monitors": [
    { "name": "Treasury SAFE", "address": "0x0000...", "network": "polygon" },
    { "name": "Ops Wallet",    "address": "0x1111...", "network": "ethereum" },
    { "name": "L2 Router",     "address": "0x2222...", "network": "optimism" }
  ]
}
```

If a threshold is not set for a network, notifications are always sent.

---

## 🖥️ Usage (Single Wallet)

```bash
python GasMonitoring.py "<name>" <address> <network> [--exchange binance] [--notify stdout,discord,telegram] [--threshold polygon=50]
```

* `<name>`: label (e.g. `"Treasury SAFE"`)
* `<address>`: wallet address (0x…)
* `<network>`: `ethereum` (or `mainnet`), `polygon`, `optimism`, `arbitrum`, `base`
* `--exchange`: CCXT exchange (default: env `CCXT_EXCHANGE` or `kraken`)
* `--notify`: outputs (comma-separated). Options: `stdout`, `discord`, `telegram`
* `--threshold`: Comma-separated per-network USD thresholds (e.g. `polygon=50,ethereum=100`)

**Example:**  
Only alert if Polygon wallet drops below $50:

```bash
python GasMonitoring.py "Treasury SAFE" 0x0000... polygon --threshold polygon=50
```

---

## 📑 Monitoring Multiple Wallets

Add thresholds to your config JSON (see above).  
Run:

```bash
python GasMonitoring.py --config monitors.json
```

Override defaults from CLI:

```bash
python GasMonitoring.py --config monitors.json --notify discord,telegram --exchange binance --threshold polygon=50,ethereum=100
```

---

## ⏰ Scheduling with Cron

*(No change — all existing cron workflows work, now only sending alerts when threshold is breached.)*

---

## 📝 Notes

* Alerts are only sent when the balance (in USD) drops **below the threshold** for its network.
* If no threshold is set for a network, notifications are always sent.
* Thresholds can be set via CLI or JSON config (CLI overrides config).
* All other features remain unchanged.

---

## 📄 License

MIT
