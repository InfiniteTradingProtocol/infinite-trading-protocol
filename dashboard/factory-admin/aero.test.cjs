const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const core = require("./aero-core.js");

const source = (name) => fs.readFileSync(path.join(__dirname, name), "utf8");
const dao = "0xb5dB6e5a301E595B76F40319896a8dbDc277CEfB";
const vaultAddress = "0xA15a7219EE74630AA7B5B0413C3082f2b775220D";
const factoryAddress = "0x8f378C71368Fb50084c2A540592502F0b1Ef8787";
const zero = `0x${"0".repeat(40)}`;
const other = `0x${"1".repeat(40)}`;

class Element {
  constructor(tag, props = {}, children = []) {
    this.tag = tag;
    this.props = props;
    this.children = children.flat().filter((v) => v != null && v !== false);
    this.listeners = {};
    this.value = props.value || "";
    this.disabled = false;
  }
  addEventListener(event, fn) { this.listeners[event] = fn; }
  replaceChildren(...nodes) { this.children = nodes; }
  async click() { if (!this.disabled) return (this.props.onclick || this.listeners.click)?.(); }
  get textContent() { return this.children.map((v) => v instanceof Element ? v.textContent : String(v)).join(" "); }
  set textContent(value) { this.children = [value]; }
  all(predicate) {
    return [this, ...this.children.flatMap((v) => v instanceof Element ? v.all(() => true) : [])].filter(predicate);
  }
  button(text) { return this.all((v) => v.tag === "button" && v.textContent === text)[0]; }
  detail(text) { return this.all((v) => v.tag === "details" && v.children[0].textContent === text)[0]; }
}

function harness(overrides = {}) {
  const ids = Object.fromEntries(["aeroRefresh", "aeroNetwork", "aeroStatus", "aeroFactory", "aeroVaults", "aeroVault"]
    .map((id) => [id, new Element("div")]));
  ids.aeroNetwork.value = "10";
  const moduleButton = new Element("button");
  const cfg = { dao, aero: { 10: { factory: factoryAddress, vaults: [{ name: "ITP / wstETH", address: vaultAddress, zap: other }] } } };
  const f = {
    dao: async () => dao, treasury: async () => dao, rewardToken: async () => other,
    deferredHandler: async () => zero, defaultKeeper: async () => other,
    mandatoryKeepers: async () => true, daoRewardBps: async () => 200n,
    daoEntryExitShareBps: async () => 1000n, vaultCount: async () => 1n,
    vaults: async () => vaultAddress, isVault: async () => true,
    isPool: async () => true, isGauge: async () => true,
    ...overrides.factory,
  };
  const v = {
    automationFactory: async () => factoryAddress, name: async () => "ITP-wstETH",
    symbol: async () => "acITP-wstETH", owner: async () => dao, pendingOwner: async () => dao,
    asset: async () => other, gauge: async () => zero, token0: async () => other,
    token1: async () => dao, rewardToken: async () => other, totalAssets: async () => 0n,
    totalSupply: async () => 0n, stakingEnabled: async () => false,
    strategist: async () => dao, strategistBps: async () => 1000n, keeperBps: async () => 50n,
    entryBps: async () => 1n, exitBps: async () => 1n, extraKeepers: async () => false,
    isKeeper: async () => true, ...overrides.vault,
  };
  const provider = { getNetwork: async () => ({ chainId: 10n }), getCode: async () => "0x1234" };
  const batches = [], simulations = [];
  const A = {
    h: (tag, props, ...children) => new Element(tag, props, children),
    ready: async () => {}, providerFor: () => provider, networkFor: () => ({ explorer: "https://example.org", chainName: "Optimism" }),
    decodeError: (e) => e.message, simulate: async (tx, from) => {
      simulations.push({ tx, from });
      return overrides.simulation || { ok: true };
    },
    addToBatch: (tx) => batches.push(tx),
  };
  const ethers = {
    ZeroAddress: zero,
    getAddress: (a) => {
      if (!/^0x[0-9a-f]{40}$/i.test(a)) throw new Error("Invalid address");
      return a;
    },
    Interface: class { encodeFunctionData(name, args) { return JSON.stringify({ name, args }); } },
    Contract: class {
      constructor(target) {
        if (core.eq(target, factoryAddress)) return f;
        if (core.eq(target, vaultAddress)) return v;
        return { factory: async () => overrides.zapFactory || factoryAddress };
      }
    },
  };
  const window = { ITP_ADMIN: A, ITP_CONFIG: cfg, ITP_AERO: core, ethers };
  vm.runInNewContext(source("aero.js"), {
    window, document: { getElementById: (id) => ids[id], querySelector: () => moduleButton },
  });
  return {
    ids, batches, simulations, f, v,
    load: () => moduleButton.click(),
    inspect: async () => { await ids.aeroVaults.button("Validate & inspect").click(); },
  };
}

