````markdown
# Gas Tank — EVM Gas Balance with USD Estimate (stdout / Discord / Telegram)

A simple Python CLI that:
- Fetches an address's **native gas balance** (ETH, MATIC, etc.) on **Ethereum, Polygon, Optimism, or Arbitrum** via the relevant *scan API.
- Pulls a **live USD price** from any CCXT-supported exchange (default: Kraken).
- Outputs results to **stdout**, **Discord**, **Telegram**, or all three.
- Supports monitoring **multiple wallets/networks** from a JSON config file.
- Can be scheduled with **cron** for automated reporting.

---

## 🚀 Features
- ✅ Minimal dependencies (`requests`, `ccxt`).
- ✅ Supports `ethereum`, `mainnet`, `polygon`, `optimism`, `arbitrum`.
- ✅ Automatic unit selection (`ETH` or `MATIC`).
- ✅ Configurable outputs: console, Discord, Telegram.
- ✅ Easy cron integration for multiple wallets.

---

## 📦 Requirements
- Python **3.9+**
- A *scan API key* (Etherscan, Polygonscan, etc.) is **recommended** to avoid rate limits.
- Network access to:
  - Etherscan / Polygonscan / OptimismScan / Arbiscan
  - Your chosen CCXT exchange (Kraken, Coinbase, Binance, etc.)

---

## 🔧 Installation

```bash
# Clone the repo
git clone https://github.com/your-username/gas-tank.git
cd gas-tank

# (Recommended) create a virtual environment
python -m venv .venv
source .venv/bin/activate   # Linux/Mac
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install --upgrade pip
pip install requests ccxt
````

---

## ⚙️ Environment Variables

Set these in your shell or `.env` file:

```bash
# CCXT exchange for price lookup (default: kraken)
export CCXT_EXCHANGE=kraken

# *Scan API keys
export ETHERSCAN_API_KEY=...
export POLYGONSCAN_API_KEY=...
export OPTIMISM_ETHERSCAN_API_KEY=...
export ARBISCAN_API_KEY=...

# Discord (optional)
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Telegram (optional)
export TELEGRAM_BOT_TOKEN="123456:AA..."
export TELEGRAM_CHAT_ID="123456789"      # your chat or channel id
```

---

## 🖥️ Usage (Single Wallet)

```bash
python gas_tank.py "<name>" <address> <network> [--exchange binance] [--notify stdout,discord,telegram]
```

* `<name>`: label (e.g. `"Treasury SAFE"`)
* `<address>`: wallet address (0x…)
* `<network>`: `ethereum` (or `mainnet`), `polygon`, `optimism`, `arbitrum`
* `--exchange`: CCXT exchange (default: env `CCXT_EXCHANGE` or `kraken`)
* `--notify`: outputs (comma-separated). Options: `stdout`, `discord`, `telegram`

**Examples**

```bash
# stdout only
python gas_tank.py "Treasury SAFE" 0x0000... polygon

# to Discord
python gas_tank.py "Ops Wallet" 0x0000... ethereum --notify discord

# to Telegram
python gas_tank.py "Ops Wallet" 0x0000... optimism --notify telegram

# stdout + both messengers
python gas_tank.py "Ops Wallet" 0x0000... arbitrum --notify stdout,discord,telegram
```

**Sample Output**

```
Gas balance for Treasury SAFE (0x...) on polygon: 123.45 MATIC ($76.54)
```

---

## 📑 Monitoring Multiple Wallets

Create a `monitors.json`:

```json
{
  "exchange": "kraken",
  "notify": ["stdout", "telegram"],
  "monitors": [
    { "name": "Treasury SAFE", "address": "0x0000...", "network": "polygon" },
    { "name": "Ops Wallet",    "address": "0x1111...", "network": "ethereum" },
    { "name": "L2 Router",     "address": "0x2222...", "network": "optimism" }
  ]
}
```

Run it:

```bash
python gas_tank.py --config monitors.json
```

Override defaults from CLI:

```bash
python gas_tank.py --config monitors.json --notify discord,telegram --exchange binance
```

---

## ⏰ Scheduling with Cron

Create a `logs/` directory (optional):

```bash
mkdir -p logs
```

Edit crontab:

```bash
crontab -e
```

### Examples:

**Every 15 minutes (stdout + Telegram)**:

```cron
*/15 * * * * /usr/bin/env bash -lc 'cd /path/to/project && source .venv/bin/activate && python gas_tank.py --config monitors.json --notify stdout,telegram >> logs/gas_tank.log 2>&1'
```

**Hourly (Discord only)**:

```cron
0 * * * * /usr/bin/env bash -lc 'cd /path/to/project && source .venv/bin/activate && python gas_tank.py --config monitors.json --notify discord >> logs/gas_tank.log 2>&1'
```

**Weekdays at 9:00 (Coinbase exchange)**:

```cron
0 9 * * 1-5 /usr/bin/env bash -lc 'cd /path/to/project && source .venv/bin/activate && CCXT_EXCHANGE=coinbase python gas_tank.py --config monitors.json >> logs/gas_tank.log 2>&1'
```

If using a `.env` file:

```cron
*/10 * * * * /usr/bin/env bash -lc 'cd /path/to/project && source .venv/bin/activate && source .env && python gas_tank.py --config monitors.json >> logs/gas_tank.log 2>&1'
```

---

## 📝 Notes

* *Scan APIs return balances in 18-decimal units; this script converts to whole tokens.*
* Polygon uses **MATIC** pricing; others use **ETH**.
* If price fetch fails, balance still prints with “USD estimate unavailable”.
* For Telegram: ensure bot is added to group/channel with permission to post.
* For Discord: create a channel webhook and set `DISCORD_WEBHOOK_URL`.

---

## 📄 License

MIT

```

---

Would you like me to also give you a **ready-made `monitors.json` file** alongside this so you can commit it to the repo as an example?
```
