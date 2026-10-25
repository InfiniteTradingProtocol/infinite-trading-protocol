#!/usr/bin/env node
/*
 * Deploy Aero v2 (AeroTwapOracle, AeroFactoryV2 + vault implementation, AeroZapV2) and/or create vaults, then
 * write one DAO Safe batch. DRY-RUN BY DEFAULT; pass --execute to send.
 *
 *   ENV_FILE=<path to .env> ARTIFACTS=<out-aero dir> NODE_PATH=<dir with ethers@5 + dotenv> CHAIN=optimism|base \
 *   AERO_DAO=0x.. AERO_TREASURY=0x.. VAULTS=itp-usdc,itp-wbtc [FACTORY=0x.. ORACLE=0x.. ZAP=0x..] \
 *   [EXISTING=itp-wsteth=0x..] node deploy-aero-v2.cjs [--execute]
 *
 * Without FACTORY the core is deployed first. VAULTS are created from the per-chain table below; EXISTING vaults
 * are only added to the Safe batch (approve route pools, acceptOwnership, setRewardRoute, setGauge + setStaking,
 * setOfficial). The signer key is read from PRIVATE_KEY inside this process and never printed; RPC_URL (or an
 * ALCHEMY_API_KEY-derived URL) is never printed either, only its host. Optional: TIP_GWEI (0.001), MAX_ETH
 * (0.0005), OUT (dir). Fees: type 2, maxFee = 2*base + tip, gasLimit = estimate * 1.2, explicit nonces, each tx
 * signed once and the same raw tx rebroadcast on RPC errors. Any revert stops the run.
 */
const fs = require("fs");
const path = require("path");
if (process.env.ENV_FILE) require("dotenv").config({ path: process.env.ENV_FILE });
const { ethers } = require("ethers");

const EXECUTE = process.argv.includes("--execute");
const CHAIN = process.env.CHAIN || "optimism";
const SHARED = {
  stableFactory: "0x78589E876edcEbdce72ee3436ab3c9AD3a7cEF2D",
  volatileFactory: "0x8E6a9FCd1d638CC760Ffba397605Fe3355dE76D2",
  voter: "0x382409fad8503FbCdbB27A4211551fa03e884078",
};
// Per-chain Aero addresses (app.aero.xyz/docs/security) and the vaults this script knows how to create.
const CHAINS = {
  optimism: {
    chainId: 10,
    alchemy: "opt-mainnet",
    stableGaugeFactory: "0x3924b18EDd37267dab6eDd99a3Bb339bf2b668fD",
    volatileGaugeFactory: "0x1B5D13975371806D699dC616A96D15B8eD26e5Ca",
    reward: "0xbdEaeA5205d16f34Cb40038052d91235D87B4C54", // xAERO
    vaults: {
      "itp-wsteth": { pool: "0x76817cf226aa94b164295AED4f62e7a1EEd41d36", name: "Infinite Aero ITP/wstETH", symbol: "acITP-wstETH",
        route: ["0x686c9942020a80EE853EaEF7663A266ae7991965", "0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01"] },
      "itp-usdc": { pool: "0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01", name: "Infinite Aero ITP/USDC", symbol: "acITP-USDC",
        route: ["0x686c9942020a80EE853EaEF7663A266ae7991965"] },
      "itp-wbtc": { pool: "0x96E354C66e56c6083064d30FCE5FeD009C3a6651", name: "Infinite Aero ITP/WBTC", symbol: "acITP-WBTC",
        route: ["0x686c9942020a80EE853EaEF7663A266ae7991965", "0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01"] },
    },
  },
  base: {
    chainId: 8453,
    alchemy: "base-mainnet",
    stableGaugeFactory: "0x1e0f776E88649285f99e65Fa599aD6e0f9D97800",
    volatileGaugeFactory: "0x9FBCf2Df0DC553ce40Ef63963Bff465b76792B7E",
    reward: "0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee", // AERO (a pool token here: no route)
    vaults: {
      "aero-usdc": { pool: "0xF634058dC94e6BF8e828E27621320C423bC8B18E", name: "Infinite Aero AERO/USDC", symbol: "acAERO-USDC",
        route: [], gauge: "0xd424BA8ca9d4E278753DE76651a0095451e65cD1" },
    },
  },
};
const NET = CHAINS[CHAIN];
if (!NET) throw new Error(`CHAIN must be one of ${Object.keys(CHAINS).join(", ")}`);
const CHAIN_ID = NET.chainId;
const GAS_PRICE_ORACLE = "0x420000000000000000000000000000000000000F";

function artifact(name) {
  const dir = process.env.ARTIFACTS || path.join(__dirname, "../../../out-aero");
  const a = JSON.parse(fs.readFileSync(path.join(dir, `${name}.sol`, `${name}.json`), "utf8"));
  return { abi: a.abi, bytecode: a.bytecode.object || a.bytecode };
}