test("fees enforce exact contract bounds and reject ambiguous numbers", () => {
  for (const [min, max] of [[1, 1000], [0, 1000], [10, 200], [0, 200]]) {
    assert.equal(core.bps(String(min), min, max), min);
    assert.equal(core.bps(String(max), min, max), max);
    for (const value of [min - 1, max + 1, "1e2", "1.2", "", "NaN", "Infinity"]) {
      assert.throws(() => core.bps(value, min, max));
    }
  }
});

test("discovery pages remain bounded even for huge on-chain counts", () => {
  assert.deepEqual(core.page(0n, 0n).indices, []);
  assert.deepEqual(core.page(21n, 20n), { indices: [20n], next: null });
  const page = core.page(2n ** 200n, 0n);
  assert.equal(page.indices.length, 20);
  assert.equal(page.next, 20n);
  assert.throws(() => core.page(1n, -1n));
  assert.throws(() => core.page(100n, 0n, 51));
});

test("registry lists the v2 factories; superseded v1 contracts are legacy-only", () => {
  const window = {};
  vm.runInNewContext(source("config.js"), { window });
  const base = window.ITP_CONFIG.aero[8453];
  assert.equal(base.version, 2);
  assert.equal(base.factory, "0xB60ce95161506EeC22A2D68A784DD21cf78adcA9");
  assert.equal(base.vaults[0].address, "0xA7e2E4Cb6B4938AAaDE3EbDEDe373205818129fC");
  assert.equal(base.legacy.factory, "0xf5cf6231b21B1De1dedB00a49B98bd0a6867C7AB");
  assert.ok(!base.vaults.some((v) => core.eq(v.address, base.implementation)));
  const op = window.ITP_CONFIG.aero[10];
  assert.equal(op.version, 2);
  assert.equal(op.factory, "0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc");
  assert.equal(op.oracle, "0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf");
  assert.equal(op.vaults[0].address, "0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58");
  assert.equal(op.vaults[0].zap, "0x95E97Def5456d5860a26DD3108A71Dd13b3E3592");
  assert.ok(!op.vaults.some((v) => core.eq(v.address, op.implementation)), "implementation is never listed as a vault");
  assert.equal(JSON.stringify(op.vaults.map((v) => v.address)), JSON.stringify([
    "0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58", "0x579f6D1646fDEb59B37a4DC880DbB6857004BafD", "0x6E276D140230C6f967ee2c79AEd69C90A24e115D",
  ]));
  // Superseded Optimism v1 contracts appear only as labelled legacy references.
  const live = JSON.stringify({ ...op, legacy: undefined }).toLowerCase();
  for (const old of [factoryAddress, vaultAddress, "0xb797413B59882f42B1Ceb18214911d6eA189c561", "0xD24a64a6387bb53A5682818564467E75a118eEf0"]) {
    assert.ok(!live.includes(old.toLowerCase()));
    assert.ok(JSON.stringify(op.legacy).toLowerCase().includes(old.toLowerCase()));
  }
  assert.equal(base.vaults[0].zap, "0xAdF1288917495F806b6014f354638F905B9Ce3fa");
  const baseLive = JSON.stringify({ ...base, legacy: undefined }).toLowerCase();
  for (const old of ["0x8a69C3b16FECd6865210858D3E67B948BF71395f", "0x64Bf868a02CfA1bce82a0711eB090E28a9dc8688", "0xf5cf6231b21B1De1dedB00a49B98bd0a6867C7AB"]) {
    assert.ok(!baseLive.includes(old.toLowerCase()));
    assert.ok(JSON.stringify(base.legacy).toLowerCase().includes(old.toLowerCase()));
  }
  const registry = JSON.stringify(window.ITP_CONFIG.aero).toLowerCase();
  for (const old of ["0x1bbb1d4a0184fca8b8c1076366e3148b4347cd51", "0x6223c4c645301e14c23189e4e4b8757396ea85e5", "0xe06e1bd3b29b999c027dce40bed147f97d3299e2"]) {
    assert.ok(!registry.includes(old));
  }
});

