// Infinite Trading USD Yield vault module: monitor, DAO actions (Safe batch) and the browser-wallet deploy wizard.
// Depends on window.ITP_ADMIN exposed by app.js (loaded before this file).
(() => {
  "use strict";

  const { ethers } = window;
  const CFG = window.ITP_CONFIG;
  const Y = CFG.yieldVault;
  const A = window.ITP_ADMIN;
  if (!Y || !A) return;

  const CHAIN = Y.chainId;
  const WAD = 10n ** 18n;
  const YEAR = 365n * 24n * 3600n;
  const UINT128_MAX = (1n << 128n) - 1n;
  const ADDR_KEY = `itp-yield-deployment-${CHAIN}`;
  const WIZARD_KEY = `itp-yield-wizard-${CHAIN}`;
  const $ = (id) => document.getElementById(id);
  const { h } = A;
  const eq = (a, b) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
  const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");
  const explorer = () => A.networkFor(CHAIN)?.explorer || "https://basescan.org";
  const link = (a, text) => h("a", { href: `${explorer()}/address/${a}`, target: "_blank", rel: "noopener noreferrer" }, text || short(a));
  const pct = (wad, digits = 2) => `${(Number(wad) / 1e16).toFixed(digits)}%`;
  const usdc = (v) => `${Number(ethers.formatUnits(v, 6)).toLocaleString(undefined, { maximumFractionDigits: 2 })} USDC`;

  const VAULT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function asset() view returns (address)",
    "function totalAssets() view returns (uint256)",
    "function totalSupply() view returns (uint256)",
    "function convertToAssets(uint256) view returns (uint256)",
    "function owner() view returns (address)",
    "function curator() view returns (address)",
    "function adapterRegistry() view returns (address)",
    "function liquidityAdapter() view returns (address)",
    "function isAllocator(address) view returns (bool)",
    "function isSentinel(address) view returns (bool)",
    "function isAdapter(address) view returns (bool)",
    "function timelock(bytes4) view returns (uint256)",
    "function executableAt(bytes) view returns (uint256)",
    "function performanceFee() view returns (uint96)",
    "function performanceFeeRecipient() view returns (address)",
    "function managementFee() view returns (uint96)",
    "function maxRate() view returns (uint64)",
    "function submit(bytes data)",
    "function revoke(bytes data)",
    "function setIsSentinel(address account, bool isSentinel)",
    "function setName(string newName)",
    "function setSymbol(string newSymbol)",
    "function setIsAllocator(address account, bool newIsAllocator)",
    "function addAdapter(address account)",
    "function removeAdapter(address account)",
    "function setPerformanceFee(uint256 newPerformanceFee)",
    "function setPerformanceFeeRecipient(address newPerformanceFeeRecipient)",
    "function increaseAbsoluteCap(bytes idData, uint256 newAbsoluteCap)",
    "function decreaseAbsoluteCap(bytes idData, uint256 newAbsoluteCap)",
    "function increaseRelativeCap(bytes idData, uint256 newRelativeCap)",
    "function decreaseRelativeCap(bytes idData, uint256 newRelativeCap)",
    "function setForceDeallocatePenalty(address adapter, uint256 newForceDeallocatePenalty)",
    "event Submit(bytes4 indexed selector, bytes data, uint256 executableAt)",
    "event Revoke(address indexed sender, bytes4 indexed selector, bytes data)",
    "event Accept(bytes4 indexed selector, bytes data)",
  ];
  const REGISTRY_ABI = [
    "function owner() view returns (address)",
    "function pendingOwner() view returns (address)",
    "function UPGRADE_DELAY() view returns (uint256)",
    "function upgradeEta(address) view returns (uint256)",
    "function executors() view returns (address[])",
    "function integrationsOf(address vault) view returns (address[])",
    "function integration(address adapter) view returns ((address vault, address target, address rateReader, bool active, string name))",
    "function getApys(address vault) view returns (address[] adapters, uint256[] aprs, bool[] ok, bool[] active)",
    "function setExecutor(address account, bool allowed)",
    "function setIntegrationActive(address adapter, bool active)",
    "function setRateReader(address adapter, address rateReader)",
    "function setIntegrationName(address adapter, string name)",
    "function addIntegration(address vault, (address adapter, address target, address rateReader, string name) input)",
    "function proposeUpgrade(address implementation)",
    "function cancelUpgrade(address implementation)",
    "function upgradeToAndCall(address newImplementation, bytes data) payable",
    "function transferOwnership(address newOwner)",
  ];
  const ALLOCATOR_ABI = [
    "function owner() view returns (address)",
    "function minApyDelta() view returns (uint256)",
    "function cooldown() view returns (uint256)",
    "function lastRebalance() view returns (uint256)",
    "function paused() view returns (bool)",
    "function bestRebalance() view returns (bool ready, address from, address to, uint256 fromApr, uint256 toApr, uint256 readyAt)",
    "function positions() view returns (address[] adapters, uint256[] assets, uint256 idle)",
    "function requireRebalance(address to)",
    "function allocateIdle()",
    "function setMinApyDelta(uint256 newMinApyDelta)",
    "function setCooldown(uint256 newCooldown)",
    "function pause()",
    "function unpause()",
    "function setMaxRate(uint256 newMaxRate)",
    "function daoRebalance(address from, address to)",
  ];
  const ADAPTER_ABI = ["function setSkimRecipient(address newSkimRecipient)", "function skim(address token)"];
  const MVA_FACTORY_ABI = [
    "function morphoVaultV1Adapter(address parentVault, address morphoVaultV1) view returns (address)",
    "function createMorphoVaultV1Adapter(address parentVault, address morphoVaultV1) returns (address)",
  ];
  const COMP_FACTORY_ABI = [
    "function compoundV3Adapter(address parentVault, address comet) view returns (address)",
    "function createCompoundV3Adapter(address parentVault, address comet) returns (address)",
  ];
  const ERC20_ABI = ["function approve(address,uint256) returns (bool)", "function allowance(address,address) view returns (uint256)", "function balanceOf(address) view returns (uint256)"];

  const ERRORS = [
    "error AdapterTargetMismatch(address adapter, address target)",
    "error AdapterVaultMismatch(address adapter, address vault)",
    "error AlreadyRegistered(address adapter)",
    "error AssetMismatch()",
    "error ConfigMismatch()",
    "error CooldownActive(uint256 readyAt)",
    "error InsufficientApyGain(uint256 fromApr, uint256 toApr, uint256 required)",
    "error InsufficientSupply(uint256 requested, uint256 available)",
    "error InvalidConfig()",
    "error InvalidDelay()",
    "error IsPaused()",
    "error NoCode(address account)",
    "error NotActiveIntegration(address adapter)",
    "error NotBestIntegration(address best, uint256 bestApr)",
    "error NotDeployer()",
    "error NotExecutor()",
    "error NotExecutorOrOwner()",
    "error NotVaultAdapter(address adapter)",
    "error OutOfBounds()",
    "error PostConditionFailed(string what)",
    "error RateTooHigh(address adapter, uint256 aprWad)",
    "error RenounceDisabled()",
    "error SameAdapter()",
    "error UnknownIntegration(address adapter)",
    "error UpgradeNotProposed(address implementation)",
    "error UpgradeNotReady(address implementation, uint256 eta)",
    "error VaultNotListed(address vault)",
    "error WrongStage()",
    "error ZeroAddress()",
    // Morpho Vault V2 ErrorsLib
    "error Unauthorized()",
    "error TimelockNotExpired()",
    "error DataAlreadyPending()",
    "error DataNotTimelocked()",
    "error NotAdapter()",
    "error NotInAdapterRegistry()",
    "error AbsoluteCapExceeded()",
    "error RelativeCapExceeded()",
    "error ZeroAllocation()",
    "error FeeTooHigh()",
    "error FeeInvariantBroken()",
    "error MaxRateTooHigh()",
  ];
  A.registerErrors(ERRORS);

  const vIface = new ethers.Interface(VAULT_ABI);
  const rIface = new ethers.Interface(REGISTRY_ABI);
  const aIface = new ethers.Interface(ALLOCATOR_ABI);
  const adIface = new ethers.Interface(ADAPTER_ABI);
  const ercIface = new ethers.Interface(ERC20_ABI);

  const state = { names: {}, overview: null };

  // ---------- deployment addresses ----------

  function deployment() {
    const stored = readJson(ADDR_KEY, {});
    const cfg = Y.deployment || {};
    return {
      vault: cfg.vault || stored.vault || "",
      registry: cfg.registry || stored.registry || "",
      allocator: cfg.allocator || stored.allocator || "",
      bootstrapper: cfg.bootstrapper || stored.bootstrapper || "",
    };
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
    } catch {
      return fallback;
    }
  }

  const provider = () => A.providerFor(CHAIN);
  const contract = (address, abi) => new ethers.Contract(address, abi, provider());
  const nameOf = (a) => state.names[a?.toLowerCase()] || (eq(a, CFG.dao) ? "DAO Safe" : short(a));

  function requireDeployed() {
    const d = deployment();
    if (!d.vault || !d.registry || !d.allocator) throw new Error("Vault is not deployed yet. Use the Deploy tab, or fill CFG.yieldVault.deployment in config.js.");
    return d;
  }

  function addr(value, label, optional = false) {
    const v = String(value || "").trim();
    if (!v && optional) return ethers.ZeroAddress;
    if (!ethers.isAddress(v)) throw new Error(`${label} must be a valid address.`);
    return ethers.getAddress(v);
  }

  function pctToWad(value, label, { min = 0, max = 100 } = {}) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < min || n > max) throw new Error(`${label} must be between ${min} and ${max}.`);
    return ethers.parseUnits(String(n), 16);
  }

  const idData = (adapter) => ethers.AbiCoder.defaultAbiCoder().encode(["string", "address"], ["this", adapter]);

  // A transaction object understood by ITP_ADMIN.txBox / addToBatch.
  function tx(to, iface, fn, args, label, sender = "DAO Safe", extra = {}) {
    return { to, data: iface.encodeFunctionData(fn, args), label, sender, chainId: CHAIN, executionMode: sender === "DAO Safe" ? "dao" : "connected", ...extra };
  }

  function timelocked(vault, fn, args, label) {
    const data = vIface.encodeFunctionData(fn, args);
    return [
      { to: vault, data: vIface.encodeFunctionData("submit", [data]), label: `submit (3-day timelock): ${label}`, sender: "DAO Safe (curator)", chainId: CHAIN, executionMode: "dao" },
      { to: vault, data, label: `execute after timelock: ${label}`, sender: "anyone (after timelock)", chainId: CHAIN, executionMode: "dao", warning: "Only succeeds once the submitted action's timelock has elapsed.", noBatch: false },
      { to: vault, data: vIface.encodeFunctionData("revoke", [data]), label: `revoke pending: ${label}`, sender: "DAO Safe or sentinel", chainId: CHAIN, executionMode: "dao" },
    ];
  }

  // ---------- overview ----------

  async function loadOverview() {
    const out = $("yieldOverview");
    const d = deployment();
    if (!d.vault) {
      out.replaceChildren(h("div", { class: "card" }, h("h3", {}, "Not deployed yet"), h("p", { class: "muted" }, "Open the Deploy tab to deploy the registry, allocator and Morpho Vault V2 from your browser wallet.")));
      return;
    }
    await A.ready();
    if (!provider()) throw new Error("Base RPC is unavailable.");
    out.replaceChildren(h("div", { class: "card loading" }, "Loading on-chain state…"));
    const vault = contract(d.vault, VAULT_ABI);
    const registry = contract(d.registry, REGISTRY_ABI);
    const allocator = contract(d.allocator, ALLOCATOR_ABI);
    const [name, symbol, decimals, totalAssets, totalSupply, owner, curator, liq, perfFee, perfRecipient, maxRate, regOwner, regPending, executors, apys, allocOwner, minApyDelta, cooldown, lastRebalance, paused, best, positions, upgradeDelay, allocTimelock, isAllocator] = await Promise.all([
      vault.name(), vault.symbol(), vault.decimals(), vault.totalAssets(), vault.totalSupply(), vault.owner(), vault.curator(), vault.liquidityAdapter(),
      vault.performanceFee(), vault.performanceFeeRecipient(), vault.maxRate(),
      registry.owner(), registry.pendingOwner(), registry.executors(), registry.getApys(d.vault),
      allocator.owner(), allocator.minApyDelta(), allocator.cooldown(), allocator.lastRebalance(), allocator.paused(), allocator.bestRebalance(), allocator.positions(),
      registry.UPGRADE_DELAY(), vault.timelock(vIface.getFunction("setIsAllocator").selector), vault.isAllocator(d.allocator),
    ]);
    const sharePrice = await vault.convertToAssets(10n ** BigInt(decimals));
    const integrations = await Promise.all(apys.adapters.map((a) => registry.integration(a)));
    apys.adapters.forEach((a, i) => { state.names[a.toLowerCase()] = integrations[i].name; });
    state.names[d.vault.toLowerCase()] = symbol;
    state.names[d.registry.toLowerCase()] = "Registry";
    state.names[d.allocator.toLowerCase()] = "Allocator";
    const assetsOf = (a) => {
      const i = positions.adapters.findIndex((x) => eq(x, a));
      return i < 0 ? 0n : positions.assets[i];
    };
    state.overview = { d, adapters: apys.adapters, integrations, best, liq };

    const now = Math.floor(Date.now() / 1000);
    const readyAt = Number(best.readyAt);
    const keeperStatus = paused ? "paused" : best.ready ? `ready: move to ${nameOf(best.to)} (+${pct(best.toApr - best.fromApr)})` : eq(best.to, best.from) ? "holding the best integration" : readyAt > now ? `cooldown until ${new Date(readyAt * 1000).toLocaleString()}` : `best is ${nameOf(best.to)} but gain < ${pct(minApyDelta)}`;
    const card = (title, value, sub) => h("div", { class: "card" }, h("div", { class: "stat-label" }, title), h("div", { class: "stat-value" }, value), sub ? h("div", { class: "muted" }, sub) : null);

    const rows = apys.adapters.map((a, i) => {
      const it = integrations[i];
      return h("tr", { class: eq(a, liq) ? "highlight" : "" },
        h("td", {}, it.name, eq(a, liq) ? h("span", { class: "badge ok" }, " current") : null),
        h("td", {}, apys.ok[i] ? pct(apys.aprs[i]) : h("span", { class: "result err" }, "reader reverts")),
        h("td", {}, apys.active[i] ? h("span", { class: "badge ok" }, "active") : h("span", { class: "badge warn" }, "inactive")),
        h("td", {}, usdc(assetsOf(a))),
        h("td", {}, link(it.target)),
        h("td", {}, link(a)),
        h("td", {}, link(it.rateReader)));
    });

    out.replaceChildren(
      h("div", { class: "grid" },
        card("Total assets", usdc(totalAssets), `${ethers.formatUnits(totalSupply, decimals)} ${symbol}`),
        card("Share price", `${Number(ethers.formatUnits(sharePrice, 6)).toFixed(6)} USDC`, `per 1 ${symbol}`),
        card("Current integration", nameOf(liq), `idle ${usdc(positions.idle)}`),
        card("Keeper", keeperStatus, `last rebalance ${Number(lastRebalance) ? new Date(Number(lastRebalance) * 1000).toLocaleString() : "never"}`)),
      h("div", { class: "card" },
        h("div", { class: "row between" }, h("h3", {}, `${name} (${symbol})`), h("button", { class: "btn", onclick: () => loadOverview().catch(showErr) }, "Refresh")),
        h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, ...["Integration", "APR (on-chain)", "Status", "Vault position", "Protocol", "Adapter", "Rate reader"].map((t) => h("th", {}, t)))),
          h("tbody", {}, ...rows)))),
      h("div", { class: "grid" },
        h("div", { class: "card" }, h("h3", {}, "Contracts"), h("ul", { class: "links" },
          h("li", {}, "Vault (Morpho Vault V2) ", link(d.vault, d.vault)),
          h("li", {}, "InfiniteTradingRegistry (UUPS) ", link(d.registry, d.registry)),
          h("li", {}, "InfiniteYieldAllocator ", link(d.allocator, d.allocator)))),
        h("div", { class: "card" }, h("h3", {}, "Roles"), h("ul", { class: "links" },
          h("li", {}, "Vault owner: ", nameOf(owner)),
          h("li", {}, "Vault curator: ", nameOf(curator)),
          h("li", {}, "Registry owner: ", nameOf(regOwner), regPending !== ethers.ZeroAddress ? ` (pending ${short(regPending)})` : ""),
          h("li", {}, "Allocator owner: ", nameOf(allocOwner)),
          h("li", {}, "Allocator enabled on vault: ", isAllocator ? "yes" : "NO"),
          h("li", {}, "Executors: ", executors.length ? executors.map((e) => short(e)).join(", ") : "none"))),
        h("div", { class: "card" }, h("h3", {}, "Parameters"), h("ul", { class: "links" },
          h("li", {}, `Rebalance threshold: ${pct(minApyDelta)} APR`),
          h("li", {}, `Cooldown: ${Number(cooldown) / 60} min`),
          h("li", {}, `Performance fee: ${pct(perfFee, 1)} → ${nameOf(perfRecipient)}`),
          h("li", {}, `Max interest rate: ${pct(BigInt(maxRate) * YEAR, 0)} APR`),
          h("li", {}, `Curator timelock: ${Number(allocTimelock) / 86400} days`),
          h("li", {}, `Registry upgrade delay: ${Number(upgradeDelay) / 86400} days`),
          h("li", {}, `Allocator: ${paused ? "PAUSED" : "running"}`)))),
    );
    fillAdapterSelects();
  }

  function fillAdapterSelects() {
    const ov = state.overview;
    if (!ov) return;
    document.querySelectorAll("select[data-yield-adapters]").forEach((sel) => {
      const current = sel.value;
      const opts = ov.adapters.map((a, i) => h("option", { value: a }, `${ov.integrations[i].name} (${short(a)})`));
      if (sel.dataset.yieldAdapters === "idle") opts.unshift(h("option", { value: "" }, "idle (vault balance)"));
      sel.replaceChildren(...opts);
      if (current) sel.value = current;
    });
  }

  // Public Base RPCs only serve logs for the last ~2 hours of blocks, so the scan uses (in order): a log RPC URL
  // typed in the Overview tab, the connected wallet if it is on Base, then the public RPC.
  const LOG_RPC_KEY = "itp-yield-log-rpc";

  async function logProvider() {
    const url = ($("yieldLogRpc")?.value || "").trim();
    localStorage.setItem(LOG_RPC_KEY, url);
    if (url) return { p: new ethers.JsonRpcProvider(url, CHAIN, { staticNetwork: true }), src: "custom RPC" };
    const w = A.wallet();
    if (w) {
      try {
        if (Number((await w.getNetwork()).chainId) === CHAIN) return { p: w, src: "wallet RPC" };
      } catch {}
    }
    return { p: provider(), src: "public RPC" };
  }

  async function scanPending() {
    const d = requireDeployed();
    const slot = $("yieldPending");
    const { p, src } = await logProvider();
    const latest = await p.getBlockNumber();
    const deployBlock = Number(Y.deployment?.deployBlock || readJson(ADDR_KEY, {}).deployBlock || 0);
    const from = Math.max(deployBlock, latest - 10 * 43200);
    slot.replaceChildren(h("p", { class: "muted" }, `Scanning Submit events from block ${from} via ${src}…`));
    const logs = [];
    const STEP = 2000;
    try {
      for (let start = from; start <= latest; start += STEP) {
        const end = Math.min(latest, start + STEP - 1);
        logs.push(...await p.getLogs({ address: d.vault, topics: [vIface.getEvent("Submit").topicHash], fromBlock: start, toBlock: end }));
      }
    } catch (e) {
      throw new Error(`Log query via ${src} failed (${e.shortMessage || e.message}). Public Base RPCs only keep ~2h of logs: connect a wallet on Base or paste an archive-capable Base RPC URL above.`);
    }
    const vault = contract(d.vault, VAULT_ABI);
    const pending = [];
    for (const log of logs) {
      const ev = vIface.parseLog(log);
      const at = await vault.executableAt(ev.args.data);
      if (at === 0n) continue;
      let label;
      try {
        const parsed = vIface.parseTransaction({ data: ev.args.data });
        label = `${parsed.name}(${parsed.args.map((x) => (typeof x === "string" && ethers.isAddress(x) ? nameOf(x) : String(x))).join(", ")})`;
      } catch {
        label = ev.args.data.slice(0, 10);
      }
      pending.push({ data: ev.args.data, at: Number(at), label });
    }
    if (!pending.length) {
      slot.replaceChildren(h("p", { class: "muted" }, "No pending curator actions."));
      return;
    }
    slot.replaceChildren(...pending.map((p2) => h("div", {},
      h("p", {}, h("b", {}, p2.label), ` executable at ${new Date(p2.at * 1000).toLocaleString()}`),
      A.txBox({ to: d.vault, data: p2.data, label: `execute: ${p2.label}`, sender: "anyone (after timelock)", chainId: CHAIN, executionMode: "dao" }),
      A.txBox({ to: d.vault, data: vIface.encodeFunctionData("revoke", [p2.data]), label: `revoke: ${p2.label}`, sender: "DAO Safe or sentinel", chainId: CHAIN, executionMode: "dao" }))));
  }

  // ---------- manage (DAO + keeper actions) ----------

  const F = {
    address: (id, label, placeholder = "0x…") => ({ id, label, kind: "input", placeholder }),
    text: (id, label, placeholder = "") => ({ id, label, kind: "input", placeholder }),
    bool: (id, label) => ({ id, label, kind: "bool" }),
    adapter: (id, label, idle = false) => ({ id, label, kind: "adapter", idle }),
  };

  const ACTIONS = [
    {
      group: "Keeper (connected executor wallet)",
      items: [
        { title: "Rebalance to the best integration", note: "Executor-only. Moves the whole position if the APR gain ≥ threshold and the cooldown elapsed.", fields: [F.adapter("to", "Move to")], build: (v, d) => tx(d.allocator, aIface, "requireRebalance", [addr(v.to, "Target")], `requireRebalance → ${nameOf(v.to)}`, "executor") },
        { title: "Allocate idle USDC", note: "Executor-only. Deposits idle vault USDC into the current integration.", fields: [], build: (v, d) => tx(d.allocator, aIface, "allocateIdle", [], "allocateIdle", "executor") },
        { title: "Emergency pause allocator", note: "Executors or the DAO. Only stops rebalances; deposits and withdrawals keep working.", fields: [], build: (v, d) => tx(d.allocator, aIface, "pause", [], "pause allocator", "executor or DAO Safe", { executionMode: undefined }) },
      ],
    },
    {
      group: "Registry (DAO Safe, instant)",
      items: [
        { title: "Allow / revoke executor", fields: [F.address("account", "Executor"), F.bool("allowed", "Allowed")], build: (v, d) => tx(d.registry, rIface, "setExecutor", [addr(v.account, "Executor"), v.allowed], `${v.allowed ? "allow" : "revoke"} executor ${short(v.account)}`) },
        { title: "Activate / deactivate integration", note: "Inactive integrations cannot receive keeper rebalances. Funds already there can always be moved out.", fields: [F.adapter("adapter", "Integration"), F.bool("active", "Active")], build: (v, d) => tx(d.registry, rIface, "setIntegrationActive", [addr(v.adapter, "Adapter"), v.active], `${v.active ? "activate" : "deactivate"} ${nameOf(v.adapter)}`) },
        { title: "Replace rate reader", fields: [F.adapter("adapter", "Integration"), F.address("reader", "New rate reader")], build: (v, d) => tx(d.registry, rIface, "setRateReader", [addr(v.adapter, "Adapter"), addr(v.reader, "Reader")], `set rate reader of ${nameOf(v.adapter)}`) },
        { title: "Rename integration", fields: [F.adapter("adapter", "Integration"), F.text("name", "Name")], build: (v, d) => tx(d.registry, rIface, "setIntegrationName", [addr(v.adapter, "Adapter"), v.name.trim()], `rename ${nameOf(v.adapter)} → ${v.name}`) },
        { title: "Transfer registry ownership (2-step)", fields: [F.address("owner", "New owner")], build: (v, d) => tx(d.registry, rIface, "transferOwnership", [addr(v.owner, "Owner")], `transfer registry ownership to ${short(v.owner)}`) },
      ],
    },
    {
      group: "Registry upgrade (DAO Safe, delayed)",
      items: [
        { title: "Propose upgrade", note: "Starts the upgrade delay for this implementation.", fields: [F.address("impl", "New implementation")], build: (v, d) => tx(d.registry, rIface, "proposeUpgrade", [addr(v.impl, "Implementation")], `propose registry upgrade to ${short(v.impl)}`) },
        { title: "Execute upgrade", note: "After the delay. Storage layout must be append-only (ERC-7201 namespace).", fields: [F.address("impl", "Implementation")], build: (v, d) => tx(d.registry, rIface, "upgradeToAndCall", [addr(v.impl, "Implementation"), "0x"], `upgrade registry to ${short(v.impl)}`) },
        { title: "Cancel upgrade", fields: [F.address("impl", "Implementation")], build: (v, d) => tx(d.registry, rIface, "cancelUpgrade", [addr(v.impl, "Implementation")], `cancel registry upgrade ${short(v.impl)}`) },
      ],
    },
    {
      group: "Allocator (DAO Safe, instant)",
      items: [
        { title: "Rebalance threshold", note: "0.1 – 5 percentage points of APR.", fields: [F.text("delta", "Min APR gain (pp)", "0.7")], build: (v, d) => tx(d.allocator, aIface, "setMinApyDelta", [pctToWad(v.delta, "Threshold", { min: 0.1, max: 5 })], `set rebalance threshold ${v.delta}pp`) },
        { title: "Cooldown", note: "10 minutes – 30 days.", fields: [F.text("minutes", "Minutes", "60")], build: (v, d) => tx(d.allocator, aIface, "setCooldown", [BigInt(Math.round(Number(v.minutes) * 60))], `set cooldown ${v.minutes} min`) },
        { title: "Unpause allocator", fields: [], build: (v, d) => tx(d.allocator, aIface, "unpause", [], "unpause allocator") },
        { title: "Max interest rate", note: "Caps share-price growth per second (protects against donation spikes).", fields: [F.text("apr", "Max APR %", "50")], build: (v, d) => tx(d.allocator, aIface, "setMaxRate", [pctToWad(v.apr, "Max APR", { min: 1, max: 200 }) / YEAR], `set max rate ${v.apr}% APR`) },
        { title: "DAO rebalance (no APR checks)", note: "Moves everything from one integration to another, or to idle. Use for emergencies.", fields: [F.adapter("from", "From"), F.adapter("to", "To", true)], build: (v, d) => tx(d.allocator, aIface, "daoRebalance", [addr(v.from, "From"), addr(v.to, "To", true)], `DAO rebalance ${nameOf(v.from)} → ${v.to ? nameOf(v.to) : "idle"}`) },
      ],
    },
    {
      group: "Vault curator (DAO Safe, 3-day timelock: submit → wait → execute)",
      items: [
        { title: "Remove integration from vault", note: "Requires zero allocation. Deactivate it in the registry first.", fields: [F.adapter("adapter", "Integration")], build: (v, d) => timelocked(d.vault, "removeAdapter", [addr(v.adapter, "Adapter")], `remove adapter ${nameOf(v.adapter)}`) },
        { title: "Performance fee", note: "Max 50%. Decreases are also timelocked in Morpho V2.", fields: [F.text("fee", "Fee %", "10")], build: (v, d) => timelocked(d.vault, "setPerformanceFee", [pctToWad(v.fee, "Fee", { min: 0, max: 50 })], `performance fee ${v.fee}%`) },
        { title: "Performance fee recipient", fields: [F.address("recipient", "Recipient")], build: (v, d) => timelocked(d.vault, "setPerformanceFeeRecipient", [addr(v.recipient, "Recipient")], `fee recipient ${short(v.recipient)}`) },
        { title: "Allocator role", note: "Grant/revoke the vault allocator role (e.g. migrate to a new allocator).", fields: [F.address("account", "Account"), F.bool("enabled", "Allocator")], build: (v, d) => timelocked(d.vault, "setIsAllocator", [addr(v.account, "Account"), v.enabled], `${v.enabled ? "add" : "remove"} allocator ${short(v.account)}`) },
      ],
    },
    {
      group: "Vault risk reduction (DAO Safe or sentinel, instant)",
      items: [
        { title: "Cap an integration to zero", note: "Blocks new allocations to it immediately (raising caps again is timelocked).", fields: [F.adapter("adapter", "Integration")], build: (v, d) => tx(d.vault, vIface, "decreaseAbsoluteCap", [idData(addr(v.adapter, "Adapter")), 0n], `cap ${nameOf(v.adapter)} to 0`, "DAO Safe or sentinel", { executionMode: "dao" }) },
        { title: "Sentinel (vault owner)", fields: [F.address("account", "Account"), F.bool("enabled", "Sentinel")], build: (v, d) => tx(d.vault, vIface, "setIsSentinel", [addr(v.account, "Account"), v.enabled], `${v.enabled ? "add" : "remove"} sentinel ${short(v.account)}`) },
      ],
    },
  ];

  function renderManage() {
    const root = $("yieldManage");
    root.replaceChildren(...ACTIONS.map((group) => h("div", { class: "card" }, h("h3", {}, group.group), ...group.items.map(renderAction))));
    root.prepend(renderAddIntegration());
    fillAdapterSelects();
  }

  function renderAction(spec) {
    const inputs = {};
    const fields = spec.fields.map((f) => {
      let el;
      if (f.kind === "bool") el = h("select", {}, h("option", { value: "true" }, "true"), h("option", { value: "false" }, "false"));
      else if (f.kind === "adapter") el = h("select", { "data-yield-adapters": f.idle ? "idle" : "plain" }, h("option", { value: "" }, "load Overview first"));
      else el = h("input", { placeholder: f.placeholder });
      inputs[f.id] = { el, kind: f.kind };
      return h("label", {}, f.label, " ", el);
    });
    const slot = h("div", {});
    const build = () => {
      const d = requireDeployed();
      const v = {};
      for (const [id, { el, kind }] of Object.entries(inputs)) v[id] = kind === "bool" ? el.value === "true" : el.value;
      return spec.build(v, d);
    };
    return h("div", { class: "subcard" },
      h("h4", {}, spec.title),
      spec.note ? h("p", { class: "muted" }, spec.note) : null,
      fields.length ? h("div", { class: "form two" }, ...fields) : null,
      h("button", { class: "btn small", onclick: () => A.showTx(slot, build) }, "Build"),
      slot);
  }

  // New integration: create adapter (anyone) → DAO batch: skim recipient, registry, timelocked vault submits.
  function renderAddIntegration() {
    const kind = h("select", {}, h("option", { value: "0" }, "ERC-4626 (Morpho vault, Aave stata, Fluid…)"), h("option", { value: "1" }, "Compound v3 Comet"));
    const target = h("input", { placeholder: "0x… protocol vault / Comet" });
    const reader = h("input", { placeholder: "0x… rate reader" });
    const name = h("input", { placeholder: "Display name" });
    const compFactory = h("input", { placeholder: "CompoundV3AdapterFactory (Comet only)", value: readJson(WIZARD_KEY, {}).addresses?.compoundV3AdapterFactory || "" });
    const slot = h("div", {});
    const build = async () => {
      const d = requireDeployed();
      const t = addr(target.value, "Target");
      const r = addr(reader.value, "Rate reader");
      const n = name.value.trim();
      if (!n) throw new Error("Name is required.");
      const isComet = kind.value === "1";
      const factoryAddr = isComet ? addr(compFactory.value, "CompoundV3AdapterFactory") : Y.external.morphoVaultV1AdapterFactory;
      const factory = contract(factoryAddr, isComet ? COMP_FACTORY_ABI : MVA_FACTORY_ABI);
      const existing = isComet ? await factory.compoundV3Adapter(d.vault, t) : await factory.morphoVaultV1Adapter(d.vault, t);
      const fIface = factory.interface;
      if (existing === ethers.ZeroAddress) {
        return [tx(factoryAddr, fIface, isComet ? "createCompoundV3Adapter" : "createMorphoVaultV1Adapter", [d.vault, t], `create adapter for ${n} (then rebuild this card)`, "anyone", { executionMode: "connected" })];
      }
      return [
        tx(existing, adIface, "setSkimRecipient", [CFG.dao], `${n}: skim recipient → DAO`),
        tx(d.registry, rIface, "addIntegration", [d.vault, [existing, t, r, n]], `registry: add ${n}`),
        ...timelocked(d.vault, "addAdapter", [existing], `add adapter ${n}`).slice(0, 1),
        ...timelocked(d.vault, "increaseAbsoluteCap", [idData(existing), UINT128_MAX], `${n} absolute cap ∞`).slice(0, 1),
        ...timelocked(d.vault, "increaseRelativeCap", [idData(existing), WAD], `${n} relative cap 100%`).slice(0, 1),
        { ...timelocked(d.vault, "addAdapter", [existing], `add adapter ${n}`)[1] },
        { ...timelocked(d.vault, "increaseAbsoluteCap", [idData(existing), UINT128_MAX], `${n} absolute cap ∞`)[1] },
        { ...timelocked(d.vault, "increaseRelativeCap", [idData(existing), WAD], `${n} relative cap 100%`)[1] },
      ];
    };
    return h("div", { class: "card" },
      h("h3", {}, "Add a new integration"),
      h("p", { class: "muted" }, "1) Create the adapter (permissionless). 2) Batch the first five actions in the Safe. 3) After 3 days, batch the three execute actions. The keeper only moves funds after the registry entry is active and the vault adapter is live."),
      h("div", { class: "form two" }, h("label", {}, "Type ", kind), h("label", {}, "Target ", target), h("label", {}, "Rate reader ", reader), h("label", {}, "Name ", name), h("label", {}, "Comet adapter factory ", compFactory)),
      h("button", { class: "btn small", onclick: async () => { slot.replaceChildren(h("p", { class: "muted" }, "Building…")); try { const txs = await build(); slot.replaceChildren(...txs.map(A.txBox)); } catch (e) { slot.replaceChildren(h("div", { class: "result err" }, `✗ ${A.decodeError(e)}`)); } } }, "Build"),
      slot);
  }

  // ---------- deploy wizard ----------

  const STEPS = [
    { key: "registryImplementation", label: "InfiniteTradingRegistry implementation", artifact: "InfiniteTradingRegistry", args: (c) => [BigInt(c.registryUpgradeDelayDays) * 86400n] },
    { key: "compoundV3AdapterFactory", label: "CompoundV3AdapterFactory", artifact: "CompoundV3AdapterFactory", args: () => [] },
    { key: "allocatorFactory", label: "InfiniteYieldAllocatorFactory", artifact: "InfiniteYieldAllocatorFactory", args: () => [] },
    { key: "aaveReader", label: "AaveV3RateReader", artifact: "AaveV3RateReader", args: () => [Y.external.aavePool] },
    { key: "cometReader", label: "CompoundV3RateReader", artifact: "CompoundV3RateReader", args: () => [] },
    { key: "fluidReader", label: "FluidRateReader", artifact: "FluidRateReader", args: () => [Y.external.fluidLendingResolver] },
    { key: "metamorphoReader", label: "MetaMorphoRateReader", artifact: "MetaMorphoRateReader", args: () => [] },
    { key: "bootstrapper", label: "InfiniteYieldBootstrapper (deployer-only, one-shot)", artifact: "InfiniteYieldBootstrapper", args: () => [] },
  ];
  const READER_KEYS = { aave: "aaveReader", comet: "cometReader", fluid: "fluidReader", metamorpho: "metamorphoReader" };
  const artifacts = new Map();

  async function artifact(name) {
    if (artifacts.has(name)) return artifacts.get(name);
    const res = await fetch(`/artifacts/yield/${name}.json`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Artifact ${name} unavailable. Start the dashboard with serve.py (it builds FOUNDRY_PROFILE=yield).`);
    const json = await res.json();
    if (!json.abi || !json.bytecode?.object || json.bytecode.object === "0x") throw new Error(`${name} artifact has no bytecode.`);
    artifacts.set(name, json);
    return json;
  }

  function wizard() {
    return readJson(WIZARD_KEY, { addresses: {}, params: null, config: null, stage: 0 });
  }

  function saveWizard(w) {
    localStorage.setItem(WIZARD_KEY, JSON.stringify(w, (k, v) => (typeof v === "bigint" ? v.toString() : v)));
  }

  function readParams() {
    const p = {};
    document.querySelectorAll("#yieldDeployForm [data-param]").forEach((el) => { p[el.dataset.param] = el.type === "checkbox" ? el.checked : el.value.trim(); });
    p.integrations = Y.defaults.integrations.filter((_, i) => p[`int${i}`]);
    return p;
  }

  function buildConfig(p, addresses) {
    const list = (s, label) => s.split(/[\s,]+/).filter(Boolean).map((x) => addr(x, label));
    if (!p.integrations.length) throw new Error("Select at least one integration.");
    for (const s of STEPS) if (!addresses[s.key]) throw new Error(`Deploy ${s.label} first.`);
    const salt = /^0x[0-9a-fA-F]{64}$/.test(p.salt) ? p.salt : ethers.id(p.salt || "itp-usd-yield");
    return {
      asset: Y.external.usdc,
      vaultFactory: Y.external.vaultFactory,
      morphoVaultV1AdapterFactory: Y.external.morphoVaultV1AdapterFactory,
      compoundV3AdapterFactory: addresses.compoundV3AdapterFactory,
      allocatorFactory: addresses.allocatorFactory,
      registryImplementation: addresses.registryImplementation,
      safe: addr(p.safe, "DAO Safe"),
      salt,
      name: p.name,
      symbol: p.symbol,
      executors: list(p.executors, "Executor"),
      sentinels: list(p.sentinels, "Sentinel"),
      integrations: p.integrations.map((it) => ({ kind: it.kind, target: ethers.getAddress(it.target), rateReader: addresses[READER_KEYS[it.reader]], name: it.name })),
      performanceFee: pctToWad(p.performanceFeePct, "Performance fee", { max: 50 }),
      minApyDelta: pctToWad(p.minApyDeltaPct, "Threshold", { min: 0.1, max: 5 }),
      cooldown: BigInt(Math.round(Number(p.cooldownMinutes) * 60)),
      timelock: BigInt(Math.round(Number(p.timelockDays) * 86400)),
      maxRate: pctToWad(p.maxRateAprPct, "Max APR", { min: 1, max: 200 }) / YEAR,
      seedAssets: ethers.parseUnits(String(p.seedUsdc), 6),
      seedReceiver: addr(p.safe, "DAO Safe"),
    };
  }

  // Wizard stores the config JSON-encoded; restore bigint fields before ABI encoding.
  function reviveConfig(c) {
    return { ...c, performanceFee: BigInt(c.performanceFee), minApyDelta: BigInt(c.minApyDelta), cooldown: BigInt(c.cooldown), timelock: BigInt(c.timelock), maxRate: BigInt(c.maxRate), seedAssets: BigInt(c.seedAssets), integrations: c.integrations.map((i) => ({ ...i, kind: Number(i.kind) })) };
  }

  async function configHash(config) {
    const art = await artifact("InfiniteYieldBootstrapper");
    const param = new ethers.Interface(art.abi).getFunction("deployVault").inputs[0];
    return ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode([param], [config]));
  }

  async function signer() {
    if (!A.wallet()) await A.connect();
    await A.ensureChain(CHAIN);
    const s = await A.wallet().getSigner();
    const from = await s.getAddress();
    if (eq(from, CFG.dao)) throw new Error("Deploy from an EOA, not the Safe: the bootstrapper must be called by the same account that deployed it.");
    return s;
  }

  function log(msg, cls = "") {
    $("yieldDeployLog").append(h("div", { class: `result ${cls}` }, msg));
  }

  async function runStep(step) {
    const w = wizard();
    if (w.addresses[step.key] && (await provider().getCode(w.addresses[step.key])) !== "0x") {
      log(`✓ ${step.label} already at ${w.addresses[step.key]}`, "ok");
      return;
    }
    const p = readParams();
    const art = await artifact(step.artifact);
    const s = await signer();
    const factory = new ethers.ContractFactory(art.abi, art.bytecode.object, s);
    log(`… deploying ${step.label} (confirm in wallet)`);
    const c = await factory.deploy(...step.args(p));
    const address = await c.getAddress();
    await c.deploymentTransaction().wait();
    w.addresses[step.key] = address;
    if (step.key === "bootstrapper") w.deployer = await s.getAddress();
    saveWizard(w);
    log(`✓ ${step.label}: ${address}`, "ok");
    renderWizardStatus();
  }

  async function runDeployVault() {
    const w = wizard();
    const bootAddr = w.addresses.bootstrapper;
    if (!bootAddr) throw new Error("Deploy the bootstrapper first.");
    const p = readParams();
    const config = w.config ? reviveConfig(w.config) : buildConfig(p, w.addresses);
    const s = await signer();
    const boot = new ethers.Contract(bootAddr, (await artifact("InfiniteYieldBootstrapper")).abi, s);
    if (!eq(await boot.deployer(), await s.getAddress())) throw new Error(`Connected wallet is not the bootstrapper deployer (${short(await boot.deployer())}).`);
    const stage = Number(await boot.stage());
    if (stage === 0) {
      await boot.deployVault.staticCall(config);
      log("… deployVault simulated OK; confirm in wallet (tx 1/2, ~11M gas)");
      const t = await boot.deployVault(config, { gasLimit: 15_000_000n });
      await t.wait();
      w.config = config;
      saveWizard(w);
      log(`✓ vault created: ${await boot.deployedVault()}`, "ok");
    } else {
      log(`✓ deployVault already done (stage ${stage})`, "ok");
      w.config = w.config || config;
      saveWizard(w);
    }
    renderWizardStatus();
  }

  async function runFinalize() {
    const w = wizard();
    if (!w.config) throw new Error("Run deployVault first (its exact config is needed for finalize).");
    const config = reviveConfig(w.config);
    const s = await signer();
    const art = await artifact("InfiniteYieldBootstrapper");
    const boot = new ethers.Contract(w.addresses.bootstrapper, art.abi, s);
    const stage = Number(await boot.stage());
    if (stage === 2) {
      log("✓ already finalized", "ok");
    } else {
      if (stage !== 1) throw new Error("deployVault has not run yet.");
      if ((await boot.configHash()) !== (await configHash(config))) throw new Error("Stored config does not match the on-chain config hash; do not edit the wizard state.");
      const usdcC = new ethers.Contract(Y.external.usdc, ERC20_ABI, s);
      const me = await s.getAddress();
      if (config.seedAssets > 0n) {
        if ((await usdcC.balanceOf(me)) < config.seedAssets) throw new Error(`Wallet needs ${usdc(config.seedAssets)} for the seed deposit.`);
        if ((await usdcC.allowance(me, w.addresses.bootstrapper)) < config.seedAssets) {
          log("… approve seed USDC to bootstrapper (confirm in wallet)");
          await (await usdcC.approve(w.addresses.bootstrapper, config.seedAssets)).wait();
        }
      }
      await boot.finalize.staticCall(config);
      log("… finalize simulated OK; confirm in wallet (tx 2/2, ~7M gas)");
      const t = await boot.finalize(config, { gasLimit: 12_000_000n });
      const receipt = await t.wait();
      const ev = receipt.logs.map((l) => { try { return boot.interface.parseLog(l); } catch { return null; } }).find((e) => e?.name === "Deployed");
      if (!ev) throw new Error("Deployed event not found in receipt.");
      const d = { vault: ev.args.vault, registry: ev.args.registry, allocator: ev.args.allocator, bootstrapper: w.addresses.bootstrapper, deployBlock: receipt.blockNumber };
      localStorage.setItem(ADDR_KEY, JSON.stringify(d));
      log(`✓ finalized. Vault ${d.vault}, registry ${d.registry}, allocator ${d.allocator}`, "ok");
    }
    renderWizardStatus();
    await loadOverview().catch(showErr);
  }

  function renderWizardStatus() {
    const w = wizard();
    const d = readJson(ADDR_KEY, {});
    const rows = STEPS.map((s) => h("tr", {}, h("td", {}, s.label), h("td", {}, w.addresses[s.key] ? link(w.addresses[s.key], w.addresses[s.key]) : "—"), h("td", {}, h("button", { class: "btn small", onclick: () => runStep(s).catch(fail) }, w.addresses[s.key] ? "Verify" : "Deploy"))));
    rows.push(h("tr", {}, h("td", {}, "Tx 1/2 bootstrapper.deployVault(config)"), h("td", {}, w.config ? "done" : "—"), h("td", {}, h("button", { class: "btn small", onclick: () => runDeployVault().catch(fail) }, "Run"))));
    rows.push(h("tr", {}, h("td", {}, "Tx 2/2 approve seed + bootstrapper.finalize(config)"), h("td", {}, d.vault ? link(d.vault, d.vault) : "—"), h("td", {}, h("button", { class: "btn small", onclick: () => runFinalize().catch(fail) }, "Run"))));
    $("yieldDeploySteps").replaceChildren(h("table", {}, h("tbody", {}, ...rows)));
    const snippet = d.vault ? `deployment: {\n  vault: "${d.vault}",\n  registry: "${d.registry}",\n  allocator: "${d.allocator}",\n  bootstrapper: "${d.bootstrapper}",\n  deployBlock: ${d.deployBlock || 0},\n},\n// helpers: ${JSON.stringify(w.addresses)}` : "";
    $("yieldDeploySnippet").replaceChildren(snippet ? h("div", {}, h("p", {}, "Paste into config.js → yieldVault:"), h("pre", {}, snippet)) : "");
  }

  function renderDeployForm() {
    const D = Y.defaults;
    const field = (param, label, value) => h("label", {}, label, " ", h("input", { "data-param": param, value: String(value) }));
    $("yieldDeployForm").replaceChildren(
      h("div", { class: "form two" },
        field("name", "Vault name", D.name),
        field("symbol", "Symbol", D.symbol),
        field("safe", "DAO Safe (owner, curator, fee & seed receiver)", CFG.dao),
        field("salt", "Salt (text or bytes32)", `itp-usd-yield-${new Date().toISOString().slice(0, 10)}`),
        field("executors", "Executors (keepers)", D.executors.join(", ")),
        field("sentinels", "Sentinels", D.sentinels.join(", ")),
        field("performanceFeePct", "Performance fee %", D.performanceFeePct),
        field("minApyDeltaPct", "Rebalance threshold (pp APR)", D.minApyDeltaPct),
        field("cooldownMinutes", "Cooldown (minutes)", D.cooldownMinutes),
        field("timelockDays", "Curator timelock (days)", D.timelockDays),
        field("registryUpgradeDelayDays", "Registry upgrade delay (days)", D.registryUpgradeDelayDays),
        field("maxRateAprPct", "Max interest rate (% APR)", D.maxRateAprPct),
        field("seedUsdc", "Seed deposit (USDC, from your wallet → shares to Safe)", D.seedUsdc)),
      h("h4", {}, "Integrations"),
      h("div", {}, ...D.integrations.map((it, i) => h("label", { class: "row" }, h("input", { type: "checkbox", "data-param": `int${i}`, checked: true }), ` ${it.name} — ${it.kind === 1 ? "Compound v3 adapter" : "ERC-4626 adapter"} · ${short(it.target)} · reader ${it.reader}`))),
    );
    renderWizardStatus();
  }

  function fail(e) {
    log(`✗ ${A.decodeError(e)}`, "err");
  }

  function showErr(e) {
    $("yieldOverview").replaceChildren(h("div", { class: "card" }, h("p", { class: "result err" }, A.decodeError(e))));
  }

  function wire() {
    renderManage();
    renderDeployForm();
    if ($("yieldLogRpc")) $("yieldLogRpc").value = localStorage.getItem(LOG_RPC_KEY) || "";
    $("yieldScanPending").addEventListener("click", () => scanPending().catch((e) => $("yieldPending").replaceChildren(h("p", { class: "result err" }, e.message.startsWith("Log query") ? e.message : A.decodeError(e)))));
    $("yieldDeployAll").addEventListener("click", async () => {
      try {
        for (const s of STEPS) await runStep(s);
        await runDeployVault();
        await runFinalize();
      } catch (e) {
        fail(e);
      }
    });
    $("yieldResetWizard").addEventListener("click", () => {
      if (!window.confirm("Forget wizard progress stored in this browser? Deployed contracts are not affected.")) return;
      localStorage.removeItem(WIZARD_KEY);
      renderWizardStatus();
    });
    document.querySelector('#modules button[data-module="yield"]')?.addEventListener("click", () => loadOverview().catch(showErr));
  }

  wire();
})();
