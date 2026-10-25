// ABI and input policy shared by the browser module and offline tests.
((root) => {
  "use strict";
  const FACTORY_ABI = [
    "function dao() view returns (address)",
    "function treasury() view returns (address)",
    "function rewardToken() view returns (address)",
    "function deferredHandler() view returns (address)",
    "function defaultKeeper() view returns (address)",
    "function mandatoryKeepers(address) view returns (bool)",
    "function daoRewardBps() view returns (uint16)",
    "function daoEntryExitShareBps() view returns (uint16)",
    "function vaultCount() view returns (uint256)",
    "function vaults(uint256) view returns (address)",
    "function isVault(address) view returns (bool)",
    "function isPool(address) view returns (bool)",
    "function isGauge(address,address) view returns (bool)",
    "function setDaoFees(uint16,uint16)",
    "function addMandatoryKeeper(address)",
    "function setDefaultKeeper(address)",
  ];
  const VAULT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function automationFactory() view returns (address)",
    "function owner() view returns (address)",
    "function pendingOwner() view returns (address)",
    "function asset() view returns (address)",
    "function gauge() view returns (address)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function rewardToken() view returns (address)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function stakingEnabled() view returns (bool)",
    "function strategist() view returns (address)",
    "function strategistBps() view returns (uint16)",
    "function keeperBps() view returns (uint16)",
    "function entryBps() view returns (uint16)",
    "function exitBps() view returns (uint16)",
    "function isKeeper(address) view returns (bool)",
    "function extraKeepers(address) view returns (bool)",
    "function setFees(address,uint16,uint16,uint16,uint16)",
    "function setKeeper(address,bool)",
    "function setStaking(bool)",
    "function transferOwnership(address)",
    "function acceptOwnership()",
  ];
  // Aero v2 (AeroFactoryV2 / AeroVaultV2, contracts/src/aero/v2). Optimism and Base use v2; v1 remains elsewhere.
  const FACTORY_V2_ABI = [
    "function dao() view returns (address)",
    "function treasury() view returns (address)",
    "function rewardToken() view returns (address)",
    "function oracle() view returns (address)",
    "function implementation() view returns (address)",
    "function defaultKeeper() view returns (address)",
    "function isKeeper(address) view returns (bool)",
    "function daoFeeBps() view returns (uint16)",
    "function vaultCount() view returns (uint256)",
    "function vaults(uint256) view returns (address)",
    "function isVault(address) view returns (bool)",
    "function isOfficial(address) view returns (bool)",
    "function approvedPool(address) view returns (bool)",
    "function isPool(address) view returns (bool)",
    "function isGauge(address,address) view returns (bool)",
    "function setTreasury(address)",
    "function setDaoFee(uint16)",
    "function setKeeper(address,bool)",
    "function setDefaultKeeper(address)",
    "function setApprovedPool(address,bool)",
    "function setOfficial(address,bool)",
    "function createVault(address,address,uint16,string,string) returns (address)",
  ];
  const VAULT_V2_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function factory() view returns (address)",
    "function owner() view returns (address)",
    "function pendingOwner() view returns (address)",
    "function asset() view returns (address)",
    "function gauge() view returns (address)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function rewardToken() view returns (address)",
    "function stablePool() view returns (bool)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function lockedProfitNow() view returns (uint256)",
    "function profitUnlockTime() view returns (uint32)",
    "function nextProfitUnlockTime() view returns (uint32)",
    "function lastHarvest() view returns (uint64)",
    "function stakingEnabled() view returns (bool)",
    "function stakedLp() view returns (uint256)",
    "function openHarvest() view returns (bool)",
    "function strategist() view returns (address)",
    "function strategistBps() view returns (uint16)",
    "function keeperBps() view returns (uint16)",
    "function exitBps() view returns (uint16)",
    "function maxDeviationBps() view returns (uint16)",
    "function maxSlippageBps() view returns (uint16)",
    "function maxSwapBps() view returns (uint16)",
    "function rewardRoute() view returns (address[])",
    "function isKeeper(address) view returns (bool)",
    "function extraKeepers(address) view returns (bool)",
    "function setFees(address,uint16,uint16,uint16)",
    "function setRisk(uint16,uint16,uint16)",
    "function setProfitUnlockTime(uint32)",
    "function setKeeper(address,bool)",
    "function setOpenHarvest(bool)",
    "function setRewardRoute(address[])",
    "function setGauge(address)",
    "function setStaking(bool)",
    "function transferOwnership(address)",
    "function acceptOwnership()",
  ];
  // Bounds mirror AeroFactoryV2 / AeroVaultV2 constants exactly.
  const V2_LIMITS = {
    daoFee: [0, 1000], strategist: [0, 1000], keeper: [0, 200], exit: [0, 100],
    deviation: [10, 1000], slippage: [10, 500], swap: [10, 500],
    unlock: [3600, 172800], route: 4, name: 64, symbol: 16,
  };
  const abis = (version) => version === 2
    ? { factory: FACTORY_V2_ABI, vault: VAULT_V2_ABI }
    : { factory: FACTORY_ABI, vault: VAULT_ABI };
  const eq = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
  function bps(value, min, max) {
    if (!/^\d+$/.test(String(value))) throw new Error("Fees must be whole basis points.");
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`Fee must be ${min}–${max} bps.`);
    return n;
  }
  function int(value, min, max, label) {
    if (!/^\d+$/.test(String(value).trim())) throw new Error(`${label} must be a whole number.`);
    const n = Number(String(value).trim());
    if (!Number.isSafeInteger(n) || n < min || n > max) throw new Error(`${label} must be ${min}–${max}.`);
    return n;
  }
  function text(value, max, label) {
    const s = String(value).trim();
    const bytes = new TextEncoder().encode(s).length;
    if (bytes < 1 || bytes > max) throw new Error(`${label} must be 1–${max} bytes.`);
    return s;
  }
  // Comma/space/newline separated list; validation of each entry is left to the caller (ethers.getAddress).
  function list(value, max) {
    const items = String(value).split(/[\s,]+/).filter(Boolean);
    if (items.length > max) throw new Error(`At most ${max} entries are allowed.`);
    return items;
  }
  function page(count, offset, size = 20) {
    const total = BigInt(count);
    const start = BigInt(offset);
    if (total < 0n || start < 0n || !Number.isInteger(size) || size < 1 || size > 50) throw new Error("Invalid discovery page.");
    const end = start + BigInt(size) < total ? start + BigInt(size) : total;
    const indices = [];
    for (let i = start; i < end; i++) indices.push(i);
    return { indices, next: end < total ? end : null };
  }
  const core = { FACTORY_ABI, VAULT_ABI, FACTORY_V2_ABI, VAULT_V2_ABI, V2_LIMITS, abis, eq, bps, int, text, list, page };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  else root.ITP_AERO = core;
})(globalThis);