test("factory and vault display validated state, explicit metadata and keeper lookup", async () => {
  const h = harness();
  await h.load();
  assert.match(h.ids.aeroFactory.textContent, /Factory · validated/);
  await h.inspect();
  assert.match(h.ids.aeroVault.textContent, /ITP \/ wstETH/);
  assert.match(h.ids.aeroVault.textContent, /factory checked/);
  await h.ids.aeroVault.button("Read keeper permissions").click();
  assert.match(h.ids.aeroVault.textContent, /Mandatory: yes · Extra: no · Effective: yes/);
});

test("DAO fee calls must simulate twice before reaching the existing batch", async () => {
  const h = harness();
  await h.load();
  const action = h.ids.aeroFactory.detail("Set factory DAO fees");
  await action.button("Build & simulate").click();
  assert.equal(h.batches.length, 0);
  await action.button("Re-simulate & add to batch").click();
  assert.equal(h.batches.length, 1);
  assert.equal(h.simulations.length, 2);
  assert.equal(h.simulations[0].from, dao);
  assert.equal(h.batches[0].chainId, 10);
  assert.equal(h.batches[0].executionMode, "dao");
  assert.equal(h.batches[0].to, factoryAddress);
  assert.deepEqual(JSON.parse(h.batches[0].data), { name: "setDaoFees", args: [200, 1000] });
});

test("factory DAO mismatch disables all management and discovery", async () => {
  const h = harness({ factory: { dao: async () => other } });
  await h.load();
  assert.match(h.ids.aeroStatus.textContent, /does not match/);
  assert.equal(h.ids.aeroFactory.children.length, 0);
  assert.equal(h.ids.aeroVaults.children.length, 0);
});

test("foreign vaults, invalid gauges and foreign zaps fail closed", async () => {
  for (const options of [
    { factory: { isVault: async () => false } },
    { vault: { automationFactory: async () => other } },
    { factory: { isPool: async () => false } },
    { vault: { gauge: async () => other }, factory: { isGauge: async () => false } },
    { zapFactory: other },
  ]) {
    const h = harness(options);
    await h.load();
    await h.inspect();
    assert.match(h.ids.aeroVault.textContent, /management unavailable/);
    assert.equal(h.ids.aeroVault.all((v) => v.tag === "button").length, 0);
  }
});

test("simulation failures cannot be queued", async () => {
  const h = harness({ simulation: { ok: false, reason: "OnlyDao" } });
  await h.load();
  const action = h.ids.aeroFactory.detail("Set factory DAO fees");
  await action.button("Build & simulate").click();
  assert.match(action.textContent, /OnlyDao/);
  assert.equal(action.button("Re-simulate & add to batch"), undefined);
  assert.equal(h.batches.length, 0);
});

