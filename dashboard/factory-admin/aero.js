// Bounded, read-only Aero discovery; mutations are simulated and queued, never sent.
(() => {
  "use strict";
  const A = window.ITP_ADMIN;
  const CFG = window.ITP_CONFIG;
  const C = window.ITP_AERO;
  const { ethers } = window;
  if (!A || !C || !CFG.aero) return;
  const { h } = A;
  const $ = (id) => document.getElementById(id);
  const fi = new ethers.Interface(C.FACTORY_ABI);
  const vi = new ethers.Interface(C.VAULT_ABI);
  // Aero v2 (Optimism, Base) side by side with v1 (Ethereum, Robinhood); `config.version` selects the ABI per network.
  const fi2 = new ethers.Interface(C.FACTORY_V2_ABI);
  const vi2 = new ethers.Interface(C.VAULT_V2_ABI);
  const ver = (ctx) => ctx.config.version === 2 ? 2 : 1;
  const zero = ethers.ZeroAddress;
  let generation = 0;
  let selected = 0;
  let discovery = 0;
  const current = (ctx) => ctx.id === generation && (!ctx.selection || ctx.selection === selected);
  const short = (address) => `${address.slice(0, 6)}…${address.slice(-4)}`;
  const link = (chain, address) => C.eq(address, zero) ? "None" : h("a", {
    href: `${A.networkFor(chain).explorer}/address/${address}`, target: "_blank", rel: "noopener noreferrer",
    title: address,
  }, short(address));
  const card = (title, ...nodes) => h("div", { class: "card" }, h("h3", {}, title), ...nodes);
  const error = (e) => h("p", { class: "result err" }, A.decodeError(e));
  const row = (label, value) => h("tr", {}, h("th", { scope: "row" }, label), h("td", {}, value));
  const table = (...rows) => h("div", { class: "table-wrap" }, h("table", {}, h("tbody", {}, ...rows)));
  const addrRow = (chain, label, address) => row(label, link(chain, address));
  const field = (label, value = "", type = "text") => {
    const input = h("input", { type, value: String(value), autocomplete: "off" });
    return { input, node: h("label", {}, label, input) };
  };
  const choice = (label) => {
    const input = h("select", {}, h("option", { value: "true" }, "Enabled"), h("option", { value: "false" }, "Disabled"));
    return { input, node: h("label", {}, label, input) };
  };
  function address(value) {
    const a = ethers.getAddress(value.trim());
    if (C.eq(a, zero)) throw new Error("Zero address is not allowed.");
    return a;
  }
  async function code(provider, target) {
    if (await provider.getCode(target) === "0x") throw new Error(`No deployed code at ${target}.`);
  }
  async function read(contract, names) {
    const values = await Promise.all(names.map((name) => contract[name]()));
    return Object.fromEntries(names.map((name, i) => [name, values[i]]));
  }
  function action(ctx, label, fields, build, guard) {
    const out = h("div", { "aria-live": "polite" });
    const button = h("button", { class: "btn small", onclick: async () => {
      button.disabled = true;
      out.replaceChildren(h("p", { class: "muted" }, "Validating and simulating as DAO Safe…"));
      try {
        if (!current(ctx)) throw new Error("State changed. Refresh before building.");
        await guard();
        const tx = await build();
        tx.chainId = ctx.chain;
        tx.executionMode = "dao";
        tx.sender = `DAO Safe ${CFG.dao}`;
        tx.label = `Aero: ${label}`;
        const result = await A.simulate(tx, CFG.dao);
        if (!result.ok) throw new Error(result.reason);
        if (!current(ctx)) return;
        const add = h("button", { class: "btn small", onclick: async () => {
          add.disabled = true;
          try {
            if (!current(ctx)) throw new Error("State changed. Rebuild the action.");
            await guard();
            const fresh = await A.simulate(tx, CFG.dao);
            if (!fresh.ok) throw new Error(fresh.reason);
            if (!current(ctx)) return;
            A.addToBatch(tx);
            out.replaceChildren(h("p", { class: "result ok" }, "Added to batch. Review network and calldata before Safe execution."));
          } catch (e) { out.replaceChildren(error(e)); }
        } }, "Re-simulate & add to batch");
        out.replaceChildren(h("p", { class: "result ok" }, `Simulation OK on ${A.networkFor(ctx.chain).chainName} as DAO Safe.`),
          h("p", { class: "mono" }, `Target: ${tx.to}`),
          h("details", {}, h("summary", {}, "Review fixed calldata (rebuild after editing inputs)"), h("pre", {}, tx.data)), add);
      } catch (e) { if (current(ctx)) out.replaceChildren(error(e)); }
      finally { button.disabled = false; }
    } }, "Build & simulate");
    return h("details", {}, h("summary", {}, label), h("div", { class: "form" }, ...fields.map((f) => f.node)), button, out);
  }
  async function validateFactory(ctx) {
    await code(ctx.provider, ctx.config.factory);
    if (!C.eq(await ctx.factory.dao(), CFG.dao)) throw new Error("Factory DAO does not match configured Safe. Management disabled.");
  }
  async function validateVault(ctx, vault, target) {
    await validateFactory(ctx);
    await code(ctx.provider, target);
    const registered = ver(ctx) === 2 ? await vault.factory() : await vault.automationFactory();
    if (!await ctx.factory.isVault(target) || !C.eq(registered, ctx.config.factory)) {
      throw new Error("Vault is not registered with this factory.");
    }
    const pool = await vault.asset();
    if (!await ctx.factory.isPool(pool)) throw new Error("Factory does not recognize the vault pool.");
    const gauge = await vault.gauge();
    if (!C.eq(gauge, zero) && !await ctx.factory.isGauge(pool, gauge)) throw new Error("Factory gauge validation failed.");
  }
  async function factoryPanelV2(ctx) {
    await validateFactory(ctx);
    const L = C.V2_LIMITS;
    const f = await read(ctx.factory, ["dao", "treasury", "rewardToken", "oracle", "implementation", "defaultKeeper", "daoFeeBps", "vaultCount"]);
    if (!await ctx.factory.isKeeper(f.defaultKeeper)) throw new Error("Factory default keeper is not an enabled keeper.");
    for (const key of ["oracle", "implementation"]) {
      if (ctx.config[key] && !C.eq(f[key], ctx.config[key])) throw new Error(`Factory ${key} does not match the configured v2 deployment. Management disabled.`);
    }
    const routePools = ctx.config.routePools || [];
    const approved = await Promise.all(routePools.map((p) => ctx.factory.approvedPool(p)));
    const treasury = field("New treasury", f.treasury);
    const daoFee = field(`DAO fee (${L.daoFee[0]}–${L.daoFee[1]} bps of gross income)`, f.daoFeeBps, "number");
    const keeper = field("Factory keeper address");
    const keeperOn = choice("Factory keeper permission");
    const defaultKeeper = field("Default keeper (must already be a factory keeper)", f.defaultKeeper);
    const pool = field("Reward-route pool", routePools[0] || "");
    const poolOn = choice("Approved for reward routes");
    const officialVault = field("Factory vault", ctx.config.vaults[0]?.address || "");
    const officialOn = choice("Official label");
    const newPool = field("Aero classic pool (LP asset)");
    const newStrategist = field("Strategist recipient (zero = DAO Safe as owner)", CFG.dao);
    const newStrategistBps = field(`Strategist fee (${L.strategist[0]}–${L.strategist[1]} bps)`, "0", "number");
    const newName = field(`Share name (1–${L.name} bytes)`);
    const newSymbol = field(`Share symbol (1–${L.symbol} bytes)`);
    const tx = (name, args) => ({ to: ctx.config.factory, data: fi2.encodeFunctionData(name, args) });
    const guard = () => validateFactory(ctx);
    const panel = card("Factory v2 · validated",
      table(addrRow(ctx.chain, "Factory (Aero v2)", ctx.config.factory), addrRow(ctx.chain, "DAO (immutable)", f.dao),
        addrRow(ctx.chain, "Treasury", f.treasury), addrRow(ctx.chain, "Reward token", f.rewardToken),
        addrRow(ctx.chain, "TWAP oracle (checked)", f.oracle), addrRow(ctx.chain, "Vault implementation (not a vault)", f.implementation),
        addrRow(ctx.chain, "Default keeper", f.defaultKeeper),
        row("DAO fee", `${f.daoFeeBps} bps of gross harvested income`),
        ...routePools.map((p, i) => row(`Route pool ${short(p)}`, approved[i] ? "Approved" : "Not approved")),
        row("Registered vaults", String(f.vaultCount))),
      action(ctx, "Set DAO fee", [daoFee], () => tx("setDaoFee", [C.bps(daoFee.input.value, ...L.daoFee)]), guard),
      action(ctx, "Set treasury", [treasury], () => tx("setTreasury", [address(treasury.input.value)]), guard),
      action(ctx, "Set factory keeper", [keeper, keeperOn], async () => {
        const a = address(keeper.input.value);
        const on = keeperOn.input.value === "true";
        if (!on && C.eq(a, await ctx.factory.defaultKeeper())) throw new Error("The default keeper cannot be disabled. Change the default keeper first.");
        return tx("setKeeper", [a, on]);
      }, guard),
      h("p", { class: "muted" }, "Factory keepers can harvest every v2 vault."),
      action(ctx, "Set default keeper", [defaultKeeper], async () => {
        const a = address(defaultKeeper.input.value);
        if (!await ctx.factory.isKeeper(a)) throw new Error("Keeper must already be an enabled factory keeper.");
        return tx("setDefaultKeeper", [a]);
      }, guard),
      action(ctx, "Set approved reward-route pool", [pool, poolOn], async () => {
        const a = address(pool.input.value);
        const on = poolOn.input.value === "true";
        if (on && !await ctx.factory.isPool(a)) throw new Error("Not an Aero classic pool.");
        return tx("setApprovedPool", [a, on]);
      }, guard),
      action(ctx, "Set official vault label", [officialVault, officialOn], async () => {
        const a = address(officialVault.input.value);
        if (!await ctx.factory.isVault(a)) throw new Error("Address is not a vault of this factory.");
        return tx("setOfficial", [a, officialOn.input.value === "true"]);
      }, guard),
      action(ctx, "Create vault (DAO Safe becomes owner)", [newPool, newStrategist, newStrategistBps, newName, newSymbol], async () => {
        const p = address(newPool.input.value);
        if (!await ctx.factory.isPool(p)) throw new Error("Not an Aero classic pool.");
        const s = newStrategist.input.value.trim() ? ethers.getAddress(newStrategist.input.value.trim()) : zero;
        return tx("createVault", [p, s, C.bps(newStrategistBps.input.value, ...L.strategist),
          C.text(newName.input.value, L.name, "Name"), C.text(newSymbol.input.value, L.symbol, "Symbol")]);
      }, guard),
      h("p", { class: "muted" }, "createVault is permissionless; the caller (here the DAO Safe) becomes owner. New vaults start with keeper 50 bps, exit 0 bps, no gauge and no reward route; attach the gauge (DAO), set the route, then enable staking."));
    if (ctx.id === generation) $("aeroFactory").replaceChildren(panel);
    return f;
  }
  async function factoryPanel(ctx) {
    if (ver(ctx) === 2) return factoryPanelV2(ctx);
    await validateFactory(ctx);
    const f = await read(ctx.factory, ["dao", "treasury", "rewardToken", "deferredHandler", "defaultKeeper", "daoRewardBps", "daoEntryExitShareBps", "vaultCount"]);
    if (!await ctx.factory.mandatoryKeepers(f.defaultKeeper)) throw new Error("Factory default keeper is not mandatory.");
    const reward = field("DAO reward fee (1–1000 bps)", f.daoRewardBps, "number");
    const share = field("DAO share of entry/exit fees (0–1000 bps)", f.daoEntryExitShareBps, "number");
    const keeper = field("Mandatory keeper address");
    const defaultKeeper = field("Default keeper (must already be mandatory)", f.defaultKeeper);
    const tx = (name, args) => ({ to: ctx.config.factory, data: fi.encodeFunctionData(name, args) });
    const guard = () => validateFactory(ctx);
    const panel = card("Factory · validated",
      table(addrRow(ctx.chain, "Factory", ctx.config.factory), addrRow(ctx.chain, "DAO (immutable; no factory owner)", f.dao),
        addrRow(ctx.chain, "Treasury", f.treasury), addrRow(ctx.chain, "Reward token", f.rewardToken),
        addrRow(ctx.chain, "Deferred handler", f.deferredHandler), addrRow(ctx.chain, "Default mandatory keeper", f.defaultKeeper),
        row("DAO reward fee", `${f.daoRewardBps} bps`), row("DAO entry/exit fee share", `${f.daoEntryExitShareBps} bps of fees (not deposit value)`),
        row("Registered vaults", String(f.vaultCount))),
      action(ctx, "Set factory DAO fees", [reward, share], () => tx("setDaoFees", [C.bps(reward.input.value, 1, 1000), C.bps(share.input.value, 0, 1000)]), guard),
      action(ctx, "Add permanent mandatory keeper", [keeper], () => tx("addMandatoryKeeper", [address(keeper.input.value)]), guard),
      h("p", { class: "muted" }, "Mandatory keepers cannot be removed. Adding one grants harvest authority to every factory vault."),
      action(ctx, "Set default keeper", [defaultKeeper], async () => {
        const a = address(defaultKeeper.input.value);
        if (!await ctx.factory.mandatoryKeepers(a)) throw new Error("Keeper must already be mandatory.");
        return tx("setDefaultKeeper", [a]);
      }, guard));
    if (ctx.id === generation) $("aeroFactory").replaceChildren(panel);
    return f;
  }
  async function vaultPanelV2(ctx, v, target, metadata, zap, ownerGuard) {
    const L = C.V2_LIMITS;
    const s = await read(v, ["name", "symbol", "owner", "pendingOwner", "asset", "gauge", "token0", "token1", "rewardToken", "stablePool",
      "totalAssets", "totalSupply", "lockedProfitNow", "profitUnlockTime", "nextProfitUnlockTime", "lastHarvest", "stakingEnabled", "stakedLp",
      "openHarvest", "strategist", "strategistBps", "keeperBps", "exitBps", "maxDeviationBps", "maxSlippageBps", "maxSwapBps", "rewardRoute"]);
    const [official, daoFeeBps] = await Promise.all([ctx.factory.isOfficial(target), ctx.factory.daoFeeBps()]);
    const route = [...s.rewardRoute];
    const tx = (name, args = []) => ({ to: target, data: vi2.encodeFunctionData(name, args) });
    const daoGuard = () => validateVault(ctx, v, target);
    const recipient = field("Strategist recipient", s.strategist);
    const strategy = field(`Strategist fee (${L.strategist[0]}–${L.strategist[1]} bps)`, s.strategistBps, "number");
    const keeperFee = field(`Keeper fee (${L.keeper[0]}–${L.keeper[1]} bps)`, s.keeperBps, "number");
    const exit = field(`Exit fee (${L.exit[0]}–${L.exit[1]} bps, retained by holders)`, s.exitBps, "number");
    const deviation = field(`Max TWAP deviation (${L.deviation[0]}–${L.deviation[1]} bps)`, s.maxDeviationBps, "number");
    const slippage = field(`Max slippage (${L.slippage[0]}–${L.slippage[1]} bps)`, s.maxSlippageBps, "number");
    const swapSize = field(`Max swap size (${L.swap[0]}–${L.swap[1]} bps of reserves)`, s.maxSwapBps, "number");
    const unlock = field(`Profit unlock time (${L.unlock[0]}–${L.unlock[1]} seconds)`, s.nextProfitUnlockTime, "number");
    const keeper = field("Keeper address");
    const enabled = choice("Extra keeper permission");
    const open = choice("Open harvest (anyone may harvest)");
    open.input.value = String(s.openHarvest);
    const routeIn = field(`Reward route pools (≤${L.route}, comma separated; empty disables swaps)`,
      (route.length ? route : metadata?.route || ctx.config.routePools || []).join(", "));
    const gaugeIn = field("Gauge (zero address detaches)", s.gauge);
    const stake = choice("Gauge staking");
    stake.input.value = String(s.stakingEnabled);
    const nextOwner = field("New owner (two-step transfer)");
    const lookup = field("Check keeper address", await ctx.factory.defaultKeeper());
    const lookupOut = h("p", { class: "muted", role: "status" });
    const rewardInPair = C.eq(s.rewardToken, s.token0) || C.eq(s.rewardToken, s.token1);
    return card(`${s.name} · ${s.symbol} · Aero v2`,
      h("p", { class: C.eq(s.owner, CFG.dao) ? "result ok" : "result warn" },
        C.eq(s.owner, CFG.dao) ? "DAO Safe owns this vault. Owner management is available."
          : C.eq(s.pendingOwner, CFG.dao) ? "DAO Safe is pending owner. Simulate acceptOwnership before owner management."
            : "DAO Safe does not own this vault and is not pending owner. DAO-only gauge/staking actions remain available."),
      table(addrRow(ctx.chain, "Vault", target), addrRow(ctx.chain, "Factory v2 (validated)", ctx.config.factory),
        row("Configured market", metadata?.name || "Discovered vault (no explicit market metadata)"),
        row("Official", official ? "Yes (DAO label)" : "No"),
        row(metadata?.zap ? "Zap v2 (factory checked)" : "Zap (pending metadata)", zap),
        ...(metadata?.zap ? [
          row("Zap management", "Immutable, stateless router; no owner, upgrade or admin setters."),
          row("Zap source", h("a", { href: `contract-source.html?chain=${ctx.chain}`, target: "_blank", rel: "noopener noreferrer" }, "Open verified deployed source · copy · repository location")),
        ] : []),
        addrRow(ctx.chain, "Owner", s.owner), addrRow(ctx.chain, "Pending owner", s.pendingOwner),
        addrRow(ctx.chain, "LP asset", s.asset), row("Pool type", s.stablePool ? "Stable" : "Volatile"), addrRow(ctx.chain, "Gauge", s.gauge),
        addrRow(ctx.chain, "Token 0", s.token0), addrRow(ctx.chain, "Token 1", s.token1), addrRow(ctx.chain, "Reward token", s.rewardToken),
        row("LP assets (raw; excludes unlocking profit)", String(s.totalAssets)), row("Unlocking profit (raw LP)", String(s.lockedProfitNow)),
        row("Share supply (raw units)", String(s.totalSupply)),
        row("Profit unlock time", `${s.profitUnlockTime} s (next harvest: ${s.nextProfitUnlockTime} s)`),
        row("Last harvest", Number(s.lastHarvest) ? new Date(Number(s.lastHarvest) * 1000).toISOString() : "Never"),
        row("Staking", s.stakingEnabled ? `Enabled · ${s.stakedLp} LP staked` : "Disabled"),
        row("Open harvest", s.openHarvest ? "Yes" : "No (keepers only)"),
        row("Reward route", route.length ? h("span", {}, ...route.map((p) => link(ctx.chain, p))) : "None (reward swaps disabled)"),
        addrRow(ctx.chain, "Strategist", s.strategist),
        row("Income fees (independent % of gross)", `DAO ${daoFeeBps} · strategist ${s.strategistBps} · keeper ${s.keeperBps} bps`),
        row("Exit fee (kept by holders)", `${s.exitBps} bps`),
        row("Risk (deviation / slippage / swap size)", `${s.maxDeviationBps} / ${s.maxSlippageBps} / ${s.maxSwapBps} bps`)),
      h("div", { class: "form" }, lookup.node), h("button", { class: "btn small", onclick: async () => {
        try {
          const a = address(lookup.input.value);
          const [factoryKeeper, extra, effective] = await Promise.all([ctx.factory.isKeeper(a), v.extraKeepers(a), v.isKeeper(a)]);
          lookupOut.textContent = `Factory: ${factoryKeeper ? "yes" : "no"} · Extra: ${extra ? "yes" : "no"} · Effective: ${effective ? "yes" : "no"}`;
        } catch (e) { lookupOut.textContent = A.decodeError(e); }
      } }, "Read keeper permissions"), lookupOut,
      action(ctx, "Accept vault ownership as DAO Safe", [], () => tx("acceptOwnership"), async () => {
        await validateVault(ctx, v, target);
        if (!C.eq(await v.pendingOwner(), CFG.dao)) throw new Error("DAO Safe is not pending owner.");
      }),
      action(ctx, "Set vault fees", [recipient, strategy, keeperFee, exit], () => {
        const a = address(recipient.input.value);
        if (C.eq(a, target)) throw new Error("Strategist cannot be the vault.");
        return tx("setFees", [a, C.bps(strategy.input.value, ...L.strategist), C.bps(keeperFee.input.value, ...L.keeper), C.bps(exit.input.value, ...L.exit)]);
      }, ownerGuard),
      action(ctx, "Set risk limits", [deviation, slippage, swapSize], () => tx("setRisk", [
        C.bps(deviation.input.value, ...L.deviation), C.bps(slippage.input.value, ...L.slippage), C.bps(swapSize.input.value, ...L.swap),
      ]), ownerGuard),
      action(ctx, "Set profit unlock time", [unlock], () => tx("setProfitUnlockTime", [C.int(unlock.input.value, ...L.unlock, "Unlock time")]), ownerGuard),
      h("p", { class: "muted" }, "The new unlock time applies from the next harvest; keep it at least the harvest interval."),
      action(ctx, "Set extra keeper", [keeper, enabled], () => tx("setKeeper", [address(keeper.input.value), enabled.input.value === "true"]), ownerGuard),
      action(ctx, "Set open harvest", [open], () => tx("setOpenHarvest", [open.input.value === "true"]), ownerGuard),
      action(ctx, "Set reward route", [routeIn], async () => {
        const pools = C.list(routeIn.input.value, L.route).map(address);
        if (new Set(pools.map((p) => p.toLowerCase())).size !== pools.length) throw new Error("Route pools must be unique.");
        if (pools.length && rewardInPair) throw new Error("Reward token is a pair token; no route is needed.");
        if (!pools.length && s.stakingEnabled && !rewardInPair) throw new Error("Staking is enabled; an empty route would strand rewards. Disable staking first.");
        for (const p of pools) {
          if (!C.eq(p, s.asset) && !await ctx.factory.approvedPool(p)) throw new Error(`Pool ${p} is not DAO-approved.`);
        }
        return tx("setRewardRoute", [pools]);
      }, ownerGuard),
      action(ctx, "Set gauge (DAO)", [gaugeIn], async () => {
        const g = ethers.getAddress(gaugeIn.input.value.trim());
        if (await v.stakingEnabled() || await v.stakedLp() !== 0n) throw new Error("Disable staking and unstake before changing the gauge.");
        if (!C.eq(g, zero) && !await ctx.factory.isGauge(s.asset, g)) throw new Error("Factory does not recognize this gauge for the vault pool.");
        return tx("setGauge", [g]);
      }, daoGuard),
      action(ctx, "Set gauge staking (DAO)", [stake], async () => {
        const on = stake.input.value === "true";
        if (on) {
          if (C.eq(await v.gauge(), zero)) throw new Error("Vault has no gauge. Set the gauge first.");
          if (!rewardInPair && !(await v.rewardRoute()).length) throw new Error("Set a reward route before enabling staking.");
        }
        return tx("setStaking", [on]);
      }, daoGuard),
      h("p", { class: "muted" }, "Enabling staking is DAO-only; disabling (DAO or owner) claims emissions and withdraws all LP to the vault."),
      action(ctx, "Transfer vault ownership", [nextOwner], () => tx("transferOwnership", [address(nextOwner.input.value)]), ownerGuard));
  }
  async function inspect(ctx, target) {
    const selection = ++selected;
    ctx = { ...ctx, selection };
    $("aeroVault").replaceChildren(card("Vault inspection", h("p", { class: "muted" }, "Validating factory, pool and gauge…")));
    try {
      const v = new ethers.Contract(target, C.abis(ver(ctx)).vault, ctx.provider);
      await validateVault(ctx, v, target);
      const metadata = ctx.config.vaults.find((item) => C.eq(item.address, target));
      let zap = "Not configured for this vault";
      if (metadata?.zap) {
        await code(ctx.provider, metadata.zap);
        const z = new ethers.Contract(metadata.zap, ["function factory() view returns (address)"], ctx.provider);
        if (!C.eq(await z.factory(), ctx.config.factory)) throw new Error("Configured zap points to a different factory.");
        zap = link(ctx.chain, metadata.zap);
      }
      const ownerGuard = async () => {
        await validateVault(ctx, v, target);
        if (!C.eq(await v.owner(), CFG.dao)) throw new Error("DAO Safe is not the vault owner. Complete ownership transfer first.");
      };
      if (ver(ctx) === 2) {
        const panel = await vaultPanelV2(ctx, v, target, metadata, zap, ownerGuard);
        if (ctx.id === generation && selection === selected) $("aeroVault").replaceChildren(panel);
        return;
      }
      const s = await read(v, ["name", "symbol", "owner", "pendingOwner", "asset", "gauge", "token0", "token1", "rewardToken", "totalAssets", "totalSupply", "stakingEnabled", "strategist", "strategistBps", "keeperBps", "entryBps", "exitBps"]);
      const tx = (name, args = []) => ({ to: target, data: vi.encodeFunctionData(name, args) });
      const recipient = field("Strategist recipient", s.strategist);
      const strategy = field("Strategist fee (0–1000 bps)", s.strategistBps, "number");
      const keeperFee = field("Keeper fee (10–200 bps)", s.keeperBps, "number");
      const entry = field("Entry fee (0–200 bps)", s.entryBps, "number");
      const exit = field("Exit fee (0–200 bps)", s.exitBps, "number");
      const keeper = field("Keeper address");
      const enabled = choice("Extra keeper permission");
      const stake = choice("Gauge staking");
      stake.input.value = String(s.stakingEnabled);
      const nextOwner = field("New owner (two-step transfer)");
      const lookup = field("Check keeper address", await ctx.factory.defaultKeeper());
      const lookupOut = h("p", { class: "muted", role: "status" });
      const panel = card(`${s.name} · ${s.symbol}`,
        h("p", { class: C.eq(s.owner, CFG.dao) ? "result ok" : "result warn" },
          C.eq(s.owner, CFG.dao) ? "DAO Safe owns this vault. Owner management is available."
            : C.eq(s.pendingOwner, CFG.dao) ? "DAO Safe is pending owner. Simulate acceptOwnership before owner management."
              : "DAO Safe does not own this vault and is not pending owner. The current owner must initiate a transfer before DAO management."),
        table(addrRow(ctx.chain, "Vault", target), addrRow(ctx.chain, "Factory (validated)", ctx.config.factory),
          row("Configured market", metadata?.name || "Discovered vault (no explicit market metadata)"),
          row(metadata?.zap ? "Zap (factory checked)" : "Zap (pending metadata)", zap),
          ...(metadata?.zap ? [
            row("Zap management", "Immutable, stateless router; no owner, upgrade or admin setters."),
            row("Zap source", h("a", { href: `contract-source.html?chain=${ctx.chain}`, target: "_blank", rel: "noopener noreferrer" }, "Open verified deployed source · copy · repository location")),
          ] : []),
          addrRow(ctx.chain, "Owner", s.owner), addrRow(ctx.chain, "Pending owner", s.pendingOwner),
          addrRow(ctx.chain, "LP asset", s.asset), addrRow(ctx.chain, "Gauge", s.gauge),
          addrRow(ctx.chain, "Token 0", s.token0), addrRow(ctx.chain, "Token 1", s.token1), addrRow(ctx.chain, "Reward token", s.rewardToken),
          row("LP assets (raw units; excludes reward basket)", String(s.totalAssets)), row("Share supply (raw units)", String(s.totalSupply)),
          row("Staking", s.stakingEnabled ? "Enabled" : "Disabled"), addrRow(ctx.chain, "Strategist", s.strategist),
          row("Strategist / keeper reward fees", `${s.strategistBps} / ${s.keeperBps} bps`),
          row("Entry / exit fees", `${s.entryBps} / ${s.exitBps} bps`)),
        h("div", { class: "form" }, lookup.node), h("button", { class: "btn small", onclick: async () => {
          try {
            const a = address(lookup.input.value);
            const [mandatory, extra, effective] = await Promise.all([ctx.factory.mandatoryKeepers(a), v.extraKeepers(a), v.isKeeper(a)]);
            lookupOut.textContent = `Mandatory: ${mandatory ? "yes" : "no"} · Extra: ${extra ? "yes" : "no"} · Effective: ${effective ? "yes" : "no"}`;
          } catch (e) { lookupOut.textContent = A.decodeError(e); }
        } }, "Read keeper permissions"), lookupOut,
        action(ctx, "Accept vault ownership as DAO Safe", [], () => tx("acceptOwnership"), async () => {
          await validateVault(ctx, v, target);
          if (!C.eq(await v.pendingOwner(), CFG.dao)) throw new Error("DAO Safe is not pending owner.");
        }),
        action(ctx, "Set vault fees", [recipient, strategy, keeperFee, entry, exit], () => {
          const a = address(recipient.input.value);
          if (C.eq(a, target)) throw new Error("Strategist cannot be the vault.");
          return tx("setFees", [a, C.bps(strategy.input.value, 0, 1000), C.bps(keeperFee.input.value, 10, 200), C.bps(entry.input.value, 0, 200), C.bps(exit.input.value, 0, 200)]);
        }, ownerGuard),
        action(ctx, "Set extra keeper", [keeper, enabled], async () => {
          const a = address(keeper.input.value);
          const on = enabled.input.value === "true";
          if (!on && await ctx.factory.mandatoryKeepers(a)) throw new Error("Mandatory keepers cannot be disabled.");
          return tx("setKeeper", [a, on]);
        }, ownerGuard),
        action(ctx, "Set gauge staking", [stake], () => {
          if (C.eq(s.gauge, zero)) throw new Error("Vault has no gauge.");
          return tx("setStaking", [stake.input.value === "true"]);
        }, ownerGuard),
        h("p", { class: "muted" }, "Disabling staking withdraws LP from the gauge and collects rewards. Review simulation and Safe execution carefully."),
        action(ctx, "Transfer vault ownership", [nextOwner], () => tx("transferOwnership", [address(nextOwner.input.value)]), ownerGuard));
      if (ctx.id === generation && selection === selected) $("aeroVault").replaceChildren(panel);
    } catch (e) {
      if (ctx.id === generation && selection === selected) $("aeroVault").replaceChildren(card("Vault validation failed · management unavailable", error(e)));
    }
  }
  async function discover(ctx, count, offset = 0n) {
    const request = ++discovery;
    const host = $("aeroVaults");
    host.replaceChildren(card("Factory vaults", h("p", { class: "muted" }, "Reading discovery page…")));
    try {
      const page = C.page(count, offset);
      const addresses = await Promise.all(page.indices.map((index) => ctx.factory.vaults(index)));
      const known = ctx.config.vaults.filter((v) => v.address);
      const unique = [...new Set([...known.map((v) => v.address), ...addresses].map((v) => v.toLowerCase()))];
      const official = ver(ctx) === 2 ? await Promise.all(unique.map((target) => ctx.factory.isOfficial(target))) : [];
      const rows = unique.map((target, i) => {
        const meta = known.find((v) => C.eq(v.address, target));
        const name = meta?.name || "Discovered vault";
        return h("tr", {}, h("td", {}, official[i] ? `${name} · official` : name), h("td", {}, link(ctx.chain, target)),
          h("td", {}, h("button", { class: "btn small", onclick: () => inspect(ctx, target) }, "Validate & inspect")));
      });
      const panel = card("Factory vaults",
        h("p", { class: "muted" }, `Showing factory indices ${offset}–${offset + BigInt(addresses.length)} of ${count} (end exclusive), plus configured vaults. Every selection is validated on-chain.`),
        rows.length ? table(...rows) : h("p", {}, "No vaults found in this factory."),
        offset > 0n ? h("button", { class: "btn small", onclick: () => discover(ctx, count, offset - 20n) }, "Previous 20") : null,
        page.next !== null ? h("button", { class: "btn small", onclick: () => discover(ctx, count, page.next) }, "Next 20") : null);
      if (ctx.id === generation && request === discovery) host.replaceChildren(panel);
    } catch (e) { if (ctx.id === generation && request === discovery) host.replaceChildren(card("Discovery failed", error(e))); }
  }
  async function refresh() {
    const id = ++generation;
    ++selected;
    const chain = Number($("aeroNetwork").value);
    const config = CFG.aero[chain];
    $("aeroFactory").replaceChildren();
    $("aeroVaults").replaceChildren();
    $("aeroVault").replaceChildren();
    $("aeroStatus").replaceChildren(h("p", { class: "muted" }, "Loading public on-chain state…"));
    try {
      await A.ready();
      const provider = A.providerFor(chain);
      if (!provider || !config) throw new Error("Network is not configured.");
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== chain) throw new Error("RPC chain mismatch.");
      const ctx = { id, chain, config, provider, factory: new ethers.Contract(config.factory, C.abis(config.version).factory, provider) };
      const f = await factoryPanel(ctx);
      if (id !== generation) return;
      const pending = config.vaults.some((v) => !v.address || !v.zap);
      $("aeroStatus").replaceChildren(h("p", { class: pending ? "result warn" : "result ok" }, pending
        ? "Replacement vault / zap metadata pending. Discovery uses only the newest factory; no retired Base addresses are used."
        : "Factory validated. Select a vault to verify ownership, pool, gauge and zap."),
        config.legacy ? h("p", { class: "muted" }, `Aero v${config.version || 1} on this network supersedes v1 factory ${config.legacy.factory}, zap ${config.legacy.zap} and vaults `
          + `${config.legacy.vaults.map((v) => `${v.name} ${v.address}`).join(", ")}. Superseded contracts are not managed or listed here.`) : null);
      await discover(ctx, f.vaultCount);
    } catch (e) { if (id === generation) $("aeroStatus").replaceChildren(error(e)); }
  }
  $("aeroRefresh").addEventListener("click", refresh);
  $("aeroNetwork").addEventListener("change", refresh);
  document.querySelector('#modules button[data-module="aero"]').addEventListener("click", refresh);
})();
