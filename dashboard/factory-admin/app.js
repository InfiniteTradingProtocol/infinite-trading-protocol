(() => {
  "use strict";

  const { ethers } = window;
  const CFG = window.ITP_CONFIG;
  const ZERO_ROLE = ethers.ZeroHash;
  const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const BATCH_KEY = "itp-factory-admin-batch";
  const ROUTE = "(address from, address to, bool stable, address factory)[]";

  const FACTORY_ABI = [
    "function getVaults() view returns (address[])",
    "function isActiveVault(address) view returns (bool)",
    "function getVaultByWant(address) view returns (address)",
    "function vaultImplementationAddress() view returns (address)",
    "function vaultBeacon() view returns (address)",
    "function EXECUTOR_ROLE() view returns (bytes32)",
    "function SETTINGS_ADMIN_ROLE() view returns (bytes32)",
    "function VAULT_CREATOR_ROLE() view returns (bytes32)",
    "function getRoleMemberCount(bytes32) view returns (uint256)",
    "function getRoleMember(bytes32, uint256) view returns (address)",
    "function hasRole(bytes32, address) view returns (bool)",
    "function grantRole(bytes32 role, address account)",
    "function revokeRole(bytes32 role, address account)",
    "function renounceRole(bytes32 role, address callerConfirmation)",
    "function upgradeBeacon(address newImplementation)",
    "function upgradeToAndCall(address newImplementation, bytes data) payable",
    `function createVault(address want, address gauge, address unirouter, address infiniteFeeRecipient, string name, string symbol, ${ROUTE} outputToNativeRoute, ${ROUTE} outputToLp0Route, ${ROUTE} outputToLp1Route) returns (address)`,
    "function setVaultFeeCategory(address vault, uint256 total, uint256 infinite, uint256 call, uint256 burn, string label)",
    "function setVaultWithdrawalFee(address vault, uint256 fee)",
    "function setVaultSlippageTolerance(address vault, uint256 slippage)",
    "function setVaultInfiniteFeeRecipient(address vault, address recipient)",
    "function setVaultHarvestOnDeposit(address vault, bool enabled)",
    "function transferVaultOwnership(address vault, address newOwner)",
    "function pauseVault(address vault)",
    "function unpauseVault(address vault)",
    "function deactivateVault(address vault)",
    "function reactivateVault(address vault)",
  ];

  const VAULT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function owner() view returns (address)",
    "function want() view returns (address)",
    "function gauge() view returns (address)",
    "function output() view returns (address)",
    "function lpToken0() view returns (address)",
    "function lpToken1() view returns (address)",
    "function unirouter() view returns (address)",
    "function balance() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function paused() view returns (bool)",
    "function harvestOnDeposit() view returns (bool)",
    "function lastHarvest() view returns (uint256)",
    "function rewardsAvailable() view returns (uint256)",
    "function withdrawalFee() view returns (uint256)",
    "function slippageTolerance() view returns (uint256)",
    "function infiniteFeeRecipient() view returns (address)",
    "function feeCategory() view returns (uint256 total, uint256 infinite, uint256 call, uint256 burn, string label, bool active)",
    "function outputToNativeRoute(uint256) view returns (address from, address to, bool stable, address factory)",
    "function outputToLp0Route(uint256) view returns (address from, address to, bool stable, address factory)",
    "function outputToLp1Route(uint256) view returns (address from, address to, bool stable, address factory)",
    "function setFeeCategory(uint256 total, uint256 infinite, uint256 call, uint256 burn, string label)",
    "function setWithdrawalFee(uint256 fee)",
    "function setSlippageTolerance(uint256 slippage)",
    "function setInfiniteFeeRecipient(address recipient)",
    "function setHarvestOnDeposit(bool enabled)",
    "function transferOwnership(address newOwner)",
    "function pause()",
    "function unpause()",
    "function panic()",
    "function inCaseTokensGetStuck(address token)",
    "function harvest(address callFeeRecipient)",
  ];

  const ERRORS_ABI = [
    "error AccessControlUnauthorizedAccount(address account, bytes32 neededRole)",
    "error AccessControlBadConfirmation()",
    "error OwnableUnauthorizedAccount(address account)",
    "error InvalidAddress()",
    "error VaultNotFound()",
    "error InvalidVaultAddress()",
    "error InvalidBeaconImplementation()",
    "error VaultAlreadyExists()",
    "error InvalidConfiguration()",
    "error VaultCreationFailed()",
    "error EnforcedPause()",
    "error ExpectedPause()",
    "error ERC1967InvalidImplementation(address implementation)",
    "error UUPSUnauthorizedCallContext()",
    "error UUPSUnsupportedProxiableUUID(bytes32 slot)",
    "error BeaconInvalidImplementation(address implementation)",
  ];

  const fIface = new ethers.Interface(FACTORY_ABI);
  const vIface = new ethers.Interface(VAULT_ABI);
  const errIface = new ethers.Interface(ERRORS_ABI);
  const mcIface = new ethers.Interface([
    "function aggregate3((address target, bool allowFailure, bytes callData)[] calls) payable returns ((bool success, bytes returnData)[])",
  ]);

  // Velodrome factories for non-vault pools are labelled in routes.
  const VOTER_ABI = ["function gauges(address pool) view returns (address)", "function isAlive(address gauge) view returns (bool)"];
  const PAIR_ABI = ["function token0() view returns (address)", "function token1() view returns (address)", "function stable() view returns (bool)"];
  const ERC20_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function totalSupply() view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function allowance(address,address) view returns (uint256)",
    "function approve(address,uint256) returns (bool)",
  ];
  const STAKING_ABI = [
    "function owner() view returns (address)",
    "function totalStaked() view returns (uint256)",
    "function totalRewards() view returns (uint256)",
    "function totalRewardsLeft() view returns (uint256)",
    "function totalPenalty() view returns (uint256)",
    "function totalPenaltyBurned() view returns (uint256)",
    "function penaltyRateBps() view returns (uint256)",
    "function rewardsRatePerLockMultiplierBps(uint256) view returns (uint256)",
    "function depositRewards(uint256)",
    "function withdrawRewards(uint256)",
    "function withdrawPenalty(uint256)",
    "function burnPenalty(uint256)",
    "function convertPenaltyIntoRewards(uint256)",
  ];
  const V3_ABI = [
    "function owner() view returns (address)",
    "function dao() view returns (address)",
    "function token0() view returns (address)",
    "function token1() view returns (address)",
    "function pool() view returns (address)",
    "function poolFee() view returns (uint24)",
    "function tokenId() view returns (uint256)",
    "function totalShares() view returns (uint256)",
    "function totalLiquidity() view returns (uint128)",
    "function pendingFees() view returns (uint128,uint128)",
    "function maxSlippageBps() view returns (uint16)",
    "function twapPeriod() view returns (uint32)",
    "function isKeeper(address) view returns (bool)",
    "function userShares(address) view returns (uint256)",
    "function compound()",
    "function setDao(address)",
    "function addKeeper(address)",
    "function removeKeeper(address)",
    "function setTwapPeriod(uint32)",
    "function setPool(address,uint24)",
    "function setMaxSlippage(uint16)",
    "function transferOwnership(address)",
    "function rescueTokens(address,uint256)",
    "function upgradeToAndCall(address,bytes)",
  ];
  const STSATO_ABI = [
    "function owner() view returns (address)",
    "function start() view returns (bool)",
    "function totalMinted() view returns (uint256)",
    "function totalFeesBurned() view returns (uint256)",
    "function lastPrice() view returns (uint256)",
    "function getBacking() view returns (uint256)",
  ];

  const state = {
    read: null,
    providers: {},
    networkErrors: {},
    wallet: null,
    account: null,
    actAs: "dao",
    beacon: null,
    beaconImpl: null,
    beaconOwner: null,
    factoryImpl: null,
    vaultImplRecorded: null,
    roles: [],
    safe: null,
    vaults: [],
    staking: null,
    v3Vaults: [],
    selectedV3: null,
    assets: [],
    stsato: null,
    selected: null,
    batch: loadBatch(),
  };

  // ---------- small helpers ----------

  const $ = (id) => document.getElementById(id);
  const eq = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
  const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const c of children.flat()) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : String(c));
    }
    return el;
  }

  const ext = (href, text) => h("a", { href, target: "_blank", rel: "noopener noreferrer" }, text);
  const addrLink = (a, text) => ext(`${CFG.explorer}/address/${a}`, text || labelFor(a));
  const badge = (cls, text) => h("span", { class: `badge ${cls}` }, text);
  const networkFor = (chainId = CFG.chainId) => CFG.networks[chainId];
  const providerFor = (chainId = CFG.chainId) => state.providers[chainId];

  function labelFor(a) {
    if (!a) return "";
    if (eq(a, CFG.factory)) return "Factory";
    if (eq(a, CFG.staking)) return "ITP Staking V1";
    if (eq(a, CFG.stsato)) return "StSATO";
    if (eq(a, CFG.dao)) return "DAO Safe";
    if (eq(a, state.beacon)) return "Beacon";
    if (eq(a, CFG.multicall3)) return "Multicall3";
    const v = state.vaults.find((x) => eq(x.address, a));
    if (v) return v.name;
    const v3 = state.v3Vaults.find((x) => eq(x.address, a));
    if (v3) return v3.name;
    const k = CFG.knownVaultImplementations.find((x) => eq(x.address, a));
    if (k) return `impl ${k.label}`;
    if (eq(a, state.account)) return `you (${short(a)})`;
    return short(a);
  }

  function roleName(id) {
    const r = state.roles.find((x) => x.id === id);
    return r ? r.name : id;
  }

  function kv(pairs) {
    return h("div", { class: "kv" }, pairs.flatMap(([k, v]) => [h("div", {}, k), h("div", {}, v)]));
  }

  const fmt = (x, d = 18, p = 4) => Number(ethers.formatUnits(x, d)).toLocaleString(undefined, { maximumFractionDigits: p });
  const pct = (wad) => `${Number(ethers.formatUnits(wad, 16)).toFixed(2)}%`;

  function ago(ts) {
    const s = Math.floor(Date.now() / 1000) - Number(ts);
    if (!ts || Number(ts) === 0) return "never";
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  }

  function requireAddress(value, field) {
    const v = (value || "").trim();
    if (!ethers.isAddress(v)) throw new Error(`${field}: not a valid address`);
    return ethers.getAddress(v);
  }

  function notice(kind, nodes) {
    const n = $("notice");
    n.className = `notice ${kind}`;
    n.replaceChildren(...[].concat(nodes));
  }

  const safeCall = (p, fallback = null) => p.catch(() => fallback);

  // ---------- providers / wallet ----------

  async function initRead() {
    await Promise.all(Object.entries(CFG.networks).map(async ([id, network]) => {
      for (const url of network.rpcUrls) {
        try {
          const provider = new ethers.JsonRpcProvider(url, network.chainId, { staticNetwork: true });
          await provider.getBlockNumber();
          state.providers[id] = provider;
          if (Number(id) === CFG.chainId) state.read = provider;
          return;
        } catch {
          /* try the next RPC for this network */
        }
      }
      state.networkErrors[id] = `No public ${network.chainName} RPC reachable.`;
    }));
    if (!state.read) throw new Error(state.networkErrors[CFG.chainId] || "No public Optimism RPC reachable.");
  }

  async function connect() {
    if (!window.ethereum) throw new Error("No wallet extension found. Open this page in the browser where Rabby/MetaMask is installed.");
    state.wallet = new ethers.BrowserProvider(window.ethereum, "any");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    state.account = accounts[0] ? ethers.getAddress(accounts[0]) : null;
    window.ethereum.on?.("accountsChanged", (a) => {
      state.account = a[0] ? ethers.getAddress(a[0]) : null;
      renderAccount();
    });
    renderAccount();
  }

  async function ensureChain(chainId = CFG.chainId) {
    const id = await window.ethereum.request({ method: "eth_chainId" });
    const network = networkFor(chainId);
    if (!network) throw new Error(`Unsupported chain ID ${chainId}.`);
    if (id !== network.chainIdHex) {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: network.chainIdHex }] });
    }
  }

  const executor = () => (state.actAs === "dao" ? CFG.dao : state.account);

  function renderAccount() {
    const el = $("account");
    el.textContent = state.account ? labelFor(state.account) : "Not connected";
    el.className = `pill ${state.account ? "" : "muted"}`;
    $("connect").textContent = state.account ? "Reconnect" : "Connect wallet";
    if (!$("harvestRecipient").value && state.account) $("harvestRecipient").value = state.account;
  }

  // ---------- transactions ----------

  function decodeError(e) {
    const data = e?.data ?? e?.info?.error?.data ?? e?.error?.data;
    if (typeof data === "string" && data.length >= 10) {
      try {
        const p = errIface.parseError(data);
        if (p) {
          const args = p.args.map((a) => (typeof a === "string" && a.length === 66 ? roleName(a) : typeof a === "string" ? labelFor(a) : String(a)));
          return `${p.name}(${args.join(", ")})`;
        }
      } catch {
        /* unknown selector */
      }
      if (data.startsWith("0x08c379a0")) {
        try {
          return ethers.AbiCoder.defaultAbiCoder().decode(["string"], `0x${data.slice(10)}`)[0];
        } catch {
          /* fall through */
        }
      }
      return `revert ${data.slice(0, 10)}`;
    }
    return e?.reason || e?.shortMessage || e?.message || String(e);
  }

  async function simulate(tx, from = executor()) {
    if (!from) return { ok: false, reason: "Connect a wallet or set “Act as” to DAO Safe." };
    try {
      const chainId = Number(tx.chainId || CFG.chainId);
      const provider = providerFor(chainId);
      if (!provider) return { ok: false, reason: `${networkFor(chainId)?.chainName || `Chain ${chainId}`} RPC is unavailable.` };
      await provider.call({ from, to: tx.to, data: tx.data, value: BigInt(tx.value || 0) });
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: decodeError(e) };
    }
  }

  async function sendTx(tx) {
    if (!state.wallet) await connect();
    const chainId = Number(tx.chainId || CFG.chainId);
    await ensureChain(chainId);
    const signer = await state.wallet.getSigner();
    const from = await signer.getAddress();
    if (state.actAs === "dao" && !eq(from, CFG.dao)) {
      throw new Error(`“Act as” is DAO Safe but the wallet account is ${short(from)}. Select the Safe account in your wallet, or add this to the batch and execute it in the Safe app.`);
    }
    const sim = await simulate(tx, from);
    if (!sim.ok && !window.confirm(`Simulation from ${from} reverts:\n${sim.reason}\n\nSend anyway?`)) throw new Error("cancelled");
    if (tx.confirm && !window.confirm(tx.confirm)) throw new Error("cancelled");
    const resp = await signer.sendTransaction({ to: tx.to, data: tx.data, value: BigInt(tx.value || 0) });
    return resp.hash;
  }

  function txBox(tx) {
    const res = h("span", { class: "result" });
    const set = (cls, ...nodes) => {
      res.className = `result ${cls}`;
      res.replaceChildren(...nodes);
    };
    return h(
      "div",
      { class: "tx" },
      h("div", { class: "tx-title" }, tx.label),
      h("div", { class: "tx-meta" }, "to ", ext(`${networkFor(Number(tx.chainId || CFG.chainId))?.explorer || CFG.explorer}/address/${tx.to}`, tx.to), ` · ${networkFor(Number(tx.chainId || CFG.chainId))?.chainName || "Optimism"} · value 0 · must be sent by: ${tx.sender || "anyone"}`),
      tx.warning ? h("div", { class: "result warn" }, `⚠ ${tx.warning}`) : null,
      h("details", {}, h("summary", {}, "calldata"), h("pre", {}, tx.data)),
      h(
        "div",
        { class: "row" },
        h("button", {
          class: "btn small",
          onclick: async () => {
            set("", "simulating…");
            const r = await simulate(tx);
            if (r.ok) set("ok", `✓ simulation OK as ${labelFor(executor())}`);
            else set("err", `✗ ${r.reason}`);
          },
        }, "Simulate"),
        h("button", {
          class: "btn small primary",
          onclick: async () => {
            try {
              set("", "waiting for wallet…");
              const hash = await sendTx(tx);
              set("ok", "sent ", ext(`${CFG.explorer}/tx/${hash}`, short(hash)));
            } catch (e) {
              set("err", e.message === "cancelled" ? "cancelled" : decodeError(e));
            }
          },
        }, "Send"),
        h("button", {
          class: "btn small",
          onclick: () => {
            addToBatch(tx);
            set("ok", "added to batch");
          },
        }, "Add to batch"),
        res,
      ),
    );
  }

  function showTx(slotId, build) {
    const slot = typeof slotId === "string" ? $(slotId) : slotId;
    try {
      const txs = [].concat(build());
      slot.replaceChildren(...txs.map(txBox));
    } catch (e) {
      slot.replaceChildren(h("div", { class: "result err" }, `✗ ${e.message}`));
    }
  }

  // ---------- batch ----------

  function loadBatch() {
    try {
      return JSON.parse(localStorage.getItem(BATCH_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function saveBatch() {
    localStorage.setItem(BATCH_KEY, JSON.stringify(state.batch));
    $("batchCount").textContent = String(state.batch.length);
    renderBatch();
  }

  function addToBatch(tx) {
    state.batch.push({ label: tx.label, to: tx.to, data: tx.data, value: String(tx.value || 0), sender: tx.sender || "", chainId: Number(tx.chainId || CFG.chainId) });
    saveBatch();
  }

  function renderBatch() {
    const list = $("batchList");
    if (!state.batch.length) {
      list.replaceChildren(h("p", { class: "muted" }, "Empty. Use “Add to batch” on any action."));
      return;
    }
    list.replaceChildren(
      ...state.batch.map((t, i) => {
        const box = txBox(t);
        box.prepend(
          h(
            "div",
            { class: "row between" },
            h("span", { class: "muted" }, `#${i + 1}`),
            h(
              "div",
              { class: "row" },
              h("button", { class: "btn small", disabled: i === 0, onclick: () => moveBatch(i, -1) }, "↑"),
              h("button", { class: "btn small", disabled: i === state.batch.length - 1, onclick: () => moveBatch(i, 1) }, "↓"),
              h("button", { class: "btn small danger", onclick: () => { state.batch.splice(i, 1); saveBatch(); } }, "Remove"),
            ),
          ),
        );
        return box;
      }),
    );
  }

  function moveBatch(i, d) {
    const [t] = state.batch.splice(i, 1);
    state.batch.splice(i + d, 0, t);
    saveBatch();
  }

  function exportSafeBatch() {
    const chainId = Number($("batchNetwork").value || CFG.chainId);
    const transactions = state.batch.filter((t) => Number(t.chainId || CFG.chainId) === chainId);
    if (!transactions.length) return;
    const payload = {
      version: "1.0",
      chainId: String(chainId),
      createdAt: Date.now(),
      meta: {
        name: `Infinite Trading admin ${new Date().toISOString().slice(0, 10)}`,
        description: transactions.map((t) => t.label).join(" | ").slice(0, 500),
        txBuilderVersion: "1.16.5",
        createdFromSafeAddress: CFG.dao,
        createdFromOwnerAddress: "",
      },
      transactions: transactions.map((t) => ({ to: t.to, value: t.value || "0", data: t.data, contractMethod: null, contractInputsValues: null })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = h("a", { href: URL.createObjectURL(blob), download: `itp-admin-${networkFor(chainId)?.chainName.toLowerCase() || chainId}-batch-${Date.now()}.json` });
    document.body.append(a);
    a.click();
    a.remove();
  }

  async function sendBatch() {
    for (const t of [...state.batch]) {
      try {
        await sendTx(t);
      } catch (e) {
        window.alert(`Stopped at “${t.label}”: ${e.message}`);
        return;
      }
    }
  }

  // ---------- loading on-chain state ----------

  async function loadAll() {
    const f = new ethers.Contract(CFG.factory, FACTORY_ABI, state.read);
    const [beacon, vaultImplRecorded, implSlot, exRole, saRole, vcRole, vaults] = await Promise.all([
      f.vaultBeacon(),
      f.vaultImplementationAddress(),
      state.read.getStorage(CFG.factory, IMPL_SLOT),
      f.EXECUTOR_ROLE(),
      f.SETTINGS_ADMIN_ROLE(),
      f.VAULT_CREATOR_ROLE(),
      f.getVaults(),
    ]);
    state.beacon = beacon;
    state.vaultImplRecorded = vaultImplRecorded;
    state.factoryImpl = ethers.getAddress(`0x${implSlot.slice(26)}`);

    const b = new ethers.Contract(beacon, ["function implementation() view returns (address)", "function owner() view returns (address)"], state.read);
    [state.beaconImpl, state.beaconOwner] = await Promise.all([b.implementation(), b.owner()]);

    const defs = [
      { name: "DEFAULT_ADMIN_ROLE", id: ZERO_ROLE, desc: "Upgrades vault + factory implementations, grants/revokes every role, deactivates vaults." },
      { name: "VAULT_CREATOR_ROLE", id: vcRole, desc: "createVault / createMultipleVaults." },
      { name: "SETTINGS_ADMIN_ROLE", id: saRole, desc: "Vault settings through the factory (only for factory-owned vaults)." },
      { name: "EXECUTOR_ROLE", id: exRole, desc: "harvestAllProfitable / harvestSpecificVaults (keeper uses Multicall3 instead)." },
    ];
    state.roles = await Promise.all(
      defs.map(async (r) => {
        const n = Number(await f.getRoleMemberCount(r.id));
        const members = await Promise.all([...Array(n).keys()].map((i) => f.getRoleMember(r.id, i)));
        return { ...r, members };
      }),
    );

    const safe = new ethers.Contract(CFG.dao, ["function getThreshold() view returns (uint256)", "function getOwners() view returns (address[])"], state.read);
    const [threshold, owners] = await Promise.all([safeCall(safe.getThreshold()), safeCall(safe.getOwners(), [])]);
    state.safe = { threshold, owners };

    const voter = new ethers.Contract(CFG.velodromeVoter, VOTER_ABI, state.read);
    state.vaults = await Promise.all(vaults.map((a) => loadVault(a, f, voter)));
  }

  async function loadVault(address, f, voter) {
    const v = new ethers.Contract(address, VAULT_ABI, state.read);
    const [name, owner, want, gauge, output, router, tvl, supply, paused, hod, last, rewards, wfee, slip, feeRec, fc, active] = await Promise.all([
      v.name(),
      v.owner(),
      v.want(),
      v.gauge(),
      v.output(),
      safeCall(v.unirouter()),
      v.balance(),
      v.totalSupply(),
      v.paused(),
      safeCall(v.harvestOnDeposit()),
      v.lastHarvest(),
      safeCall(v.rewardsAvailable()),
      v.withdrawalFee(),
      v.slippageTolerance(),
      v.infiniteFeeRecipient(),
      v.feeCategory(),
      f.isActiveVault(address),
    ]);
    const alive = await safeCall(voter.isAlive(gauge));
    return { address, name, owner, want, gauge, output, router, tvl, supply, paused, hod, last, rewards, wfee, slip, feeRec, fc, active, alive };
  }

  // ---------- staking, Uniswap V3, and asset monitoring ----------

  async function loadStaking() {
    const provider = providerFor(10);
    if (!provider) throw new Error(state.networkErrors[10] || "Optimism RPC unavailable.");
    const staking = new ethers.Contract(CFG.staking, STAKING_ABI, provider);
    const token = new ethers.Contract(CFG.tokens.itpOptimism, ERC20_ABI, provider);
    const getters = ["owner", "totalStaked", "totalRewards", "totalRewardsLeft", "totalPenalty", "totalPenaltyBurned", "penaltyRateBps"];
    const values = await Promise.all(getters.map((name) => safeCall(staking[name](), null)));
    const [tokenBalance, reward1, reward2, reward3, reward4] = await Promise.all([
      safeCall(token.balanceOf(CFG.staking), null),
      safeCall(staking.rewardsRatePerLockMultiplierBps(1), null),
      safeCall(staking.rewardsRatePerLockMultiplierBps(2), null),
      safeCall(staking.rewardsRatePerLockMultiplierBps(3), null),
      safeCall(staking.rewardsRatePerLockMultiplierBps(4), null),
    ]);
    state.staking = { owner: values[0], totalStaked: values[1], totalRewards: values[2], totalRewardsLeft: values[3], totalPenalty: values[4], totalPenaltyBurned: values[5], penaltyRateBps: values[6], tokenBalance, rewardRates: [reward1, reward2, reward3, reward4] };
    renderStaking();
  }

  function renderStaking() {
    $("stakingAddress").replaceChildren(addrLink(CFG.staking, CFG.staking));
    if (!state.staking) return;
    const s = state.staking;
    const value = (x, decimals = 18) => x == null ? "Unavailable" : fmt(x, decimals, 4);
    const cards = [
      ["Owner", s.owner ? addrLink(s.owner) : "Unavailable"],
      ["Total staked", `${value(s.totalStaked)} ITP`],
      ["Reward inventory", `${value(s.tokenBalance)} ITP`],
      ["Rewards allocated", `${value(s.totalRewards)} ITP`],
      ["Rewards remaining", `${value(s.totalRewardsLeft)} ITP`],
      ["Penalty balance", `${value(s.totalPenalty)} ITP`],
      ["Penalty burned", `${value(s.totalPenaltyBurned)} ITP`],
      ["Penalty rate", s.penaltyRateBps == null ? "Unavailable" : `${(Number(s.penaltyRateBps) / 100).toFixed(2)}%`],
      ["Reward rates (1–4 years)", s.rewardRates.map((x) => x == null ? "–" : `${(Number(x) / 100).toFixed(2)}%`).join(" · ")],
    ];
    $("stakingSummary").replaceChildren(...cards.map(([label, text]) => h("div", { class: "card" }, h("div", { class: "stat-label" }, label), h("div", { class: "stat-value" }, text))));
  }

  function stakingTx(method, amount, label, opts = {}) {
    const stakingIface = new ethers.Interface(STAKING_ABI);
    return { ...opts, label: `Staking V1: ${label}`, to: CFG.staking, data: stakingIface.encodeFunctionData(method, [amount]), sender: `staking owner (${state.staking?.owner ? labelFor(state.staking.owner) : "owner"})`, chainId: 10 };
  }

  function buildStakingOperation(method, amountId, label) {
    const amount = ethers.parseUnits(($(`${amountId}`).value || "0").trim(), 18);
    if (amount <= 0n) throw new Error("Amount must be greater than zero.");
    return stakingTx(method, amount, label);
  }

  function buildStakingDeposit() {
    const amount = ethers.parseUnits(($("stakingRewardAmount").value || "0").trim(), 18);
    if (amount <= 0n) throw new Error("Amount must be greater than zero.");
    const token = new ethers.Interface(ERC20_ABI);
    return [
      { label: "Staking V1: reset ITP allowance", to: CFG.tokens.itpOptimism, data: token.encodeFunctionData("approve", [CFG.staking, 0n]), sender: "ITP token holder", chainId: 10 },
      { label: "Staking V1: approve ITP rewards", to: CFG.tokens.itpOptimism, data: token.encodeFunctionData("approve", [CFG.staking, amount]), sender: "ITP token holder", chainId: 10 },
      stakingTx("depositRewards", amount, `deposit ${fmt(amount)} ITP rewards`, { sender: "anyone with ITP" }),
    ];
  }

  async function loadV3Vault(def) {
    const provider = providerFor(def.chainId);
    if (!provider) return { ...def, error: state.networkErrors[def.chainId] || "Base RPC unavailable." };
    const code = await provider.getCode(def.address);
    if (code === "0x") return { ...def, available: false };
    const vault = new ethers.Contract(def.address, V3_ABI, provider);
    const calls = ["owner", "dao", "token0", "token1", "pool", "poolFee", "tokenId", "totalShares", "totalLiquidity", "pendingFees", "maxSlippageBps", "twapPeriod"];
    const values = await Promise.all(calls.map((name) => safeCall(vault[name](), null)));
    const providerAddress = [CFG.dao, "0xE6C312d661bE5e3eC022e2F18e084713A434A340", "0x233EC2735d58698eFC4d5f24A521AA251252f0C0"];
    const keepers = await Promise.all(providerAddress.map(async (address) => (await safeCall(vault.isKeeper(address), false)) ? address : null));
    const implementation = await safeCall(provider.getStorage(def.address, IMPL_SLOT), null);
    const [symbol0, symbol1] = await Promise.all([values[2], values[3]].map(async (address, i) => {
      if (!address) return i === 0 ? "token0" : "token1";
      return safeCall(new ethers.Contract(address, ERC20_ABI, provider).symbol(), short(address));
    }));
    return {
      ...def,
      available: true,
      owner: values[0], dao: values[1], token0: values[2] || def.token0, token1: values[3] || def.token1,
      pool: values[4], poolFee: values[5], tokenId: values[6], totalShares: values[7], totalLiquidity: values[8],
      pendingFees: values[9], maxSlippageBps: values[10], twapPeriod: values[11], keepers: keepers.filter(Boolean),
      implementation: implementation && implementation !== `0x${"0".repeat(64)}` ? ethers.getAddress(`0x${implementation.slice(-40)}`) : null,
      symbols: [symbol0, symbol1],
    };
  }

  async function loadV3() {
    state.v3Vaults = await Promise.all(CFG.v3Compounders.map(loadV3Vault));
    renderV3();
  }

  function v3Tx(vault, method, args, label, opts = {}) {
    return { ...opts, label: `${vault.name}: ${label}`, to: vault.address, data: new ethers.Interface(V3_ABI).encodeFunctionData(method, args), sender: `owner (${vault.owner ? labelFor(vault.owner) : "unknown"})`, chainId: vault.chainId };
  }

  function renderV3() {
    const headers = ["Vault", "Owner", "Position", "Shares", "Liquidity", "Pending fees", "Status"];
    const rows = state.v3Vaults.map((v) => h("tr", {
      class: `clickable ${state.selectedV3 === v.address ? "selected" : ""}`,
      onclick: () => selectV3Vault(v.address),
    },
      h("td", {}, h("div", {}, v.name), h("div", { class: "muted mono" }, short(v.address))),
      h("td", {}, v.owner ? addrLink(v.owner, labelFor(v.owner)) : "–"),
      h("td", {}, v.tokenId == null ? "–" : String(v.tokenId)),
      h("td", {}, v.totalShares == null ? "–" : fmt(v.totalShares)),
      h("td", {}, v.totalLiquidity == null ? "–" : String(v.totalLiquidity)),
      h("td", {}, v.pendingFees ? `${fmt(v.pendingFees[0], 18, 6)} / ${fmt(v.pendingFees[1], 18, 6)} ${v.symbols?.join(" / ") || ""}` : "–"),
      h("td", {}, v.error ? badge("warn", "RPC unavailable") : v.available ? badge("ok", "live") : badge("err", "no code")),
    ));
    $("v3Table").replaceChildren(h("thead", {}, h("tr", {}, ...headers.map((x) => h("th", {}, x)))), h("tbody", {}, rows));
    if (state.selectedV3) selectV3Vault(state.selectedV3);
  }

  function selectV3Vault(address) {
    const vault = state.v3Vaults.find((x) => eq(x.address, address));
    if (!vault) return;
    state.selectedV3 = address;
    $("v3Table").querySelectorAll("tbody tr").forEach((row, index) => row.classList.toggle("selected", eq(state.v3Vaults[index]?.address, address)));
    const panel = $("v3Panel");
    panel.classList.remove("hidden");
    if (!vault.available) {
      panel.replaceChildren(h("h3", {}, vault.name), h("p", { class: "result err" }, vault.error || "No contract code at this address on Base."));
      return;
    }
    const input = (id, value = "", placeholder = "") => h("input", { id, value: value ?? "", placeholder });
    const slot = () => h("div", {});
    const controls = {};
    for (const id of ["compound", "keeper", "keeperRemove", "pool", "poolFee", "slippage", "twap", "dao", "newOwner", "rescueToken", "rescueAmount", "newImpl"]) controls[id] = slot();
    const action = (title, body, id, button, build) => h("div", { class: "subcard" }, h("h4", {}, title), body, h("button", { class: "btn", onclick: () => showTx(controls[id], build) }, button), controls[id]);
    const fees = vault.pendingFees ? `${fmt(vault.pendingFees[0], 18, 6)} ${vault.symbols[0]} + ${fmt(vault.pendingFees[1], 18, 6)} ${vault.symbols[1]}` : "Unavailable";
    panel.replaceChildren(
      h("div", { class: "row between" }, h("h3", {}, vault.name), h("button", { class: "btn small", onclick: () => panel.classList.add("hidden") }, "Close")),
      kv([
        ["Proxy", ext(`${networkFor(vault.chainId).explorer}/address/${vault.address}`, vault.address)],
        ["Owner / DAO", `${vault.owner ? labelFor(vault.owner) : "unavailable"} / ${vault.dao ? labelFor(vault.dao) : "unavailable"}`],
        ["Implementation", vault.implementation ? ext(`${networkFor(vault.chainId).explorer}/address/${vault.implementation}`, vault.implementation) : "Unavailable"],
        ["Pool", vault.pool ? ext(`${networkFor(vault.chainId).explorer}/address/${vault.pool}`, vault.pool) : "Unavailable"],
        ["Tokens", `${vault.symbols?.[0] || "token0"} / ${vault.symbols?.[1] || "token1"}`],
        ["Position / fee tier", `${vault.tokenId ?? "–"} / ${vault.poolFee ?? "–"}`],
        ["Shares / liquidity", `${vault.totalShares == null ? "–" : fmt(vault.totalShares)} / ${vault.totalLiquidity ?? "–"}`],
        ["Pending fees", fees],
        ["TWAP / slippage", `${vault.twapPeriod ?? "–"} sec / ${vault.maxSlippageBps == null ? "–" : `${(Number(vault.maxSlippageBps) / 100).toFixed(2)}%`}`],
        ["Registered keepers", vault.keepers.length ? vault.keepers.map((k) => labelFor(k)).join(", ") : "No configured DAO/known keepers detected"],
      ]),
      h("div", { class: "subgrid" },
        action("Compound", h("p", { class: "muted" }, "Collect and reinvest available fees. The sender must be the owner or an approved keeper."), "compound", "Build compound", () => v3Tx(vault, "compound", [], "compound fees", { sender: "owner or keeper", chainId: vault.chainId })),
        h("div", { class: "subcard" }, h("h4", {}, "Keeper access"), h("div", { class: "form" }, h("label", {}, "Keeper address", input("keeper", "", "0x…"))),
          h("div", { class: "row" },
            h("button", { class: "btn", onclick: () => showTx(controls.keeper, () => v3Tx(vault, "addKeeper", [requireAddress($("keeper").value, "Keeper")], "add keeper")) }, "Build add keeper"),
            h("button", { class: "btn", onclick: () => showTx(controls.keeperRemove, () => v3Tx(vault, "removeKeeper", [requireAddress($("keeper").value, "Keeper")], "remove keeper")) }, "Build remove keeper")),
          controls.keeper, controls.keeperRemove),
        action("Pool and fee tier", h("div", { class: "form two" }, h("label", {}, "Pool", input("pool", vault.pool, "0x…")), h("label", {}, "Fee tier", input("poolFee", vault.poolFee, "e.g. 10000"))), "pool", "Build pool update", () => v3Tx(vault, "setPool", [requireAddress($("pool").value, "Pool"), BigInt($("poolFee").value)], "update pool")),
        action("TWAP and slippage", h("div", { class: "form two" }, h("label", {}, "TWAP period (seconds)", input("twap", vault.twapPeriod)), h("label", {}, "Max slippage (bps)", input("slippage", vault.maxSlippageBps))), "twap", "Build settings update", () => [
          v3Tx(vault, "setTwapPeriod", [BigInt($("twap").value)], "update TWAP period"),
          v3Tx(vault, "setMaxSlippage", [BigInt($("slippage").value)], "update max slippage"),
        ]),
        action("DAO and ownership", h("div", { class: "form two" }, h("label", {}, "DAO recipient", input("dao", vault.dao, "0x…")), h("label", {}, "New owner", input("newOwner", "", "0x…"))), "dao", "Build owner updates", () => {
          const out = [v3Tx(vault, "setDao", [requireAddress($("dao").value, "DAO")], "update DAO")];
          if ($("newOwner").value.trim()) out.push(v3Tx(vault, "transferOwnership", [requireAddress($("newOwner").value, "New owner")], "transfer ownership", { confirm: "Transfer full owner control of this auto-compounder?" }));
          return out;
        }),
        action("Recover token balance", h("div", { class: "form two" }, h("label", {}, "Token", input("rescueToken", "", "0x…")), h("label", {}, "Raw amount", input("rescueAmount", "", "uint256"))), "rescueToken", "Build recovery", () => v3Tx(vault, "rescueTokens", [requireAddress($("rescueToken").value, "Token"), BigInt($("rescueAmount").value)], "recover token")),
        action("Upgrade implementation", h("div", { class: "form" }, h("label", {}, "New implementation", input("newImpl", "", "0x…"))), "newImpl", "Build UUPS upgrade", () => v3Tx(vault, "upgradeToAndCall", [requireAddress($("newImpl").value, "Implementation"), "0x"], "upgrade implementation", { warning: "This replaces the vault logic. Confirm storage-layout compatibility before execution.", confirm: `Upgrade ${vault.name} implementation?` })),
      ),
    );
  }

  async function scanV3Balances() {
    const provider = providerFor(8453);
    if (!provider) throw new Error(state.networkErrors[8453] || "Base RPC unavailable.");
    const found = [];
    await Promise.all(state.v3Vaults.filter((v) => v.available).map(async (vault) => {
      const tokens = [...new Set([vault.token0, vault.token1].filter(Boolean))];
      await Promise.all(tokens.map(async (tokenAddress) => {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        const [balance, symbol, decimals] = await Promise.all([token.balanceOf(vault.address), safeCall(token.symbol(), short(tokenAddress)), safeCall(token.decimals(), 18)]);
        if (balance > 0n) found.push({ vault, tokenAddress, balance, symbol, decimals: Number(decimals) });
      }));
    }));
    return found;
  }

  async function onScanV3() {
    const box = $("v3ScanResult");
    box.replaceChildren(h("p", { class: "muted" }, "Scanning Base compounders…"));
    try {
      const found = await scanV3Balances();
      if (!found.length) {
        box.replaceChildren(h("p", { class: "result ok" }, "No token balances found in the registered V3 compounders."));
        return;
      }
      const table = h("table", {}, h("thead", {}, h("tr", {}, ...["Vault", "Token", "Balance", "Owner"].map((x) => h("th", {}, x)))), h("tbody", {}, found.map((item) => h("tr", {},
        h("td", {}, item.vault.name),
        h("td", {}, ext(`${networkFor(8453).explorer}/address/${item.tokenAddress}`, item.symbol)),
        h("td", {}, fmt(item.balance, item.decimals, 8)),
        h("td", {}, item.vault.owner ? labelFor(item.vault.owner) : "unknown"),
      ))));
      const slot = h("div", {});
      box.replaceChildren(h("div", { class: "table-wrap" }, table), h("p", { class: "muted" }, "Recovery calls go to each vault owner. Review and simulate the calls before adding them to the Base batch."), h("button", { class: "btn primary", onclick: () => {
        found.forEach((item) => addToBatch(v3Tx(item.vault, "rescueTokens", [item.tokenAddress, item.balance], `recover ${fmt(item.balance, item.decimals, 6)} ${item.symbol}`)));
        slot.replaceChildren(h("span", { class: "result ok" }, `Added ${found.length} recovery call(s) to the batch.`));
      } }, `Add ${found.length} recovery calls to batch`), slot);
    } catch (e) {
      box.replaceChildren(h("div", { class: "result err" }, `Scan failed: ${decodeError(e)}`));
    }
  }

  async function loadAssets() {
    const registry = [
      { name: "ITP", chainId: 10, address: CFG.tokens.itpOptimism, holders: [CFG.staking, CFG.factory] },
      { name: "ITP", chainId: 8453, address: CFG.tokens.itpBase, holders: CFG.v3Compounders.map((v) => v.address) },
      { name: "cbEGGS", chainId: 8453, address: CFG.tokens.cbEggsBase, holders: CFG.v3Compounders.map((v) => v.address) },
      { name: "cbXRP", chainId: 8453, address: CFG.tokens.cbXrpBase, holders: CFG.v3Compounders.map((v) => v.address) },
      { name: "AERO", chainId: 8453, address: CFG.tokens.aeroBase, holders: CFG.v3Compounders.map((v) => v.address) },
      { name: "WETH", chainId: 8453, address: CFG.tokens.wethBase, holders: CFG.v3Compounders.map((v) => v.address) },
      { name: "SATO", chainId: 1, address: CFG.tokens.satoEthereum, holders: [CFG.stsato, CFG.dao] },
      { name: "stSATO", chainId: 1, address: CFG.tokens.stSatoEthereum, holders: [CFG.dao] },
    ];
    state.assets = await Promise.all(registry.map(async (asset) => {
      const provider = providerFor(asset.chainId);
      if (!provider) return { ...asset, error: state.networkErrors[asset.chainId] || "RPC unavailable." };
      const token = new ethers.Contract(asset.address, ERC20_ABI, provider);
      const [symbol, decimals, totalSupply, balances] = await Promise.all([
        safeCall(token.symbol(), asset.name),
        safeCall(token.decimals(), 18),
        safeCall(token.totalSupply(), null),
        Promise.all(asset.holders.map(async (holder) => [holder, await safeCall(token.balanceOf(holder), 0n)])),
      ]);
      return { ...asset, symbol, decimals: Number(decimals), totalSupply, balances: balances.filter(([, balance]) => balance > 0n) };
    }));
    renderAssets();
    await loadStSato();
  }

  function renderAssets() {
    $("assetsGrid").replaceChildren(...state.assets.map((asset) => {
      const network = networkFor(asset.chainId);
      const balances = asset.balances?.length ? asset.balances.map(([holder, amount]) => h("div", { class: "row between" }, h("span", {}, labelFor(holder)), h("span", {}, fmt(amount, asset.decimals, 6)))) : [h("div", { class: "muted" }, "No protocol-held balance detected")];
      return h("div", { class: "card" },
        h("div", { class: "row between" }, h("h3", {}, `${asset.name} · ${network.chainName}`), ext(`${network.explorer}/address/${asset.address}`, "Explorer")),
        h("div", { class: "muted mono" }, asset.address),
        asset.error ? h("div", { class: "result warn" }, asset.error) : null,
        h("div", { class: "stat-label" }, "Total supply"),
        h("div", { class: "stat-value" }, asset.totalSupply == null ? "Unavailable" : fmt(asset.totalSupply, asset.decimals, 4)),
        h("h4", {}, "Known protocol balances"),
        ...balances,
      );
    }));
  }

  async function loadStSato() {
    const provider = providerFor(1);
    if (!provider) {
      $("stsatoSummary").replaceChildren(h("p", { class: "result warn" }, state.networkErrors[1] || "Ethereum RPC unavailable."));
      return;
    }
    const stSato = new ethers.Contract(CFG.stsato, [...STSATO_ABI, ...ERC20_ABI], provider);
    const sato = new ethers.Contract(CFG.sato, ERC20_ABI, provider);
    const [owner, started, supply, backing, minted, burned, price, satoBalance] = await Promise.all([
      safeCall(stSato.owner(), null), safeCall(stSato.start(), null), safeCall(stSato.totalSupply(), null), safeCall(stSato.getBacking(), null),
      safeCall(stSato.totalMinted(), null), safeCall(stSato.totalFeesBurned(), null), safeCall(stSato.lastPrice(), null), safeCall(sato.balanceOf(CFG.stsato), null),
    ]);
    state.stsato = { owner, started, supply, backing, minted, burned, price, satoBalance };
    const value = (x, decimals = 18) => x == null ? "Unavailable" : fmt(x, decimals, 6);
    $("stsatoSummary").replaceChildren(kv([
      ["Started", started == null ? "Unavailable" : started ? badge("ok", "yes") : badge("warn", "not started")],
      ["Owner", owner ? addrLink(owner, eq(owner, ethers.ZeroAddress) ? "renounced" : owner) : "Unavailable"],
      ["stSATO supply", value(supply)], ["SATO backing", value(backing)], ["SATO held by contract", value(satoBalance)],
      ["Lifetime minted", value(minted)], ["Fees burned", value(burned)], ["Last price", value(price)],
    ]));
  }

  // ---------- overview ----------

  function renderOverview() {
    const admins = state.roles.find((r) => r.name === "DEFAULT_ADMIN_ROLE")?.members || [];
    const vImplLabel = CFG.knownVaultImplementations.find((k) => eq(k.address, state.beaconImpl))?.label || "unknown version";
    const deadGauges = state.vaults.filter((v) => v.alive === false).length;

    const card = (label, value, extra) => h("div", { class: "card" }, h("div", { class: "stat-label" }, label), h("div", { class: "stat-value" }, value), extra ? h("div", { class: "muted" }, extra) : null);

    const cards = [
      card("Factory (proxy)", addrLink(CFG.factory, CFG.factory), h("span", {}, "implementation ", addrLink(state.factoryImpl, short(state.factoryImpl)))),
      card("Vault implementation", addrLink(state.beaconImpl, state.beaconImpl), vImplLabel),
      card("Beacon", addrLink(state.beacon, state.beacon), h("span", {}, "owner ", addrLink(state.beaconOwner))),
      card("DAO Safe", addrLink(CFG.dao, CFG.dao), state.safe?.threshold ? `${state.safe.threshold} of ${state.safe.owners.length} signers` : "Safe"),
      card("Vaults", `${state.vaults.filter((v) => v.active).length} active / ${state.vaults.length} total`, deadGauges ? `${deadGauges} with a killed gauge` : "all gauges alive"),
      card("Admins (DEFAULT_ADMIN_ROLE)", h("span", {}, ...admins.flatMap((a, i) => [i ? ", " : "", addrLink(a)])), admins.length ? null : "none"),
    ];
    if (state.staking) cards.push(card("ITP Staking V1", addrLink(CFG.staking, CFG.staking), state.staking.totalStaked == null ? "metrics unavailable" : `${fmt(state.staking.totalStaked)} ITP staked`));
    if (state.v3Vaults.length) cards.push(card("Uniswap V3 compounders", `${state.v3Vaults.filter((v) => v.available).length} live / ${state.v3Vaults.length} registered`, "Base"));
    if (state.assets.length) cards.push(card("cbEGGS", addrLink(CFG.tokens.cbEggsBase, "Base token"), "Supply and compounder balances in Assets"));
    $("overviewCards").replaceChildren(...cards);

    const repoFile = (p) => `${CFG.repo}/${p}`;
    $("codeLinks").replaceChildren(
      h("li", {}, ext(repoFile(CFG.vaultSourcePath), "Vault strategy source (InfiniteVaultStrategy.sol)"), " · GitHub"),
      h("li", {}, ext(`${CFG.repo.replace("/blob/", "/tree/")}/${CFG.auditsPath}`, "Security reviews (contracts_audits/)"), " · GitHub"),
      h("li", {}, "Current vault implementation: ", ext(`${CFG.blockscout}/address/${state.beaconImpl}?tab=contract`, "Blockscout"), " · ", ext(`${CFG.explorer}/address/${state.beaconImpl}#code`, "Etherscan")),
      h("li", {}, "Factory implementation: ", ext(`${CFG.blockscout}/address/${state.factoryImpl}?tab=contract`, "Blockscout"), " · ", ext(`${CFG.explorer}/address/${state.factoryImpl}#code`, "Etherscan")),
      h("li", {}, "Beacon: ", ext(`${CFG.blockscout}/address/${state.beacon}?tab=contract`, "Blockscout")),
      h("li", {}, "DAO Safe: ", ext(`${CFG.safeApp}${CFG.dao}`, "Safe app")),
    );

    const warnings = [];
    if (!admins.some((a) => eq(a, CFG.dao))) warnings.push("The DAO Safe does not hold DEFAULT_ADMIN_ROLE.");
    const others = admins.filter((a) => !eq(a, CFG.dao));
    if (others.length) warnings.push(`Other admin(s) besides the DAO: ${others.map(short).join(", ")}.`);
    if (!eq(state.vaultImplRecorded, state.beaconImpl)) warnings.push("factory.vaultImplementationAddress differs from the beacon's implementation.");
    if (warnings.length) notice("warn", warnings.map((w) => h("div", {}, `⚠ ${w}`)));
    else $("notice").className = "notice hidden";
  }

  // ---------- vaults ----------

  function ownerBadge(owner) {
    if (eq(owner, CFG.dao)) return badge("ok", "DAO Safe");
    if (eq(owner, CFG.factory)) return badge("info", "Factory");
    return badge("warn", short(owner));
  }

  function renderVaults() {
    const head = h("tr", {}, ...["Vault", "Owner", "TVL (LP)", "Status", "Harvest on deposit/withdraw", "Last harvest", "Pending reward", "Perf. fee", "Withdraw fee"].map((t) => h("th", {}, t)));
    const rows = state.vaults.map((v) =>
      h(
        "tr",
        { class: `clickable ${state.selected === v.address ? "selected" : ""}`, onclick: () => selectVault(v.address) },
        h("td", {}, h("div", {}, v.name), h("div", { class: "muted mono" }, short(v.address))),
        h("td", {}, ownerBadge(v.owner)),
        h("td", {}, fmt(v.tvl)),
        h(
          "td",
          {},
          v.active ? badge("ok", "active") : badge("warn", "inactive"),
          " ",
          v.paused ? badge("err", "paused") : null,
          " ",
          v.alive === false ? badge("err", "gauge killed") : null,
        ),
        h("td", {}, v.hod === null ? "–" : v.hod ? badge("ok", "on") : badge("warn", "off")),
        h("td", {}, ago(v.last)),
        h("td", {}, v.rewards == null ? "–" : `${fmt(v.rewards)} VELO`),
        h("td", {}, v.fc.active ? pct(v.fc.total) : "off"),
        h("td", {}, `${(Number(v.wfee) / 100).toFixed(2)}%`),
      ),
    );
    $("vaultTable").replaceChildren(h("thead", {}, head), h("tbody", {}, rows));
  }

  // Vaults owned by the factory are configured through factory.setVault*; others directly by their owner.
  function vaultTx(v, method, args, label, opts = {}) {
    const viaFactory = eq(v.owner, CFG.factory);
    const factoryMap = {
      setFeeCategory: "setVaultFeeCategory",
      setWithdrawalFee: "setVaultWithdrawalFee",
      setSlippageTolerance: "setVaultSlippageTolerance",
      setInfiniteFeeRecipient: "setVaultInfiniteFeeRecipient",
      setHarvestOnDeposit: "setVaultHarvestOnDeposit",
      transferOwnership: "transferVaultOwnership",
      pause: "pauseVault",
      unpause: "unpauseVault",
    };
    if (viaFactory) {
      const fm = factoryMap[method];
      if (!fm) throw new Error(`${method} is not exposed by the factory; transfer the vault's ownership to the DAO first.`);
      const role = method === "transferOwnership" ? "DEFAULT_ADMIN_ROLE" : "SETTINGS_ADMIN_ROLE";
      return { ...opts, label: `${v.name}: ${label}`, to: CFG.factory, data: fIface.encodeFunctionData(fm, [v.address, ...args]), sender: `holder of ${role}` };
    }
    return { ...opts, label: `${v.name}: ${label}`, to: v.address, data: vIface.encodeFunctionData(method, args), sender: `vault owner (${labelFor(v.owner)})` };
  }

  function factoryTx(method, args, label, sender, opts = {}) {
    return { ...opts, label, to: CFG.factory, data: fIface.encodeFunctionData(method, args), sender };
  }

  function selectVault(address) {
    state.selected = address;
    renderVaults();
    const v = state.vaults.find((x) => eq(x.address, address));
    const panel = $("vaultPanel");
    panel.classList.remove("hidden");

    const input = (id, value, placeholder) => h("input", { id, value: value ?? "", placeholder: placeholder || "" });
    const slot = () => h("div", {});
    const sub = (title, body, buildBtn) => h("div", { class: "subcard" }, h("h4", {}, title), body, buildBtn);

    const s = { fee: slot(), wfee: slot(), recipient: slot(), hod: slot(), pause: slot(), harvest: slot(), owner: slot(), recover: slot(), registry: slot() };

    const routing = eq(v.owner, CFG.factory)
      ? "Owned by the factory: settings are sent through factory.setVault* (requires SETTINGS_ADMIN_ROLE)."
      : `Owned by ${labelFor(v.owner)}: settings are sent directly to the vault by its owner.`;

    panel.replaceChildren(
      h("div", { class: "row between" }, h("h3", {}, v.name), h("button", { class: "btn small", onclick: () => panel.classList.add("hidden") }, "Close")),
      kv([
        ["Vault", addrLink(v.address, v.address)],
        ["Owner", h("span", {}, ownerBadge(v.owner), " ", h("span", { class: "muted" }, routing))],
        ["Want (pool)", addrLink(v.want, v.want)],
        ["Gauge", h("span", {}, addrLink(v.gauge, v.gauge), " ", v.alive === false ? badge("err", "killed by Velodrome") : badge("ok", "alive"))],
        ["Router", v.router ? addrLink(v.router, v.router) : "–"],
        ["Fee recipient", addrLink(v.feeRec)],
        ["Performance fee", `${pct(v.fc.total)} of rewards · split infinite ${pct(v.fc.infinite)} / caller ${pct(v.fc.call)} / burn ${pct(v.fc.burn)} · “${v.fc.label}”`],
        ["Slippage tolerance", `${(Number(v.slip) / 100).toFixed(2)}%`],
        ["Shares / TVL", `${fmt(v.supply)} shares · ${fmt(v.tvl)} LP`],
      ]),
      h(
        "div",
        { class: "subgrid" },
        sub(
          "Performance fee",
          h(
            "div",
            { class: "form two" },
            h("label", {}, "Total % of rewards (≤ 50)", input("fTotal", ethers.formatUnits(v.fc.total, 16))),
            h("label", {}, "Label", input("fLabel", v.fc.label)),
            h("label", {}, "Infinite share %", input("fInf", ethers.formatUnits(v.fc.infinite, 16))),
            h("label", {}, "Caller share %", input("fCall", ethers.formatUnits(v.fc.call, 16))),
            h("label", {}, "Burn share %", input("fBurn", ethers.formatUnits(v.fc.burn, 16))),
          ),
          [h("button", { class: "btn", onclick: () => showTx(s.fee, () => {
            const w = (id) => ethers.parseUnits(($(id).value || "0").trim(), 16);
            const total = w("fTotal");
            const parts = [w("fInf"), w("fCall"), w("fBurn")];
            if (total > ethers.parseUnits("50", 16)) throw new Error("Total fee must be ≤ 50%.");
            if (parts.reduce((a, b) => a + b, 0n) !== ethers.parseUnits("100", 16)) throw new Error("Shares must sum to exactly 100%.");
            return vaultTx(v, "setFeeCategory", [total, ...parts, $("fLabel").value || "Custom"], "set performance fee");
          }) }, "Build"), s.fee],
        ),
        sub(
          "Withdrawal fee & slippage",
          h(
            "div",
            { class: "form two" },
            h("label", {}, "Withdrawal fee (bps, ≤ 500)", input("wFee", String(v.wfee))),
            h("label", {}, "Slippage (bps, ≤ 1000)", input("wSlip", String(v.slip))),
          ),
          [h("button", { class: "btn", onclick: () => showTx(s.wfee, () => {
            const fee = BigInt($("wFee").value);
            const slip = BigInt($("wSlip").value);
            if (fee > 500n) throw new Error("Withdrawal fee max is 500 bps.");
            if (slip > 1000n) throw new Error("Slippage max is 1000 bps.");
            const out = [];
            if (fee !== v.wfee) out.push(vaultTx(v, "setWithdrawalFee", [fee], `withdrawal fee → ${fee} bps`));
            if (slip !== v.slip) out.push(vaultTx(v, "setSlippageTolerance", [slip], `slippage → ${slip} bps`));
            if (!out.length) throw new Error("No change.");
            return out;
          }) }, "Build"), s.wfee],
        ),
        sub(
          "Fee recipient",
          h("div", { class: "form" }, h("label", {}, "Infinite fee recipient", input("feeRec", v.feeRec))),
          [h("button", { class: "btn", onclick: () => showTx(s.recipient, () => vaultTx(v, "setInfiniteFeeRecipient", [requireAddress($("feeRec").value, "Recipient")], "set fee recipient")) }, "Build"), s.recipient],
        ),
        sub(
          "Harvest on deposit / withdraw",
          h("p", { class: "muted" }, `Currently ${v.hod ? "ON" : "OFF"}. When on, every deposit and withdrawal compounds first, so pending rewards are priced fairly.`),
          [
            h("div", { class: "row" },
              h("button", { class: "btn", onclick: () => showTx(s.hod, () => vaultTx(v, "setHarvestOnDeposit", [true], "harvest on deposit/withdraw ON")) }, "Turn on"),
              h("button", { class: "btn", onclick: () => showTx(s.hod, () => vaultTx(v, "setHarvestOnDeposit", [false], "harvest on deposit/withdraw OFF")) }, "Turn off")),
            s.hod,
          ],
        ),
        sub(
          "Pause / emergency",
          h("p", { class: "muted" }, "Pause blocks deposits and harvests; withdrawals stay open. Panic also pulls all LP out of the gauge."),
          [
            h("div", { class: "row" },
              h("button", { class: "btn", onclick: () => showTx(s.pause, () => vaultTx(v, "pause", [], "pause")) }, "Pause"),
              h("button", { class: "btn", onclick: () => showTx(s.pause, () => vaultTx(v, "unpause", [], "unpause")) }, "Unpause"),
              h("button", { class: "btn danger", onclick: () => showTx(s.pause, () => vaultTx(v, "panic", [], "PANIC (pause + exit gauge)", { confirm: "Panic pauses the vault and withdraws all LP from the gauge. Continue?" })) }, "Panic")),
            s.pause,
          ],
        ),
        sub(
          "Harvest now",
          h("div", { class: "form" }, h("label", {}, "Call-fee recipient", input("hvRec", state.account || CFG.dao))),
          [h("button", { class: "btn", onclick: () => showTx(s.harvest, () => ({
            label: `${v.name}: harvest`,
            to: v.address,
            data: vIface.encodeFunctionData("harvest", [requireAddress($("hvRec").value, "Recipient")]),
            sender: "anyone",
          })) }, "Build"), s.harvest],
        ),
        sub(
          "Transfer vault ownership",
          h("div", { class: "form" }, h("label", {}, "New owner", input("newOwner", "", "0x…"))),
          [h("button", { class: "btn", onclick: () => showTx(s.owner, () => vaultTx(v, "transferOwnership", [requireAddress($("newOwner").value, "New owner")], "transfer ownership", { confirm: "The new owner gets full control of this vault's settings. Continue?" })) }, "Build"), s.owner],
        ),
        sub(
          "Recover stuck token",
          h("p", { class: "muted" }, "inCaseTokensGetStuck sends the vault's whole balance of a token (never the LP) to the owner."),
          [h("div", { class: "form" }, h("label", {}, "Token", input("recToken", "", "0x…"))),
            h("button", { class: "btn", onclick: () => showTx(s.recover, () => vaultTx(v, "inCaseTokensGetStuck", [requireAddress($("recToken").value, "Token")], "recover token")) }, "Build"), s.recover],
        ),
        sub(
          "Factory registry",
          h("p", { class: "muted" }, `Status: ${v.active ? "active" : "inactive"}. Inactive vaults are skipped by the keeper and factory batch functions.${v.alive === false ? " This gauge is killed: deactivating is recommended." : ""}`),
          [
            h("div", { class: "row" },
              h("button", { class: "btn", onclick: () => showTx(s.registry, () => factoryTx("deactivateVault", [v.address], `${v.name}: deactivate`, "holder of DEFAULT_ADMIN_ROLE")) }, "Deactivate"),
              h("button", { class: "btn", onclick: () => showTx(s.registry, () => factoryTx("reactivateVault", [v.address], `${v.name}: reactivate`, "holder of DEFAULT_ADMIN_ROLE")) }, "Reactivate")),
            s.registry,
          ],
        ),
      ),
    );
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // ---------- rescue stuck tokens ----------

  async function scanStuckTokens() {
    const out = [];
    await Promise.all(
      state.vaults.map(async (v) => {
        const c = new ethers.Contract(v.address, VAULT_ABI, state.read);
        const [t0, t1] = await Promise.all([c.lpToken0(), c.lpToken1()]);
        // The vault refuses to release its LP (want), so only pair tokens and the reward token are rescuable.
        const tokens = [...new Set([t0, t1, v.output].map((t) => ethers.getAddress(t)))].filter((t) => !eq(t, v.want));
        await Promise.all(
          tokens.map(async (t) => {
            const erc = new ethers.Contract(t, ERC20_ABI, state.read);
            const [bal, sym, dec] = await Promise.all([erc.balanceOf(v.address), safeCall(erc.symbol(), short(t)), safeCall(erc.decimals(), 18)]);
            // Ignore dust below 0.0001 token; rounding leftovers are not worth a call.
            const dust = 10n ** BigInt(Math.max(Number(dec) - 4, 0));
            if (bal >= dust) out.push({ vault: v, token: t, symbol: sym, decimals: Number(dec), balance: bal });
          }),
        );
      }),
    );
    return out.sort((a, b) => a.vault.name.localeCompare(b.vault.name) || a.symbol.localeCompare(b.symbol));
  }

  function rescueTx(i) {
    return {
      label: `${i.vault.name}: rescue ${fmt(i.balance, i.decimals, 6)} ${i.symbol}`,
      to: i.vault.address,
      data: vIface.encodeFunctionData("inCaseTokensGetStuck", [i.token]),
      sender: `vault owner (${labelFor(i.vault.owner)})`,
    };
  }

  async function onScanRescue() {
    const box = $("rescueResult");
    box.replaceChildren(h("p", { class: "muted" }, "Scanning vault balances…"));
    try {
      const items = await scanStuckTokens();
      if (!items.length) {
        box.replaceChildren(h("p", { class: "result ok" }, "No rescuable balances (above dust) in any vault. Nothing to do."));
        return;
      }
      const viaFactory = (i) => eq(i.vault.owner, CFG.factory);
      const rescuable = items.filter((i) => !viaFactory(i));
      const skipped = items.length - rescuable.length;
      const owners = new Set(rescuable.map((i) => i.vault.owner.toLowerCase()));
      const slot = h("div", {});
      const nodes = [
        h(
          "div",
          { class: "table-wrap" },
          h(
            "table",
            {},
            h("thead", {}, h("tr", {}, ...["Vault", "Token", "Amount", "Sent to"].map((t) => h("th", {}, t)))),
            h(
              "tbody",
              {},
              items.map((i) =>
                h(
                  "tr",
                  {},
                  h("td", {}, i.vault.name),
                  h("td", {}, addrLink(i.token, i.symbol)),
                  h("td", {}, fmt(i.balance, i.decimals, 6)),
                  h("td", {}, viaFactory(i) ? badge("warn", "factory-owned: skipped") : labelFor(i.vault.owner)),
                ),
              ),
            ),
          ),
        ),
        h("p", { class: "muted" }, `${rescuable.length} rescue call(s). Tokens go to the vault owner, which must be the direct caller, so they cannot go through Multicall3; export them as one Safe batch so they execute in a single transaction.`),
        h("p", { class: "result warn" }, "⚠ These idle tokens would otherwise be compounded into LP for depositors on the next harvest."),
        skipped ? h("p", { class: "result warn" }, `⚠ ${skipped} balance(s) are in factory-owned vaults; the factory has no rescue function. Transfer those vaults to the DAO first.`) : null,
        owners.size > 1 ? h("p", { class: "result warn" }, "⚠ Vaults have different owners; each call must be sent by its own vault owner.") : null,
        h(
          "div",
          { class: "row" },
          h("button", {
            class: "btn primary",
            disabled: !rescuable.length,
            onclick: () => {
              rescuable.forEach((i) => addToBatch(rescueTx(i)));
              slot.replaceChildren(h("span", { class: "result ok" }, `Added ${rescuable.length} call(s) to the batch. Open the Batch tab to export them for the Safe.`));
            },
          }, `Add all ${rescuable.length} to batch`),
          h("button", { class: "btn", disabled: !rescuable.length, onclick: () => showTx(slot, () => rescuable.map(rescueTx)) }, "Show / simulate each"),
        ),
        slot,
      ];
      box.replaceChildren(...nodes.filter(Boolean));
    } catch (e) {
      box.replaceChildren(h("div", { class: "result err" }, `✗ ${decodeError(e)}`));
    }
  }

  function buildHarvestAll() {
    const recipient = requireAddress($("harvestRecipient").value, "Recipient");
    const active = state.vaults.filter((v) => v.active && !v.paused);
    const calls = active.map((v) => [v.address, true, vIface.encodeFunctionData("harvest", [recipient])]);
    return {
      label: `Harvest ${active.length} active vaults → fees to ${short(recipient)}`,
      to: CFG.multicall3,
      data: mcIface.encodeFunctionData("aggregate3", [calls]),
      sender: "anyone",
    };
  }

  // ---------- upgrades ----------

  async function inspectContract(addr, current, kind) {
    const code = await state.read.getCode(addr);
    if (code === "0x") throw new Error("No contract deployed at this address on Optimism.");
    if (eq(addr, current)) throw new Error("This is already the current implementation.");
    let verified = h("span", { class: "muted" }, "check the explorer links below");
    try {
      const r = await fetch(`${CFG.blockscout}/api/v2/smart-contracts/${addr}`);
      if (r.ok) {
        const j = await r.json();
        verified = j.is_verified ? `${j.name} · ${j.compiler_version}` : "NOT verified";
      }
    } catch {
      /* explorer unreachable */
    }
    const pairs = [
      ["Bytecode", `${(code.length - 2) / 2} bytes`],
      ["Verified source", verified],
      ["View code", h("span", {}, ext(`${CFG.blockscout}/address/${addr}?tab=contract`, "Blockscout"), " · ", ext(`${CFG.explorer}/address/${addr}#code`, "Etherscan"))],
    ];
    if (kind === "factory") {
      const uuid = await safeCall(state.read.call({ to: addr, data: "0x52d1902d" }));
      pairs.push(["proxiableUUID", uuid && uuid.toLowerCase() === IMPL_SLOT ? badge("ok", "UUPS-compatible") : badge("err", "missing/incorrect — upgrade would revert")]);
    }
    return kv(pairs);
  }

  function renderUpgrades() {
    $("beaconInfo").replaceChildren(
      kv([
        ["Beacon", addrLink(state.beacon, state.beacon)],
        ["Beacon owner", addrLink(state.beaconOwner)],
        ["Current implementation", h("span", {}, addrLink(state.beaconImpl, state.beaconImpl), " ", h("span", { class: "muted" }, labelFor(state.beaconImpl)))],
        ["factory.vaultImplementationAddress", eq(state.vaultImplRecorded, state.beaconImpl) ? badge("ok", "in sync") : badge("warn", state.vaultImplRecorded)],
      ]),
    );
    $("factoryImplInfo").replaceChildren(kv([["Current factory implementation", addrLink(state.factoryImpl, state.factoryImpl)]]));
    const sel = $("knownImpls");
    sel.replaceChildren(h("option", { value: "" }, "—"), ...CFG.knownVaultImplementations.map((k) => h("option", { value: k.address }, `${k.label} (${short(k.address)})`)));
  }

  async function onInspectVaultImpl() {
    $("vaultImplTx").replaceChildren();
    try {
      const addr = requireAddress($("newVaultImpl").value, "Implementation");
      $("vaultImplInspect").replaceChildren(await inspectContract(addr, state.beaconImpl, "vault"));
      showTx("vaultImplTx", () =>
        factoryTx("upgradeBeacon", [addr], `Upgrade ALL vaults to ${labelFor(addr)}`, "holder of DEFAULT_ADMIN_ROLE", {
          warning: "Switches the logic of every vault at once. Only use implementations reviewed for storage-layout compatibility.",
          confirm: `Upgrade all ${state.vaults.length} vaults to ${addr}?`,
        }),
      );
    } catch (e) {
      $("vaultImplInspect").replaceChildren(h("div", { class: "result err" }, `✗ ${e.message}`));
    }
  }

  async function onInspectFactoryImpl() {
    $("factoryImplTx").replaceChildren();
    try {
      const addr = requireAddress($("newFactoryImpl").value, "Implementation");
      $("factoryImplInspect").replaceChildren(await inspectContract(addr, state.factoryImpl, "factory"));
      showTx("factoryImplTx", () =>
        factoryTx("upgradeToAndCall", [addr, "0x"], `Upgrade FACTORY to ${short(addr)}`, "holder of DEFAULT_ADMIN_ROLE", {
          warning: "Replaces the factory logic, including role checks and upgradeBeacon. A broken implementation can lock the factory forever.",
          confirm: `Upgrade the factory implementation to ${addr}?`,
        }),
      );
    } catch (e) {
      $("factoryImplInspect").replaceChildren(h("div", { class: "result err" }, `✗ ${e.message}`));
    }
  }

  // ---------- roles ----------

  function renderRoles() {
    const rows = state.roles.map((r) => {
      const slot = h("div", {});
      const lastAdmin = r.id === ZERO_ROLE && r.members.length === 1;
      const members = r.members.length
        ? r.members.map((m) =>
            h(
              "div",
              { class: "row" },
              addrLink(m),
              h("button", {
                class: "btn small danger",
                onclick: () => showTx(slot, () => factoryTx("revokeRole", [r.id, m], `revoke ${r.name} from ${labelFor(m)}`, "holder of DEFAULT_ADMIN_ROLE", lastAdmin ? { warning: "Last admin: revoking leaves the factory with NO admin, permanently.", confirm: "This removes the LAST admin. Nobody will ever be able to upgrade or manage roles again. Continue?" } : {})),
              }, "Revoke"),
              eq(m, state.account)
                ? h("button", {
                    class: "btn small",
                    onclick: () => showTx(slot, () => ({ ...factoryTx("renounceRole", [r.id, m], `renounce ${r.name} (${short(m)})`, `${short(m)} itself`), confirm: `Renounce ${r.name} for your own address?` })),
                  }, "Renounce")
                : null,
            ),
          )
        : [h("span", { class: "muted" }, "nobody")];
      return h("tr", {}, h("td", {}, h("div", {}, r.name), h("div", { class: "muted" }, r.desc)), h("td", {}, members, slot));
    });
    $("rolesTable").replaceChildren(h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Role"), h("th", {}, "Members"))), h("tbody", {}, rows)));
    $("grantRoleSel").replaceChildren(...state.roles.map((r) => h("option", { value: r.id }, r.name)));
    if (!$("grantRoleAccount").value) $("grantRoleAccount").value = CFG.dao;
  }

  // ---------- create vault ----------

  async function readRoute(v, fn) {
    const out = [];
    for (let i = 0; i < 6; i++) {
      try {
        const r = await v[fn](i);
        out.push([r.from, r.to, r.stable, r.factory]);
      } catch {
        break;
      }
    }
    return out;
  }

  const routeText = (r) => (r.length ? `[\n${r.map((x) => `  ${JSON.stringify(x)}`).join(",\n")}\n]` : "[]");

  async function copyRoutesFrom(address) {
    if (!address) return;
    const v = new ethers.Contract(address, VAULT_ABI, state.read);
    const [n, l0, l1] = await Promise.all([readRoute(v, "outputToNativeRoute"), readRoute(v, "outputToLp0Route"), readRoute(v, "outputToLp1Route")]);
    $("cvRouteNative").value = routeText(n);
    $("cvRouteLp0").value = routeText(l0);
    $("cvRouteLp1").value = routeText(l1);
  }

  async function lookupPool() {
    const box = $("cvPoolInfo");
    try {
      const want = requireAddress($("cvWant").value, "Pool");
      const pair = new ethers.Contract(want, PAIR_ABI, state.read);
      const [t0, t1, stable] = await Promise.all([pair.token0(), pair.token1(), pair.stable()]);
      const sym = (t) => safeCall(new ethers.Contract(t, ERC20_ABI, state.read).symbol(), short(t));
      const [s0, s1] = await Promise.all([sym(t0), sym(t1)]);
      const voter = new ethers.Contract(CFG.velodromeVoter, VOTER_ABI, state.read);
      const gauge = await voter.gauges(want);
      const alive = gauge !== ethers.ZeroAddress ? await voter.isAlive(gauge) : false;
      const existing = await new ethers.Contract(CFG.factory, FACTORY_ABI, state.read).getVaultByWant(want);
      if (gauge !== ethers.ZeroAddress) $("cvGauge").value = gauge;
      box.replaceChildren(
        kv([
          ["Pair", `${s0} / ${s1} · ${stable ? "stable" : "volatile"}`],
          ["token0 / token1", h("span", {}, addrLink(t0, t0), " / ", addrLink(t1, t1))],
          ["Gauge", gauge === ethers.ZeroAddress ? badge("err", "no gauge for this pool") : h("span", {}, addrLink(gauge, gauge), " ", alive ? badge("ok", "alive") : badge("err", "killed"))],
          ["Existing vault", existing === ethers.ZeroAddress ? badge("ok", "none") : h("span", {}, badge("err", "already exists"), " ", addrLink(existing))],
        ]),
      );
      if (!$("cvName").value) $("cvName").value = `Infinite ${s0}-${s1} (ITP Rewards)`;
      if (!$("cvSymbol").value) $("cvSymbol").value = `i${s0}-${s1}`;
    } catch (e) {
      box.replaceChildren(h("div", { class: "result err" }, `✗ ${decodeError(e)}`));
    }
  }

  function parseRoute(id, label) {
    let arr;
    try {
      arr = JSON.parse($(id).value || "[]");
    } catch {
      throw new Error(`${label}: invalid JSON`);
    }
    if (!Array.isArray(arr)) throw new Error(`${label}: must be an array`);
    return arr.map((hop, i) => {
      if (!Array.isArray(hop) || hop.length !== 4) throw new Error(`${label} hop ${i}: expected [from, to, stable, factory]`);
      const [from, to, stable, factory] = hop;
      if (typeof stable !== "boolean") throw new Error(`${label} hop ${i}: stable must be true/false`);
      return [requireAddress(from, `${label} hop ${i} from`), requireAddress(to, `${label} hop ${i} to`), stable, requireAddress(factory, `${label} hop ${i} factory`)];
    });
  }

  function buildCreateVault() {
    const want = requireAddress($("cvWant").value, "Pool");
    const gauge = requireAddress($("cvGauge").value, "Gauge");
    const router = requireAddress($("cvRouter").value, "Router");
    const feeRec = requireAddress($("cvFeeRecipient").value, "Fee recipient");
    const name = $("cvName").value.trim();
    const symbol = $("cvSymbol").value.trim();
    if (!name || !symbol) throw new Error("Name and symbol are required.");
    const native = parseRoute("cvRouteNative", "outputToNativeRoute");
    const lp0 = parseRoute("cvRouteLp0", "outputToLp0Route");
    const lp1 = parseRoute("cvRouteLp1", "outputToLp1Route");
    if (!native.length) throw new Error("outputToNativeRoute cannot be empty.");
    for (const [label, r] of [["outputToLp0Route", lp0], ["outputToLp1Route", lp1]]) {
      if (r.length && !eq(r[0][0], native[0][0])) throw new Error(`${label} must start at the reward token ${short(native[0][0])}.`);
    }
    const creators = state.roles.find((r) => r.name === "VAULT_CREATOR_ROLE")?.members || [];
    const tx = factoryTx("createVault", [want, gauge, router, feeRec, name, symbol, native, lp0, lp1], `Create vault “${name}”`, "holder of VAULT_CREATOR_ROLE", {
      warning: creators.some((c) => eq(c, executor())) ? null : `${labelFor(executor())} does not hold VAULT_CREATOR_ROLE. Add the grant above to the same batch, before this transaction.`,
    });
    const out = [tx];
    if (!creators.some((c) => eq(c, executor())) && executor()) {
      const vc = state.roles.find((r) => r.name === "VAULT_CREATOR_ROLE").id;
      out.unshift(factoryTx("grantRole", [vc, executor()], `grant VAULT_CREATOR_ROLE to ${labelFor(executor())}`, "holder of DEFAULT_ADMIN_ROLE"));
    }
    return out;
  }

  // ---------- wiring ----------

  function wire() {
    document.querySelectorAll("#tabs button").forEach((b) =>
      b.addEventListener("click", () => {
        document.querySelectorAll("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
        document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.id === `tab-${b.dataset.tab}`));
      }),
    );
    $("connect").addEventListener("click", () => connect().catch((e) => notice("err", h("div", {}, e.message))));
    $("actAs").addEventListener("change", (e) => {
      state.actAs = e.target.value;
      if (state.vaults.length) renderRoles();
    });
    $("refresh").addEventListener("click", refresh);
    $("refreshStaking").addEventListener("click", () => loadStaking().catch((e) => $("stakingSummary").replaceChildren(h("p", { class: "result err" }, decodeError(e)))));
    $("refreshV3").addEventListener("click", () => loadV3().catch((e) => $("v3Table").replaceChildren(h("tbody", {}, h("tr", {}, h("td", { colspan: "7" }, decodeError(e)))))));
    $("refreshAssets").addEventListener("click", () => loadAssets().catch((e) => $("assetsGrid").replaceChildren(h("p", { class: "result err" }, decodeError(e)))));
    $("scanV3").addEventListener("click", onScanV3);
    $("buildStakingDeposit").addEventListener("click", () => showTx("stakingTx", buildStakingDeposit));
    $("buildStakingWithdrawRewards").addEventListener("click", () => showTx("stakingTx", () => buildStakingOperation("withdrawRewards", "stakingRewardAmount", "withdraw rewards")));
    $("buildStakingWithdrawPenalty").addEventListener("click", () => showTx("stakingTx", () => buildStakingOperation("withdrawPenalty", "stakingPenaltyAmount", "withdraw penalty")));
    $("buildStakingBurnPenalty").addEventListener("click", () => showTx("stakingTx", () => buildStakingOperation("burnPenalty", "stakingPenaltyAmount", "burn penalty")));
    $("buildStakingConvertPenalty").addEventListener("click", () => showTx("stakingTx", () => buildStakingOperation("convertPenaltyIntoRewards", "stakingPenaltyAmount", "convert penalty to rewards")));
    $("buildHarvestAll").addEventListener("click", () => showTx("harvestAllTx", buildHarvestAll));
    $("scanRescue").addEventListener("click", onScanRescue);
    $("knownImpls").addEventListener("change", (e) => {
      $("newVaultImpl").value = e.target.value;
    });
    $("inspectVaultImpl").addEventListener("click", onInspectVaultImpl);
    $("inspectFactoryImpl").addEventListener("click", onInspectFactoryImpl);
    $("buildGrant").addEventListener("click", () =>
      showTx("grantTx", () => {
        const role = $("grantRoleSel").value;
        const account = requireAddress($("grantRoleAccount").value, "Account");
        return factoryTx("grantRole", [role, account], `grant ${roleName(role)} to ${labelFor(account)}`, "holder of DEFAULT_ADMIN_ROLE");
      }),
    );
    $("cvLookup").addEventListener("click", lookupPool);
    $("cvCopyFrom").addEventListener("change", (e) => copyRoutesFrom(e.target.value).catch((err) => notice("err", h("div", {}, err.message))));
    $("buildCreate").addEventListener("click", () => showTx("createTx", buildCreateVault));
    $("batchExport").addEventListener("click", exportSafeBatch);
    $("batchNetwork").addEventListener("change", renderBatch);
    $("batchSend").addEventListener("click", sendBatch);
    $("batchClear").addEventListener("click", () => {
      if (window.confirm("Clear the batch?")) {
        state.batch = [];
        saveBatch();
      }
    });
    $("cvRouter").value = CFG.defaults.router;
    $("cvFeeRecipient").value = CFG.defaults.feeRecipient;
    $("footerLinks").replaceChildren(ext(`${CFG.repo}/dashboard/factory-admin`, "source"));
  }

  async function refresh() {
    try {
      await loadAll();
      renderOverview();
      renderVaults();
      renderUpgrades();
      renderRoles();
      $("cvCopyFrom").replaceChildren(h("option", { value: "" }, "—"), ...state.vaults.map((v) => h("option", { value: v.address }, v.name)));
      if (state.selected) selectVault(state.selected);
    } catch (e) {
      notice("err", h("div", {}, `Failed to load on-chain state: ${decodeError(e)}`));
    }
    await Promise.all([
      loadStaking().catch((e) => $("stakingSummary").replaceChildren(h("p", { class: "result err" }, decodeError(e)))),
      loadV3().catch((e) => $("v3Table").replaceChildren(h("tbody", {}, h("tr", {}, h("td", { colspan: "7" }, decodeError(e)))))),
      loadAssets().catch((e) => $("assetsGrid").replaceChildren(h("p", { class: "result err" }, decodeError(e)))),
    ]);
    if (state.roles.length) renderOverview();
  }

  async function main() {
    wire();
    saveBatch();
    try {
      await initRead();
    } catch (e) {
      notice("err", h("div", {}, e.message));
      return;
    }
    await refresh();
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: "eth_accounts" }).catch(() => []);
      if (accounts[0]) await connect().catch(() => {});
    }
  }

  main();
})();