test("acceptOwnership requires pending DAO, not current ownership", async () => {
  const h = harness({ vault: { owner: async () => other } });
  await h.load();
  await h.inspect();
  const accept = h.ids.aeroVault.detail("Accept vault ownership as DAO Safe");
  await accept.button("Build & simulate").click();
  await accept.button("Re-simulate & add to batch").click();
  assert.equal(JSON.parse(h.batches[0].data).name, "acceptOwnership");
  const fees = h.ids.aeroVault.detail("Set vault fees");
  await fees.button("Build & simulate").click();
  assert.match(fees.textContent, /not the vault owner/);
});

test("pending-owner changes and refresh invalidate queued previews", async () => {
  const h = harness();
  await h.load();
  await h.inspect();
  const accept = h.ids.aeroVault.detail("Accept vault ownership as DAO Safe");
  await accept.button("Build & simulate").click();
  h.v.pendingOwner = async () => other;
  await accept.button("Re-simulate & add to batch").click();
  assert.equal(h.batches.length, 0);
  assert.match(accept.textContent, /not pending owner/);
  const fees = h.ids.aeroFactory.detail("Set factory DAO fees");
  await fees.button("Build & simulate").click();
  const old = fees.button("Re-simulate & add to batch");
  await h.load();
  await old.click();
  assert.equal(h.batches.length, 0);
  assert.match(fees.textContent, /State changed/);
});

test("switching vault inspection invalidates previous vault action previews", async () => {
  const h = harness();
  await h.load();
  await h.inspect();
  const action = h.ids.aeroVault.detail("Accept vault ownership as DAO Safe");
  await action.button("Build & simulate").click();
  const old = action.button("Re-simulate & add to batch");
  await h.inspect();
  await old.click();
  assert.equal(h.batches.length, 0);
  assert.match(action.textContent, /State changed/);
});

test("mandatory keepers cannot be disabled and no-gauge vaults cannot stake", async () => {
  const h = harness();
  await h.load();
  await h.inspect();
  const keeper = h.ids.aeroVault.detail("Set extra keeper");
  keeper.all((v) => v.tag === "input")[0].value = other;
  keeper.all((v) => v.tag === "select")[0].value = "false";
  await keeper.button("Build & simulate").click();
  assert.match(keeper.textContent, /cannot be disabled/);
  const staking = h.ids.aeroVault.detail("Set gauge staking");
  await staking.button("Build & simulate").click();
  assert.match(staking.textContent, /has no gauge/);
  assert.equal(h.simulations.length, 0);
});

// ── Aero v2 (Optimism) ───────────────────────────────────────────────────────
const v2Factory = "0x337Fe450bCD603B1c637AB0F4C073d926a1aE3Dc";
const v2Vault = "0x4bd84dD4fF4FfbcD2ee08dB22Ce3b9a2eeB10a58";
const v2Oracle = "0x351F1F1aBf8cc65AacD13cAA19bB4639F7C0b5bf";
const v2Impl = "0xD24D4D249D526C8Bf8dfb4682D11E3f9c6337E9a";
const v2Pool = "0x76817cf226aa94b164295AED4f62e7a1EEd41d36";
const routeA = "0x686c9942020a80EE853EaEF7663A266ae7991965";
const routeB = "0xeA3a2D098C4cd18EF0a9bc70aE3C79175f562e01";

