#!/usr/bin/env node
// Deploys an Aero classic-pool auto-compounder: AeroFactory (one per chain), AeroVault (via factory), AeroZap,
// then starts the vault ownership transfer to the DAO Safe and writes a Safe Transaction Builder batch
// (factory.setDaoFees(1000, 1000) + vault.acceptOwnership()).
//
// Usage (ethers v5; never echo the key):
//   PRESET=base-aero-usdc NODE_PATH=<dir>/node_modules RPC_URL=... PRIVATE_KEY=... ARTIFACTS=<out-aero> \
//     node deploy-aero.cjs [--send]
// Reuse/resume with FACTORY=0x... VAULT=0x... ZAP=0x... Without --send it only prints pre-flight checks.
const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

const SAFE = "0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB";
const AERO = {
  stableFactory: "0x78589E876edcEbdce72ee3436ab3c9AD3a7cEF2D",
  volatileFactory: "0x8E6a9FCd1d638CC760Ffba397605Fe3355dE76D2",
  voter: "0x382409fad8503FbCdbB27A4211551fa03e884078",
};
const CHAINS = {
  8453: {
    stableGaugeFactory: "0x1e0f776E88649285f99e65Fa599aD6e0f9D97800",
    volatileGaugeFactory: "0x9FBCf2Df0DC553ce40Ef63963Bff465b76792B7E",
    reward: "0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee",
    handler: "0x8C37F30F3c8fd48bEddb14086fa5148291D422C3",
  },
  10: {
    stableGaugeFactory: "0x3924b18EDd37267dab6eDd99a3Bb339bf2b668fD",
    volatileGaugeFactory: "0x1B5D13975371806D699dC616A96D15B8eD26e5Ca",
    reward: "0xbdEaeA5205d16f34Cb40038052d91235D87B4C54",
    handler: ethers.constants.AddressZero,
  },
};
const PRESETS = {
  "base-aero-usdc": {
    chainId: 8453,
    pool: "0xF634058dC94e6BF8e828E27621320C423bC8B18E",
    gauge: "0xd424BA8ca9d4E278753DE76651a0095451e65cD1",
    token0: "0x3f5bF3EdAc59d650D8fDf9657a71F2f904A3a4Ee",
    token1: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    name: "Infinite Aero AERO/USDC",
    symbol: "iaAERO-USDC",
  },
  "op-itp-usdc": {
    chainId: 10,
    pool: "0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01",
    gauge: ethers.constants.AddressZero,
    token0: "0x0a7B751FcDBBAA8BB988B9217ad5Fb5cfe7bf7A0",
    token1: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85",
    name: "Infinite Aero ITP/USDC",
    symbol: "iaITP-USDC",
  },
};
const FEES = { strategistBps: 0, keeperBps: 100, entryBps: 10, exitBps: 10 };

const send = process.argv.includes("--send");
const artifacts = process.env.ARTIFACTS || path.join(__dirname, "../../out-aero");
const load = (name) => {
  const j = JSON.parse(fs.readFileSync(path.join(artifacts, `${name}.sol`, `${name}.json`), "utf8"));
  return { abi: j.abi, bytecode: j.bytecode.object || j.bytecode };
};

// ethers v5 defaults to a fixed 1.5 gwei tip, which overpays OP-stack L2s (~0.005 gwei base fee) by ~300x.
// Mirrors express/src/utils/feePolicy.ts: cap the tip, maxFee = 2 * baseFee + tip.
const MAX_TIP = ethers.utils.parseUnits("0.01", "gwei");
async function feeOverrides(provider) {
  const block = await provider.getBlock("latest");
  let tip = ethers.BigNumber.from(await provider.send("eth_maxPriorityFeePerGas", []).catch(() => "0x0"));
  if (tip.gt(MAX_TIP)) tip = MAX_TIP;
  if (tip.isZero()) tip = ethers.BigNumber.from(1000);
  return { maxPriorityFeePerGas: tip, maxFeePerGas: block.baseFeePerGas.mul(2).add(tip), type: 2 };
}

