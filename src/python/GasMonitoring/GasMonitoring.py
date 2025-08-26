#!/usr/bin/env python3
"""
GasMonitoring.py — Check native gas balance (ETH/POL/etc.) for EVM wallets and show a USD estimate.
Supports one-off checks or reading a JSON config with multiple wallets.
Outputs can go to stdout, Discord, Telegram (or any combination).
Now supports alerting only when balance falls below a per-network USD threshold.

Quick usage:
  python GasMonitoring.py "<name>" <address> <network> --threshold polygon=50,ethereum=100
  python GasMonitoring.py --config monitors.json

Examples:
  python GasMonitoring.py "Treasury SAFE" 0xabc... polygon --threshold polygon=50
  python GasMonitoring.py --config monitors.json --threshold polygon=50,ethereum=100

Networks:
  ethereum (alias: mainnet), polygon, optimism, arbitrum, base

Environment (recommended):
  ETHERSCAN_API_KEY, POLYGONSCAN_API_KEY, OPTIMISM_ETHERSCAN_API_KEY, ARBISCAN_API_KEY, BASESCAN_API_KEY
  DISCORD_WEBHOOK_URL
  TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
  CCXT_EXCHANGE (default: kraken)
"""

from __future__ import annotations

import os
import sys
import json
import argparse
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import requests
import ccxt

SCAN_APIS: Dict[str, str] = {
    "ethereum": "https://api.etherscan.io/api",
    "mainnet":  "https://api.etherscan.io/api",
    "polygon":  "https://api.polygonscan.com/api",
    "optimism": "https://api-optimistic.etherscan.io/api",
    "arbitrum": "https://api.arbiscan.io/api",
    "base": "https://api.basescan.io/api",  
}

SCAN_API_KEYS_ENV: Dict[str, str] = {
    "ethereum": "ETHERSCAN_API_KEY",
    "mainnet":  "ETHERSCAN_API_KEY",
    "polygon":  "POLYGONSCAN_API_KEY",
    "optimism": "OPTIMISM_ETHERSCAN_API_KEY",
    "arbitrum": "ARBISCAN_API_KEY",
    "base": "BASESCAN_API_KEY",
}

DEFAULT_EXCHANGE = os.getenv("CCXT_EXCHANGE", "kraken")

@dataclass
class Monitor:
    name: str
    address: str
    network: str  # ethereum/mainnet, polygon, optimism, arbitrum

def _scan_api_balance(address: str, network: str) -> float:
    net = network.lower()
    if net not in SCAN_APIS:
        raise ValueError("Invalid network. Use: ethereum/mainnet, polygon, optimism, arbitrum, base.")
    url = SCAN_APIS[net]
    params = {"module": "account", "action": "balance", "address": address, "tag": "latest"}
    key_env = SCAN_API_KEYS_ENV.get(net)
    api_key = os.getenv(key_env) if key_env else None
    if api_key:
        params["apikey"] = api_key
    resp = requests.get(url, params=params, timeout=30)
    if resp.status_code != 200:
        raise RuntimeError(f"{net} API call failed: HTTP {resp.status_code}")
    data = resp.json()
    if "result" not in data:
        raise RuntimeError(f"Unexpected {net} API response: {data}")
    return int(data["result"]) / 10**18

def _dash_to_slash(sym: str) -> str:
    return sym.replace("-", "/")

def get_last_price(pair: str, exchange_name: str = DEFAULT_EXCHANGE) -> Optional[float]:
    symbol = _dash_to_slash(pair)
    try:
        exchange_cls = getattr(ccxt, exchange_name)
    except AttributeError:
        raise ValueError(f"Unknown CCXT exchange '{exchange_name}'.")
    exchange = exchange_cls()
    ticker = exchange.fetch_ticker(symbol)
    last = ticker.get("last")
    return float(last) if last is not None else None

def print_stdout(message: str) -> None:
    print(message)

def post_discord(message: str) -> None:
    webhook = os.getenv("DISCORD_WEBHOOK_URL")
    if not webhook:
        return
    try:
        r = requests.post(webhook, json={"content": message}, timeout=30)
        if r.status_code >= 300:
            print(f"[discord] HTTP {r.status_code}: {r.text}", file=sys.stderr)
    except Exception as e:
        print(f"[discord] exception: {e}", file=sys.stderr)

def post_telegram(message: str) -> None:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    chat_id = os.getenv("TELEGRAM_CHAT_ID")
    if not token or not chat_id:
        return
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    payload = {"chat_id": chat_id, "text": message, "disable_web_page_preview": True}
    try:
        r = requests.post(url, json=payload, timeout=30)
        if r.status_code >= 300:
            print(f"[telegram] HTTP {r.status_code}: {r.text}", file=sys.stderr)
    except Exception as e:
        print(f"[telegram] exception: {e}", file=sys.stderr)

def price_pair_for_network(network: str) -> Tuple[str, str]:
    net = network.lower()
    if net == "polygon":
        return "POL-USD", "POL"
    return "ETH-USD", "ETH"

