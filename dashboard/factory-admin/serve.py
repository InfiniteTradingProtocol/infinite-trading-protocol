#!/usr/bin/env python3
"""Serve the dashboard and only the compiled artifacts needed for deployments."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from shutil import which
from urllib.parse import urlsplit
import os
import subprocess
import sys


DASHBOARD = Path(__file__).resolve().parent
ROOT = DASHBOARD.parents[1]
CONTRACTS = ROOT / "contracts"
ARTIFACTS = {
    "/artifacts/v3.json": CONTRACTS / "out/UniV3AutoCompounder.sol/UniV3AutoCompounder.json",
    "/artifacts/v4.json": CONTRACTS / "out/UniV4AutoCompounder.sol/UniV4AutoCompounder.json",
    "/artifacts/proxy.json": CONTRACTS / "out/ERC1967Proxy.sol/ERC1967Proxy.json",
}


def build_artifacts():
    forge = which("forge") or str(Path.home() / ".foundry/bin/forge")
    if not Path(forge).is_file():
        raise RuntimeError("Foundry forge was not found. Install Foundry before using deployment tools.")
    subprocess.run(
        [
            forge,
            "build",
            "--evm-version",
            "cancun",
            "src/UniV3AutoCompounder.sol",
            "src/UniV4AutoCompounder.sol",
            "node_modules/@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol",
        ],
        cwd=CONTRACTS,
        check=True,
    )
    missing = [str(path) for path in ARTIFACTS.values() if not path.is_file()]
    if missing:
        raise RuntimeError("Forge did not create expected deployment artifacts: " + ", ".join(missing))


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DASHBOARD), **kwargs)

    def translate_path(self, path):
        route = urlsplit(path).path
        if route in ARTIFACTS:
            return str(ARTIFACTS[route])
        return super().translate_path(route)


def main():
    try:
        build_artifacts()
    except (OSError, subprocess.CalledProcessError, RuntimeError) as error:
        print(f"Artifact build failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error
    port = int(os.environ.get("PORT", "8765"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Dashboard ready at http://127.0.0.1:{port}/")
    server.serve_forever()


if __name__ == "__main__":
    main()