function harnessV2(overrides = {}) {
  const ids = Object.fromEntries(["aeroRefresh", "aeroNetwork", "aeroStatus", "aeroFactory", "aeroVaults", "aeroVault"]
    .map((id) => [id, new Element("div")]));
  ids.aeroNetwork.value = "10";
  const moduleButton = new Element("button");
  const cfg = { dao, aero: { 10: {
    version: 2, factory: v2Factory, oracle: v2Oracle, implementation: v2Impl, routePools: [routeA, routeB],
    vaults: [{ name: "ITP / wstETH", address: v2Vault, zap: other }],
    legacy: { factory: factoryAddress, zap: other, vaults: [{ name: "ITP / wstETH (v1)", address: vaultAddress }] },
  } } };
  const f = {
    dao: async () => dao, treasury: async () => dao, rewardToken: async () => routeA, oracle: async () => v2Oracle,
    implementation: async () => v2Impl, defaultKeeper: async () => other, isKeeper: async () => true,
    daoFeeBps: async () => 200n, vaultCount: async () => 1n, vaults: async () => v2Vault, isVault: async () => true,
    isOfficial: async () => false, approvedPool: async () => true, isPool: async () => true, isGauge: async () => true,
    ...overrides.factory,
  };
  const v = {
    factory: async () => v2Factory, name: async () => "Infinite Aero ITP/wstETH", symbol: async () => "acITP-wstETH",
    owner: async () => dao, pendingOwner: async () => zero, asset: async () => v2Pool, gauge: async () => zero,
    token0: async () => other, token1: async () => dao, rewardToken: async () => routeA, stablePool: async () => false,
    totalAssets: async () => 0n, totalSupply: async () => 0n, lockedProfitNow: async () => 0n,
    profitUnlockTime: async () => 86400n, nextProfitUnlockTime: async () => 86400n, lastHarvest: async () => 0n,
    stakingEnabled: async () => false, stakedLp: async () => 0n, openHarvest: async () => false,
    strategist: async () => dao, strategistBps: async () => 0n, keeperBps: async () => 50n, exitBps: async () => 0n,
    maxDeviationBps: async () => 300n, maxSlippageBps: async () => 200n, maxSwapBps: async () => 50n,
    rewardRoute: async () => [], isKeeper: async () => true, extraKeepers: async () => false,
    automationFactory: async () => { throw new Error("v1 ABI used on v2 vault"); },
    ...overrides.vault,
  };
  const provider = { getNetwork: async () => ({ chainId: 10n }), getCode: async () => "0x1234" };
  const batches = [], simulations = [];
  const A = {
    h: (tag, props, ...children) => new Element(tag, props, children),
    ready: async () => {}, providerFor: () => provider, networkFor: () => ({ explorer: "https://example.org", chainName: "Optimism" }),
    decodeError: (e) => e.message, simulate: async (tx, from) => { simulations.push({ tx, from }); return { ok: true }; },
    addToBatch: (tx) => batches.push(tx),
  };
  const abis = [];
  const ethers = {
    ZeroAddress: zero,
    getAddress: (a) => { if (!/^0x[0-9a-f]{40}$/i.test(a)) throw new Error("Invalid address"); return a; },
    Interface: class { encodeFunctionData(name, args) { return JSON.stringify({ name, args }); } },
    Contract: class {
      constructor(target, abi) {
        abis.push({ target, abi });
        if (core.eq(target, v2Factory)) return f;
        if (core.eq(target, v2Vault)) return v;
        return { factory: async () => v2Factory };
      }
    },
  };
  const window = { ITP_ADMIN: A, ITP_CONFIG: cfg, ITP_AERO: core, ethers };
  vm.runInNewContext(source("aero.js"), {
    window, document: { getElementById: (id) => ids[id], querySelector: () => moduleButton },
  });
  const queue = async (host, label, values = {}) => {
    const d = host.detail(label);
    const inputs = d.all((e) => e.tag === "input" || e.tag === "select");
    for (const [i, value] of Object.entries(values)) inputs[i].value = value;
    await d.button("Build & simulate").click();
    const add = d.button("Re-simulate & add to batch");
    if (add) await add.click();
    return d;
  };
  return {
    ids, batches, simulations, f, v, abis, queue,
    load: () => moduleButton.click(),
    inspect: async () => { await ids.aeroVaults.button("Validate & inspect").click(); },
  };
}
const call = (tx) => JSON.parse(tx.data);