function rpcUrl() {
  if (process.env.RPC_URL) return process.env.RPC_URL;
  if (process.env.ALCHEMY_API_KEY) return `https://${NET.alchemy}.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  throw new Error("RPC_URL or ALCHEMY_API_KEY missing");
}

async function main() {
  const url = rpcUrl();
  const provider = new ethers.providers.StaticJsonRpcProvider(url, CHAIN_ID);
  const key = process.env.PRIVATE_KEY || "";
  if (!key) throw new Error("PRIVATE_KEY missing");
  const wallet = new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
  const dao = ethers.utils.getAddress(process.env.AERO_DAO || "");
  const treasury = ethers.utils.getAddress(process.env.AERO_TREASURY || "");
  if ((await provider.getCode(dao)) === "0x" || (await provider.getCode(treasury)) === "0x") {
    throw new Error("DAO/treasury must be deployed Safes on Optimism");
  }
  const tip = ethers.utils.parseUnits(process.env.TIP_GWEI || "0.001", "gwei");
  const maxEth = ethers.utils.parseEther(process.env.MAX_ETH || "0.0005");
  const [balance, latestNonce, pendingNonce, block] = await Promise.all([
    wallet.getBalance(),
    wallet.getTransactionCount("latest"),
    wallet.getTransactionCount("pending"),
    provider.getBlock("latest"),
  ]);
  if (latestNonce !== pendingNonce) throw new Error(`stuck tx: latest nonce ${latestNonce} != pending ${pendingNonce}`);
  const maxFee = block.baseFeePerGas.mul(2).add(tip);
  console.log(`rpc host ${new URL(url).host} chain ${CHAIN_ID} mode ${EXECUTE ? "EXECUTE" : "dry-run"}`);
  console.log(`signer ${wallet.address} balance ${ethers.utils.formatEther(balance)} ETH nonce ${latestNonce}`);
  console.log(`baseFee ${ethers.utils.formatUnits(block.baseFeePerGas, "gwei")} gwei tip ${ethers.utils.formatUnits(tip, "gwei")} maxFee ${ethers.utils.formatUnits(maxFee, "gwei")} gwei`);

  const O = artifact("AeroTwapOracle");
  const F = artifact("AeroFactoryV2");
  const Z = artifact("AeroZapV2");
  const V = artifact("AeroVaultV2");
  const oracleI = new ethers.utils.Interface(O.abi);
  const factoryI = new ethers.utils.Interface(F.abi);
  const zapF = new ethers.ContractFactory(Z.abi, Z.bytecode);
  const vaultI = new ethers.utils.Interface(V.abi);
  const gpo = new ethers.Contract(GAS_PRICE_ORACLE, ["function getL1Fee(bytes) view returns (uint256)"], provider);

  // Existing core (FACTORY/ORACLE/ZAP) is reused when given; otherwise it is deployed first.
  const reuse = Boolean(process.env.FACTORY);
  let n = 0;
  const at = () => ethers.utils.getContractAddress({ from: wallet.address, nonce: latestNonce + n++ });
  const oracle = reuse ? ethers.utils.getAddress(process.env.ORACLE) : at();
  const factory = reuse ? ethers.utils.getAddress(process.env.FACTORY) : at();
  const zap = reuse ? ethers.utils.getAddress(process.env.ZAP) : at();
  const create = (process.env.VAULTS || "").split(",").filter(Boolean);
  const existing = Object.fromEntries((process.env.EXISTING || "").split(",").filter(Boolean).map((kv) => kv.split("=")));
  for (const k of [...create, ...Object.keys(existing)]) if (!NET.vaults[k]) throw new Error(`unknown vault key ${k}`);
  const factoryArgs = [
    dao, treasury, SHARED.stableFactory, SHARED.volatileFactory, NET.stableGaugeFactory,
    NET.volatileGaugeFactory, SHARED.voter, NET.reward, oracle, wallet.address,
  ];
  // Gas from forge simulations / earlier receipts, used only to bound the dry-run cost; execute re-estimates.
  const steps = [];
  if (!reuse) {
    steps.push({ name: "deploy AeroTwapOracle", data: O.bytecode, simGas: 577244 });
    steps.push({ name: "deploy AeroFactoryV2", simGas: 7835462,
      data: new ethers.ContractFactory(F.abi, F.bytecode).getDeployTransaction(...factoryArgs).data });
    steps.push({ name: "deploy AeroZapV2", data: zapF.getDeployTransaction(factory).data, simGas: 1322245 });
  }
  for (const k of create) {
    const v = NET.vaults[k];
    steps.push({ name: `createVault ${k}`, key: k, kind: "create", to: factory, simGas: 548884,
      data: factoryI.encodeFunctionData("createVault", [v.pool, ethers.constants.AddressZero, 0, v.name, v.symbol]) });
    steps.push({ name: `oracle.update ${k}`, to: oracle, simGas: 209878,
      data: oracleI.encodeFunctionData("updateMany", [[v.pool, ...v.route]]) });
    steps.push({ name: `transferOwnership ${k}`, key: k, kind: "owner", simGas: 71641, data: null });
  }

  let worst = ethers.BigNumber.from(0);
  for (const s of steps) {
    s.l1 = s.data && CHAIN_ID ? await gpo.getL1Fee(s.data).catch(() => ethers.BigNumber.from(0)) : ethers.BigNumber.from(0);
    worst = worst.add(ethers.BigNumber.from(s.simGas).mul(12).div(10).mul(maxFee)).add(s.l1);
  }
  console.log(`chain ${CHAIN}: oracle ${oracle} factory ${factory} zap ${zap} (${reuse ? "existing" : "new"})`);
  steps.forEach((s, i) => console.log(`  ${i + 1}. ${s.name} simGas ${s.simGas} l1Fee ${ethers.utils.formatEther(s.l1)} ETH`));
  console.log(`worst case ${ethers.utils.formatEther(worst)} ETH (cap ${ethers.utils.formatEther(maxEth)})`);
  if (worst.gt(maxEth)) throw new Error("worst case above MAX_ETH");
  if (worst.gt(balance)) throw new Error("balance below worst case");
  if (!EXECUTE) {
    console.log("dry-run only: nothing signed. Re-run with --execute to send.");
    return;
  }

  const out = { chain: CHAIN, chainId: CHAIN_ID, signer: wallet.address, oracle, factory, zap, vaults: { ...existing }, txs: [] };
  let nonce = latestNonce;
  const send = async (s) => {
    const req = { chainId: CHAIN_ID, type: 2, nonce, to: s.to || undefined, data: s.data, value: 0,
      maxPriorityFeePerGas: tip, maxFeePerGas: maxFee };
    const est = await provider.estimateGas({ ...req, from: wallet.address });
    req.gasLimit = est.mul(12).div(10);
    const raw = await wallet.signTransaction(req);
    const hash = ethers.utils.keccak256(raw);
    for (let attempt = 0; ; attempt++) {
      try {
        await provider.sendTransaction(raw);
        break;
      } catch (e) {
        if (/already known|nonce too low|known transaction/i.test(String(e.message))) break;
        if (attempt >= 2) throw e;
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
    const rc = await provider.waitForTransaction(hash, 1, 180_000);
    const fee = rc.gasUsed.mul(rc.effectiveGasPrice).add(s.l1 || 0);
    console.log(`  ${s.name}: ${hash} status ${rc.status} gasUsed ${rc.gasUsed} fee ${ethers.utils.formatEther(fee)} ETH`);
    out.txs.push({ step: s.name, hash, status: rc.status, gasUsed: rc.gasUsed.toString(), feeWei: fee.toString() });
    if (rc.status !== 1) throw new Error(`${s.name} reverted; stop and inspect before anything else`);
    nonce++;
    return rc;
  };
  for (const s of steps) {
    if (s.kind === "owner") {
      await send({ ...s, to: out.vaults[s.key], data: vaultI.encodeFunctionData("transferOwnership", [dao]) });
      continue;
    }
    const rc = await send(s);
    if (s.kind === "create") {
      const ev = rc.logs.map((l) => { try { return factoryI.parseLog(l); } catch { return null; } })
        .find((l) => l && l.name === "VaultCreated");
      out.vaults[s.key] = ev.args.vault;
    }
  }
  if (!reuse) out.implementation = await new ethers.Contract(factory, F.abi, provider).implementation();

  // One DAO Safe batch (Safe Transaction Builder format) for every vault in this run, in dependency order.
  const tx = (to, data) => ({ to, value: "0", data, contractMethod: null, contractInputsValues: null });
  const keys = Object.keys(out.vaults);
  const pools = [...new Set(keys.flatMap((k) => NET.vaults[k].route))];
  const txs = pools.map((p) => tx(factory, factoryI.encodeFunctionData("setApprovedPool", [p, true])));
  for (const k of keys) {
    const v = NET.vaults[k];
    const addr = out.vaults[k];
    txs.push(tx(addr, vaultI.encodeFunctionData("acceptOwnership", [])));
    if (v.route.length) txs.push(tx(addr, vaultI.encodeFunctionData("setRewardRoute", [v.route])));
    if (v.gauge) {
      txs.push(tx(addr, vaultI.encodeFunctionData("setGauge", [v.gauge])));
      txs.push(tx(addr, vaultI.encodeFunctionData("setStaking", [true])));
    }
    txs.push(tx(factory, factoryI.encodeFunctionData("setOfficial", [addr, true])));
  }
  const batch = {
    version: "1.0", chainId: String(CHAIN_ID), createdAt: Date.now(),
    meta: { name: `Aero v2 ${CHAIN} setup`, description: `vaults: ${keys.join(", ")}`, createdFromSafeAddress: dao },
    transactions: txs,
  };
  const dir = process.env.OUT || process.cwd();
  fs.writeFileSync(path.join(dir, `aero-v2-${CHAIN}-deployment.json`), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(dir, `aero-v2-${CHAIN}-safe-batch.json`), JSON.stringify(batch, null, 2));
  const total = out.txs.reduce((acc, t) => acc.add(t.feeWei), ethers.BigNumber.from(0));
  console.log(`done. vaults ${JSON.stringify(out.vaults)}`);
  console.log(`total fee ${ethers.utils.formatEther(total)} ETH; wrote aero-v2-${CHAIN}-deployment.json and aero-v2-${CHAIN}-safe-batch.json`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