def describe_balance(mon: Monitor, exchange_name: str = DEFAULT_EXCHANGE) -> Tuple[str, Optional[float]]:
    """
    Fetch balance and build a human-friendly single-line message.
    Returns tuple of (message, usd_value or None).
    """
    pair, unit = price_pair_for_network(mon.network)
    bal = _scan_api_balance(mon.address, mon.network)
    last = get_last_price(pair, exchange_name)
    if last is None:
        msg = (
            f"Gas balance for {mon.name} ({mon.address}) on {mon.network}: "
            f"{round(bal, 6)} {unit} (USD estimate unavailable)"
        )
        return msg, None

    usd = round(bal * last, 2)
    if unit == "POL":
        qty = round(bal, 2)
    else:
        qty = round(bal, 4)
    msg = (
        f"Gas balance for {mon.name} ({mon.address}) on {mon.network}: "
        f"{qty} {unit} (${usd})"
    )
    return msg, usd

def send_notifications(message: str, sinks: List[str]) -> None:
    normalized = {s.strip().lower() for s in sinks}
    if "stdout" in normalized:
        print_stdout(message)
    if "discord" in normalized:
        post_discord(message)
    if "telegram" in normalized:
        post_telegram(message)

def parse_threshold_arg(thresh_arg: Optional[str]) -> Dict[str, float]:
    """Parse CLI threshold arg: polygon=50,ethereum=100"""
    result: Dict[str, float] = {}
    if thresh_arg:
        for item in thresh_arg.split(","):
            if "=" in item:
                net, val = item.split("=", 1)
                try:
                    result[net.strip().lower()] = float(val.strip())
                except Exception:
                    continue
    return result

def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="Check EVM gas balances with a USD estimate; supports multiple monitors via JSON. Sends alerts only if below threshold."
    )
    p.add_argument("name", nargs="?", help="Label for the address (e.g., 'Treasury SAFE').")
    p.add_argument("address", nargs="?", help="The wallet address (0x...).")
    p.add_argument("network", nargs="?", help="ethereum/mainnet, polygon, optimism, arbitrum.")
    p.add_argument("--config", help="Path to a JSON file with monitors.", default=None)
    p.add_argument("--exchange", default=DEFAULT_EXCHANGE, help=f"CCXT exchange (default: {DEFAULT_EXCHANGE}).")
    p.add_argument(
        "--notify",
        default="stdout",
        help="Comma-separated outputs: stdout,discord,telegram (default: stdout)."
    )
    p.add_argument(
        "--threshold",
        default=None,
        help="Comma-separated per-network USD thresholds, e.g. polygon=50,ethereum=100"
    )
    return p.parse_args()

def load_monitors_from_json(path: str) -> Tuple[List[Monitor], Dict[str, float]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    monitors = [
        Monitor(name=m["name"], address=m["address"], network=m["network"])
        for m in data.get("monitors", [])
    ]
    thresholds: Dict[str, float] = {}
    # Optional: thresholds config
    if "thresholds" in data and isinstance(data["thresholds"], dict):
        for net, val in data["thresholds"].items():
            try:
                thresholds[net.strip().lower()] = float(val)
            except Exception:
                continue
    return monitors, thresholds

def should_alert(network: str, usd_value: Optional[float], thresholds: Dict[str, float]) -> bool:
    net = network.lower()
    threshold = thresholds.get(net)
    # If no threshold set, always alert
    if threshold is None or usd_value is None:
        return True
    # Alert only if balance is below threshold
    return usd_value < threshold

def main() -> None:
    args = parse_args()
    sinks = [s.strip() for s in args.notify.split(",") if s.strip()]
    exchange_name = args.exchange
    cli_thresholds = parse_threshold_arg(args.threshold)

    # Config mode (multiple monitors)
    if args.config:
        monitors, config_thresholds = load_monitors_from_json(args.config)
        if not monitors:
            print("No monitors found in config.", file=sys.stderr)
            sys.exit(1)
        # allow notify/exchange overrides via config fields (optional)
        try:
            with open(args.config, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            if "notify" in cfg and isinstance(cfg["notify"], list) and not args.notify:
                sinks = cfg["notify"]
            if "exchange" in cfg and isinstance(cfg["exchange"], str) and args.exchange == DEFAULT_EXCHANGE:
                exchange_name = cfg["exchange"]
        except Exception:
            pass  # keep CLI-provided values

        # Use CLI thresholds if provided, else config thresholds
        thresholds = cli_thresholds if cli_thresholds else config_thresholds
        for mon in monitors:
            try:
                msg, usd = describe_balance(mon, exchange_name=exchange_name)
                if should_alert(mon.network, usd, thresholds):
                    send_notifications(msg, sinks)
            except Exception as e:
                print(f"[error] {mon.name} ({mon.address}) on {mon.network}: {e}", file=sys.stderr)
        return

    # Single-target mode
    if not (args.name and args.address and args.network):
        print("Usage (single): python GasMonitoring.py \"<name>\" <address> <network> [--threshold polygon=50]", file=sys.stderr)
        print("Or (config):    python GasMonitoring.py --config monitors.json [--threshold polygon=50,ethereum=100]", file=sys.stderr)
        sys.exit(2)

    mon = Monitor(name=args.name, address=args.address, network=args.network)
    thresholds = cli_thresholds
    try:
        msg, usd = describe_balance(mon, exchange_name=exchange_name)
        if should_alert(mon.network, usd, thresholds):
            send_notifications(msg, sinks)
    except Exception as e:
        print(f"[error] {mon.name} ({mon.address}) on {mon.network}: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