test("v2 bounds mirror AeroVaultV2/AeroFactoryV2 constants", () => {
  const L = core.V2_LIMITS;
  assert.deepEqual([L.daoFee, L.strategist, L.keeper, L.exit], [[0, 1000], [0, 1000], [0, 200], [0, 100]]);
  assert.deepEqual([L.deviation, L.slippage, L.swap, L.unlock], [[10, 1000], [10, 500], [10, 500], [3600, 172800]]);
  assert.equal(core.abis(2).vault, core.VAULT_V2_ABI);
  assert.equal(core.abis(undefined).vault, core.VAULT_ABI);
  assert.throws(() => core.int("3599", ...L.unlock, "Unlock"));
  assert.equal(core.int("172800", ...L.unlock, "Unlock"), 172800);
  assert.throws(() => core.text("", 64, "Name"));
  assert.throws(() => core.text("x".repeat(17), 16, "Symbol"));
  assert.deepEqual(core.list(`${routeA}, ${routeB}`, 4), [routeA, routeB]);
  assert.throws(() => core.list("a b c d e", 4));
});

test("v2 factory panel validates oracle/implementation and queues every DAO factory action", async () => {
  const h = harnessV2();
  await h.load();
  assert.match(h.ids.aeroFactory.textContent, /Factory v2 · validated/);
  assert.match(h.ids.aeroStatus.textContent, /supersedes v1 factory/);
  assert.ok(h.abis.find((x) => core.eq(x.target, v2Factory)).abi === core.FACTORY_V2_ABI);
  const F = h.ids.aeroFactory;
  await h.queue(F, "Set DAO fee", { 0: "150" });
  await h.queue(F, "Set treasury", { 0: other });
  await h.queue(F, "Set factory keeper", { 0: dao, 1: "true" });
  await h.queue(F, "Set default keeper", { 0: dao });
  await h.queue(F, "Set approved reward-route pool", { 0: routeA, 1: "true" });
  await h.queue(F, "Set official vault label", { 0: v2Vault, 1: "true" });
  await h.queue(F, "Create vault (DAO Safe becomes owner)", { 0: v2Pool, 1: dao, 2: "100", 3: "Infinite Aero X/Y", 4: "acX-Y" });
  assert.deepEqual(h.batches.map(call), [
    { name: "setDaoFee", args: [150] },
    { name: "setTreasury", args: [other] },
    { name: "setKeeper", args: [dao, true] },
    { name: "setDefaultKeeper", args: [dao] },
    { name: "setApprovedPool", args: [routeA, true] },
    { name: "setOfficial", args: [v2Vault, true] },
    { name: "createVault", args: [v2Pool, dao, 100, "Infinite Aero X/Y", "acX-Y"] },
  ]);
  assert.ok(h.batches.every((tx) => tx.to === v2Factory && tx.executionMode === "dao" && tx.chainId === 10));
  assert.ok(h.simulations.every((s) => s.from === dao));
});

test("v2 factory guards: oracle mismatch, default keeper removal, fee cap", async () => {
  const bad = harnessV2({ factory: { oracle: async () => other } });
  await bad.load();
  assert.match(bad.ids.aeroStatus.textContent, /oracle does not match/);
  assert.equal(bad.ids.aeroVaults.children.length, 0);
  const h = harnessV2();
  await h.load();
  const keeper = await h.queue(h.ids.aeroFactory, "Set factory keeper", { 0: other, 1: "false" });
  assert.match(keeper.textContent, /default keeper cannot be disabled/);
  const fee = await h.queue(h.ids.aeroFactory, "Set DAO fee", { 0: "1001" });
  assert.match(fee.textContent, /0–1000/);
  assert.equal(h.batches.length, 0);
});