async function main() {
  const preset = PRESETS[process.env.PRESET];
  if (!preset) throw new Error(`PRESET must be one of ${Object.keys(PRESETS).join(", ")}`);
  const chain = CHAINS[preset.chainId];
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL);
  const key = process.env.PRIVATE_KEY || "";
  if (!key) throw new Error("PRIVATE_KEY missing");
  const wallet = new ethers.Wallet(key.startsWith("0x") ? key : `0x${key}`, provider);
  const { chainId } = await provider.getNetwork();
  if (chainId !== preset.chainId) throw new Error(`Refusing chainId ${chainId}; preset needs ${preset.chainId}`);
  const [balance, nonce, poolCode, safeCode] = await Promise.all([
    wallet.getBalance(),
    wallet.getTransactionCount("pending"),
    provider.getCode(preset.pool),
    provider.getCode(SAFE),
  ]);
  console.log(`preset ${process.env.PRESET} deployer ${wallet.address} balance ${ethers.utils.formatEther(balance)} ETH nonce ${nonce}`);
  if (poolCode === "0x" || safeCode === "0x") throw new Error("Pool or DAO Safe has no code on this chain");
  const F = load("AeroFactory");
  const V = load("AeroVault");
  const Z = load("AeroZap");
  const factoryArgs = [
    SAFE, SAFE, AERO.stableFactory, AERO.volatileFactory, chain.stableGaugeFactory,
    chain.volatileGaugeFactory, AERO.voter, chain.reward, chain.handler, [wallet.address],
  ];
  const config = {
    pool: preset.pool,
    gauge: preset.gauge,
    rewardToken: chain.reward,
    owner: wallet.address,
    strategist: SAFE,
    ...FEES,
    name: preset.name,
    symbol: preset.symbol,
  };

  if (!send) {
    const fees = await feeOverrides(provider);
    const gas = await wallet.estimateGas({
      ...new ethers.ContractFactory(F.abi, F.bytecode, wallet).getDeployTransaction(...factoryArgs),
      ...fees,
    });
    const tip = ethers.utils.formatUnits(fees.maxPriorityFeePerGas, "gwei");
    const cap = ethers.utils.formatUnits(fees.maxFeePerGas, "gwei");
    console.log(`dry run: factory gas ${gas}; tip ${tip} gwei, maxFee ${cap} gwei; worst case all three ~${ethers.utils.formatEther(gas.mul(fees.maxFeePerGas).mul(2))} ETH`);
    if (process.env.FACTORY) {
      const factory = new ethers.Contract(process.env.FACTORY, F.abi, wallet);
      await factory.callStatic.createVault(config);
      console.log("dry run: createVault simulation ok");
    }
    console.log("Re-run with --send to broadcast.");
    return;
  }

  let factoryAddr = process.env.FACTORY;
  if (!factoryAddr) {
    const factory = await new ethers.ContractFactory(F.abi, F.bytecode, wallet).deploy(...factoryArgs, await feeOverrides(provider));
    await factory.deployTransaction.wait(1);
    factoryAddr = factory.address;
    console.log(`FACTORY=${factoryAddr} tx ${factory.deployTransaction.hash}`);
  }
  const factory = new ethers.Contract(factoryAddr, F.abi, wallet);

  let vaultAddr = process.env.VAULT;
  if (!vaultAddr) {
    vaultAddr = await factory.callStatic.createVault(config);
    const tx = await factory.createVault(config, await feeOverrides(provider));
    await tx.wait(1);
    console.log(`VAULT=${vaultAddr} tx ${tx.hash}`);
  }
  const vault = new ethers.Contract(vaultAddr, V.abi, wallet);

  let zapAddr = process.env.ZAP;
  if (!zapAddr) {
    const zap = await new ethers.ContractFactory(Z.abi, Z.bytecode, wallet).deploy(factoryAddr, await feeOverrides(provider));
    await zap.deployTransaction.wait(1);
    zapAddr = zap.address;
    console.log(`ZAP=${zapAddr} tx ${zap.deployTransaction.hash}`);
  }

  if ((await vault.owner()).toLowerCase() === wallet.address.toLowerCase()
    && (await vault.pendingOwner()).toLowerCase() !== SAFE.toLowerCase()) {
    const tx = await vault.transferOwnership(SAFE, await feeOverrides(provider));
    await tx.wait(1);
    console.log(`transferOwnership(SAFE) tx ${tx.hash}`);
  }

  const checks = {
    factoryIsVault: await factory.isVault(vaultAddr),
    factoryDao: await factory.dao(),
    daoRewardBps: await factory.daoRewardBps(),
    deferredHandler: await factory.deferredHandler(),
    defaultKeeper: await factory.defaultKeeper(),
    vaultAsset: await vault.asset(),
    vaultToken0: await vault.token0(),
    vaultToken1: await vault.token1(),
    vaultGauge: await vault.gauge(),
    stakingEnabled: await vault.stakingEnabled(),
    vaultOwner: await vault.owner(),
    vaultPendingOwner: await vault.pendingOwner(),
    fees: [await vault.strategist(), await vault.strategistBps(), await vault.keeperBps(), await vault.entryBps(), await vault.exitBps()].join(","),
    zapFactory: await new ethers.Contract(zapAddr, Z.abi, provider).factory(),
  };
  console.log(JSON.stringify(checks, null, 1));
  if (checks.vaultToken0 !== preset.token0 || checks.vaultToken1 !== preset.token1
    || checks.vaultGauge !== preset.gauge || checks.zapFactory !== factoryAddr) {
    throw new Error("Post-deploy verification failed");
  }

  const iface = new ethers.utils.Interface(["function setDaoFees(uint16,uint16)", "function acceptOwnership()"]);
  const batch = {
    version: "1.0",
    chainId: String(preset.chainId),
    createdAt: Date.now(),
    meta: {
      name: `${preset.name}: 10% DAO reward fee + accept vault ownership`,
      description: `factory ${factoryAddr}.setDaoFees(1000, 1000); vault ${vaultAddr}.acceptOwnership()`,
    },
    transactions: [
      { to: factoryAddr, value: "0", data: iface.encodeFunctionData("setDaoFees", [1000, 1000]) },
      { to: vaultAddr, value: "0", data: iface.encodeFunctionData("acceptOwnership", []) },
    ],
  };
  const out = path.join(process.cwd(), `aero-${process.env.PRESET}-safe-batch.json`);
  fs.writeFileSync(out, JSON.stringify(batch, null, 2));
  console.log(`Safe Transaction Builder batch written to ${out}`);
}

main().catch((e) => {
  console.error(e.reason || e.message);
  process.exit(1);
});