test("v2 vault panel uses the v2 ABI and queues owner and DAO actions", async () => {
  const h = harnessV2();
  await h.load();
  await h.inspect();
  const V = h.ids.aeroVault;
  assert.match(V.textContent, /Aero v2/);
  assert.match(V.textContent, /DAO 200 · strategist 0 · keeper 50 bps/);
  await V.button("Read keeper permissions").click();
  assert.match(V.textContent, /Factory: yes · Extra: no · Effective: yes/);
  await h.queue(V, "Set vault fees", { 0: other, 1: "500", 2: "100", 3: "10" });
  await h.queue(V, "Set risk limits", { 0: "300", 1: "200", 2: "50" });
  await h.queue(V, "Set profit unlock time", { 0: "43200" });
  await h.queue(V, "Set extra keeper", { 0: other, 1: "false" });
  await h.queue(V, "Set open harvest", { 0: "true" });
  await h.queue(V, "Set reward route", { 0: `${routeA}, ${routeB}` });
  await h.queue(V, "Set gauge (DAO)", { 0: other });
  assert.deepEqual(h.batches.map(call), [
    { name: "setFees", args: [other, 500, 100, 10] },
    { name: "setRisk", args: [300, 200, 50] },
    { name: "setProfitUnlockTime", args: [43200] },
    { name: "setKeeper", args: [other, false] },
    { name: "setOpenHarvest", args: [true] },
    { name: "setRewardRoute", args: [[routeA, routeB]] },
    { name: "setGauge", args: [other] },
  ]);
  assert.ok(h.batches.every((tx) => core.eq(tx.to, v2Vault)));
});

test("v2 vault actions fail closed on out-of-range or unsafe inputs", async () => {
  const h = harnessV2({ factory: { approvedPool: async () => false } });
  await h.load();
  await h.inspect();
  const V = h.ids.aeroVault;
  assert.match((await h.queue(V, "Set vault fees", { 0: other, 1: "0", 2: "50", 3: "101" })).textContent, /0–100 bps/);
  assert.match((await h.queue(V, "Set risk limits", { 0: "9", 1: "200", 2: "50" })).textContent, /10–1000 bps/);
  assert.match((await h.queue(V, "Set profit unlock time", { 0: "172801" })).textContent, /3600–172800/);
  assert.match((await h.queue(V, "Set reward route", { 0: routeA })).textContent, /not DAO-approved/);
  assert.match((await h.queue(V, "Set reward route", { 0: `${v2Pool}, ${v2Pool}` })).textContent, /unique/);
  assert.match((await h.queue(V, "Set gauge staking (DAO)", { 0: "true" })).textContent, /no gauge/);
  assert.equal(h.batches.length, 0);
});

test("v2 staking needs a route; DAO gauge actions do not need vault ownership", async () => {
  const h = harnessV2({ vault: { owner: async () => other, gauge: async () => other } });
  await h.load();
  await h.inspect();
  const V = h.ids.aeroVault;
  assert.match((await h.queue(V, "Set gauge staking (DAO)", { 0: "true" })).textContent, /reward route before enabling staking/);
  assert.match((await h.queue(V, "Set vault fees")).textContent, /not the vault owner/);
  h.v.rewardRoute = async () => [routeA, routeB];
  await h.queue(V, "Set gauge staking (DAO)", { 0: "true" });
  await h.queue(V, "Set gauge staking (DAO)", { 0: "false" });
  assert.deepEqual(h.batches.map(call), [{ name: "setStaking", args: [true] }, { name: "setStaking", args: [false] }]);
  h.v.stakingEnabled = async () => true;
  assert.match((await h.queue(V, "Set gauge (DAO)", { 0: zero })).textContent, /Disable staking/);
});

test("v2 vault registered with another factory is unmanageable", async () => {
  const h = harnessV2({ vault: { factory: async () => other } });
  await h.load();
  await h.inspect();
  assert.match(h.ids.aeroVault.textContent, /management unavailable/);
  assert.equal(h.ids.aeroVault.all((e) => e.tag === "button").length, 0);
});
