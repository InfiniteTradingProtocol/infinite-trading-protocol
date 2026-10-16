(() => {
  "use strict";

  const CFG = window.ITP_CONFIG;
  const NETWORKS_KEY = "itp-uniswap-custom-networks";
  const DEPLOYMENTS_KEY = "itp-uniswap-deployments";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const records = readJson(DEPLOYMENTS_KEY, []);
  const customNetworks = readJson(NETWORKS_KEY, []);
  const artifactCache = new Map();
  const $ = (id) => document.getElementById(id);

  for (const network of customNetworks) {
    if (network?.chainId && !CFG.networks[network.chainId]) CFG.networks[network.chainId] = network;
  }
  for (const record of records) addV3ToRegistry(record);

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "null");
      return Array.isArray(value) ? value : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJson(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function addV3ToRegistry(record) {
    if (record.version !== "v3" || !record.address) return;
    if (!CFG.v3Compounders.some((vault) => vault.address.toLowerCase() === record.address.toLowerCase())) {
      CFG.v3Compounders.push({
        name: record.name,
        address: record.address,
        token0: record.token0,
        token1: record.token1,
        chainId: record.chainId,
      });
    }
  }

  function setStatus(kind, messages) {
    const output = $("deploymentStatus");
    output.className = `result ${kind}`;
    output.replaceChildren(...messages.map((message) => {
      const line = document.createElement("div");
      line.textContent = message;
      return line;
    }));
  }

  function address(value, label, optional = false) {
    const valueTrimmed = value.trim();
    if (optional && !valueTrimmed) return ZERO_ADDRESS;
    if (!ethers.isAddress(valueTrimmed)) throw new Error(`${label} must be a valid address.`);
    return ethers.getAddress(valueTrimmed);
  }

  function url(value, label, optional = false) {
    const valueTrimmed = value.trim();
    if (optional && !valueTrimmed) return "";
    let parsed;
    try {
      parsed = new URL(valueTrimmed);
    } catch {
      throw new Error(`${label} must be a valid URL.`);
    }
    if (!/^https?:$/.test(parsed.protocol)) throw new Error(`${label} must use HTTP or HTTPS.`);
    if (parsed.protocol === "http:" && !["localhost", "127.0.0.1", "::1"].includes(parsed.hostname)) {
      throw new Error(`${label} must use HTTPS unless it is a local endpoint.`);
    }
    return parsed.toString().replace(/\/$/, "");
  }

  function dispatchNetwork(network) {
    window.dispatchEvent(new CustomEvent("itp:network-added", { detail: network }));
  }

  function registerCustomNetwork() {
    const chainId = Number($("customChainId").value);
    const chainName = $("customChainName").value.trim();
    const rpcUrl = url($("deploymentRpc").value, "Read RPC URL");
    const explorer = url($("customExplorer").value, "Explorer URL", true);
    if (!Number.isSafeInteger(chainId) || chainId < 1) throw new Error("Custom chain ID must be a positive safe integer.");
    if (!chainName) throw new Error("Custom chain name is required.");
    if (CFG.networks[chainId] && !customNetworks.some((network) => network.chainId === chainId)) {
      throw new Error("That chain ID is already configured; select it from the network list instead.");
    }
    const network = {
      chainId,
      chainIdHex: ethers.toBeHex(BigInt(chainId)),
      chainName,
      rpcUrls: [rpcUrl],
      explorer,
    };
    const existing = customNetworks.findIndex((item) => item.chainId === chainId);
    if (existing >= 0) customNetworks[existing] = network;
    else customNetworks.push(network);
    saveJson(NETWORKS_KEY, customNetworks);
    CFG.networks[chainId] = network;
    const option = document.createElement("option");
    option.value = String(chainId);
    option.textContent = `${chainName} (${chainId})`;
    const select = $("deploymentNetwork");
    const prior = [...select.options].find((item) => item.value === String(chainId));
    if (prior) prior.replaceWith(option);
    else select.insertBefore(option, select.querySelector('option[value="custom"]'));
    select.value = String(chainId);
    $("customNetworkFields").classList.add("hidden");
    dispatchNetwork(network);
    setStatus("ok", [`Added ${chainName} (${chainId}). Verify that the RPC and protocol addresses belong to this chain.`]);
  }

  function populateNetworks() {
    const select = $("deploymentNetwork");
    const options = Object.entries(CFG.networks)
      .map(([id, network]) => Object.assign(document.createElement("option"), { value: id, textContent: `${network.chainName} (${id})` }));
    const custom = Object.assign(document.createElement("option"), { value: "custom", textContent: "Add custom EVM chain…" });
    select.replaceChildren(...options, custom);
    select.value = CFG.networks[8453] ? "8453" : options[0]?.value || "custom";
    selectNetworkChanged();
  }

  function selectNetworkChanged() {
    const custom = $("deploymentNetwork").value === "custom";
    $("customNetworkFields").classList.toggle("hidden", !custom);
    const network = CFG.networks[$("deploymentNetwork").value];
    $("deploymentRpc").value = custom ? "" : network?.rpcUrls?.[0] || "";
    fillPresets();
  }

  function fillPresets() {
    const preset = CFG.uniswapPresets[Number($("deploymentNetwork").value)] || {};
    const v3 = preset.v3 || {};
    const v4 = preset.v4 || {};
    $("deploymentV3Manager").value = v3.positionManager || "";
    $("deploymentV3Router").value = v3.swapRouter || "";
    $("deploymentV4Manager").value = v4.positionManager || "";
    $("deploymentV4Router").value = v4.universalRouter || "";
    $("deploymentV4StateView").value = v4.stateView || "";
    $("deploymentV4Permit2").value = v4.permit2 || "";
  }

  function versionChanged() {
    const v3 = $("deploymentVersion").value === "v3";
    $("deploymentV3Fields").classList.toggle("hidden", !v3);
    $("deploymentV4Fields").classList.toggle("hidden", v3);
    fillPresets();
  }

  function currentNetwork() {
    const selected = $("deploymentNetwork").value;
    const rpcUrl = url($("deploymentRpc").value, "Read RPC URL");
    if (selected === "custom") throw new Error("Add the custom network before validating or deploying.");
    const configured = CFG.networks[selected];
    if (!configured) throw new Error("Select a configured network.");
    return { ...configured, rpcUrls: [rpcUrl] };
  }

  async function providerFor(network) {
    const provider = new ethers.JsonRpcProvider(network.rpcUrls[0], network.chainId, { staticNetwork: true });
    const actual = await provider.getNetwork();
    if (actual.chainId !== BigInt(network.chainId)) throw new Error(`RPC reports chain ${actual.chainId}, expected ${network.chainId}.`);
    return provider;
  }

  async function requireCode(provider, contractAddress, label) {
    if (await provider.getCode(contractAddress) === "0x") throw new Error(`${label} has no contract code on ${$("deploymentNetwork").selectedOptions[0].textContent}.`);
  }

  async function loadArtifact(name) {
    if (artifactCache.has(name)) return artifactCache.get(name);
    const response = await fetch(`/artifacts/${name}.json`, { cache: "no-store" });
    if (!response.ok) throw new Error("Local contract artifacts are unavailable. Start the dashboard with serve.py and allow it to build the contracts.");
    const artifact = await response.json();
    if (!artifact.abi || !artifact.bytecode?.object || artifact.bytecode.object === "0x") throw new Error(`${name} artifact has no deployable bytecode.`);
    artifactCache.set(name, artifact);
    return artifact;
  }

  function requireShareLock(artifact, version) {
    const getter = artifact.abi.find((item) => item.type === "function" && item.name === "MINIMUM_LIQUIDITY");
    if (!getter) throw new Error(`${version.toUpperCase()} artifact is missing the first-depositor share lock; refusing deployment.`);
    if (version === "v3") {
      const constructor = artifact.abi.find((item) => item.type === "constructor");
      if (constructor?.inputs.length !== 8) throw new Error("V3 artifact constructor does not match the dashboard deploy flow.");
    }
  }

  async function validateV3(provider, network) {
    const token0 = address($("deploymentToken0").value, "Token 0");
    const token1 = address($("deploymentToken1").value, "Token 1");
    if (BigInt(token0) >= BigInt(token1)) throw new Error("Token 0 must be the lower address; swap the token inputs if needed.");
    const poolAddress = address($("deploymentV3Pool").value, "V3 pool");
    const keeper = address($("deploymentKeeper").value, "Initial keeper");
    const dao = address($("deploymentDao").value, "DAO / owner");
    const managerAddress = address($("deploymentV3Manager").value, "Position manager");
    const routerAddress = address($("deploymentV3Router").value, "Swap router");
    const fee = BigInt($("deploymentV3Fee").value);
    if (fee <= 0n || fee > 1000000n) throw new Error("V3 fee tier must be between 1 and 1,000,000.");
    const pool = new ethers.Contract(poolAddress, [
      "function token0() view returns (address)",
      "function token1() view returns (address)",
      "function fee() view returns (uint24)",
      "function factory() view returns (address)",
    ], provider);
    const [poolToken0, poolToken1, poolFee, factoryAddress] = await Promise.all([pool.token0(), pool.token1(), pool.fee(), pool.factory()]);
    if (poolToken0.toLowerCase() !== token0.toLowerCase() || poolToken1.toLowerCase() !== token1.toLowerCase()) throw new Error("Pool token addresses do not match the entered token order.");
    if (poolFee !== fee) throw new Error(`Pool fee is ${poolFee}; entered fee is ${fee}.`);
    const manager = new ethers.Contract(managerAddress, ["function factory() view returns (address)"], provider);
    if ((await manager.factory()).toLowerCase() !== factoryAddress.toLowerCase()) throw new Error("Position manager factory does not match the pool's factory.");
    const router = new ethers.Contract(routerAddress, [
      "function factory() view returns (address)",
      "function factoryV3() view returns (address)",
    ], provider);
    const routerFactory = await router.factory().catch(() => router.factoryV3().catch(() => null));
    if (!routerFactory) throw new Error("Swap router does not expose a verifiable V3 factory address.");
    if (routerFactory.toLowerCase() !== factoryAddress.toLowerCase()) throw new Error("Swap router factory does not match the selected pool.");
    const factory = new ethers.Contract(factoryAddress, ["function getPool(address,address,uint24) view returns (address)"], provider);
    if ((await factory.getPool(token0, token1, fee)).toLowerCase() !== poolAddress.toLowerCase()) throw new Error("Pool factory does not recognize this pool for the selected pair and fee.");
    await Promise.all([
      requireCode(provider, token0, "Token 0"),
      requireCode(provider, token1, "Token 1"),
      requireCode(provider, poolAddress, "V3 pool"),
      requireCode(provider, managerAddress, "Position manager"),
      requireCode(provider, routerAddress, "Swap router"),
    ]);
    const artifact = await loadArtifact("v3");
    requireShareLock(artifact, "v3");
    return { version: "v3", network, token0, token1, poolAddress, keeper, dao, managerAddress, routerAddress, fee, artifact };
  }

  async function validateV4(provider, network) {
    const token0 = address($("deploymentToken0").value, "Token 0");
    const token1 = address($("deploymentToken1").value, "Token 1");
    if (BigInt(token0) >= BigInt(token1)) throw new Error("Token 0 must be the lower address; swap the token inputs if needed.");
    const keeper = address($("deploymentKeeper").value, "Initial keeper");
    const dao = address($("deploymentDao").value, "DAO / owner");
    const keeper2 = address($("deploymentV4Keeper2").value, "Second keeper", true);
    const managerAddress = address($("deploymentV4Manager").value, "Position manager");
    const routerAddress = address($("deploymentV4Router").value, "Universal router");
    const stateViewAddress = address($("deploymentV4StateView").value, "State view");
    const permit2Address = address($("deploymentV4Permit2").value, "Permit2");
    const hooks = address($("deploymentV4Hooks").value || ZERO_ADDRESS, "Hooks");
    const fee = BigInt($("deploymentV4Fee").value);
    const tickSpacing = BigInt($("deploymentV4TickSpacing").value);
    if (fee < 0n || fee > 16777215n) throw new Error("V4 fee must fit uint24.");
    if (tickSpacing <= 0n || tickSpacing > 8388607n) throw new Error("V4 tick spacing must be a positive int24.");
    const stateView = new ethers.Contract(stateViewAddress, ["function getSlot0(bytes32) view returns (uint160,int24,uint24,uint24)"], provider);
    const poolId = ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(
      ["tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)"],
      [[token0, token1, fee, tickSpacing, hooks]],
    ));
    const [sqrtPriceX96] = await stateView.getSlot0(poolId);
    if (sqrtPriceX96 === 0n) throw new Error("V4 pool is not initialized for this PoolKey.");
    await Promise.all([
      requireCode(provider, token0, "Token 0"),
      requireCode(provider, token1, "Token 1"),
      requireCode(provider, managerAddress, "Position manager"),
      requireCode(provider, routerAddress, "Universal router"),
      requireCode(provider, stateViewAddress, "State view"),
      requireCode(provider, permit2Address, "Permit2"),
      hooks === ZERO_ADDRESS ? Promise.resolve() : requireCode(provider, hooks, "Hooks"),
    ]);
    const artifact = await loadArtifact("v4");
    requireShareLock(artifact, "v4");
    const initializer = artifact.abi.find((item) => item.type === "function" && item.name === "initialize");
    if (initializer?.inputs.length !== 12) throw new Error("V4 initializer does not match the dashboard deploy flow.");
    const proxyArtifact = await loadArtifact("proxy");
    return {
      version: "v4", network, token0, token1, keeper, keeper2, dao, managerAddress, routerAddress,
      stateViewAddress, permit2Address, hooks, fee, tickSpacing, artifact, proxyArtifact,
    };
  }

  async function validateConfiguration() {
    const network = currentNetwork();
    const provider = await providerFor(network);
    const name = $("deploymentName").value.trim();
    if (!name) throw new Error("Vault label is required.");
    const result = $("deploymentVersion").value === "v3"
      ? await validateV3(provider, network)
      : await validateV4(provider, network);
    result.name = name;
    return result;
  }

  async function switchWalletChain(network) {
    if (!window.ethereum) throw new Error("Connect a wallet extension to deploy.");
    const desired = network.chainIdHex || ethers.toBeHex(BigInt(network.chainId));
    const current = await window.ethereum.request({ method: "eth_chainId" });
    if (current.toLowerCase() === desired.toLowerCase()) return;
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: desired }] });
    } catch (error) {
      if (error.code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: desired,
          chainName: network.chainName,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: network.rpcUrls,
          ...(network.explorer ? { blockExplorerUrls: [network.explorer] } : {}),
        }],
      });
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: desired }] });
    }
    const actual = await window.ethereum.request({ method: "eth_chainId" });
    if (actual.toLowerCase() !== desired.toLowerCase()) throw new Error("Wallet did not switch to the selected chain.");
  }

  function saveRecord(record) {
    records.unshift(record);
    saveJson(DEPLOYMENTS_KEY, records);
    addV3ToRegistry(record);
    renderRecords();
  }

  function renderRecords() {
    const headings = ["Version", "Network", "Vault", "Address", "Status"];
    const rows = records.map((record) => {
      const network = CFG.networks[record.chainId] || { chainName: `Chain ${record.chainId}`, explorer: "" };
      const row = document.createElement("tr");
      for (const value of [record.version.toUpperCase(), network.chainName, record.name]) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.append(cell);
      }
      const addressCell = document.createElement("td");
      if (network.explorer) {
        const link = document.createElement("a");
        link.href = `${network.explorer}/address/${record.address}`;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = record.address;
        addressCell.append(link);
      } else addressCell.textContent = record.address;
      row.append(addressCell);
      const status = document.createElement("td");
      status.textContent = record.status || "deployed";
      row.append(status);
      return row;
    });
    const head = document.createElement("thead");
    const headingRow = document.createElement("tr");
    for (const value of headings) {
      const cell = document.createElement("th");
      cell.textContent = value;
      headingRow.append(cell);
    }
    head.append(headingRow);
    const body = document.createElement("tbody");
    if (rows.length) body.append(...rows);
    else {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = headings.length;
      cell.textContent = "No deployments tracked in this browser.";
      row.append(cell);
      body.append(row);
    }
    $("deploymentTable").replaceChildren(head, body);
  }

  async function deploy() {
    const validateButton = $("validateDeployment");
    const deployButton = $("deployCompounder");
    validateButton.disabled = true;
    deployButton.disabled = true;
    let implementationAddress = null;
    try {
      if (!$("deploymentAcknowledged").checked) throw new Error("Confirm that you verified the chain-specific adapter addresses and V4 hook.");
      setStatus("", ["Revalidating the pool, chain, adapters, and compiled share-lock artifact…"]);
      const config = await validateConfiguration();
      await switchWalletChain(config.network);
      const wallet = new ethers.BrowserProvider(window.ethereum, "any");
      const signer = await wallet.getSigner();
      const sender = await signer.getAddress();
      setStatus("warn", [`Deploying ${config.version.toUpperCase()} on ${config.network.chainName} from ${sender}. Review and approve each wallet prompt.`]);
      if (config.version === "v3") {
        const factory = new ethers.ContractFactory(config.artifact.abi, config.artifact.bytecode.object, signer);
        const vault = await factory.deploy(
          config.token0, config.token1, config.fee, config.poolAddress, config.keeper, config.dao,
          config.managerAddress, config.routerAddress,
        );
        await vault.waitForDeployment();
        const deployedAddress = await vault.getAddress();
        saveRecord({ version: "v3", chainId: config.network.chainId, name: config.name, address: deployedAddress, token0: config.token0, token1: config.token1, status: "deployed" });
        dispatchNetwork(config.network);
        window.dispatchEvent(new CustomEvent("itp:vault-deployed", { detail: { ...config, address: deployedAddress } }));
        setStatus("ok", [`V3 vault deployed at ${deployedAddress}.`, "The address is saved in this browser and added to the registered vault list."]);
      } else {
        const implementationFactory = new ethers.ContractFactory(config.artifact.abi, config.artifact.bytecode.object, signer);
        const implementation = await implementationFactory.deploy();
        await implementation.waitForDeployment();
        implementationAddress = await implementation.getAddress();
        setStatus("warn", [`V4 implementation deployed at ${implementationAddress}.`, "Approve the next wallet prompt to deploy and initialize its proxy."]);
        const initialization = new ethers.Interface(config.artifact.abi).encodeFunctionData("initialize", [
          config.token0, config.token1, config.fee, config.tickSpacing, config.hooks,
          config.keeper, config.dao, config.keeper2, config.managerAddress,
          config.routerAddress, config.stateViewAddress, config.permit2Address,
        ]);
        const proxyFactory = new ethers.ContractFactory(config.proxyArtifact.abi, config.proxyArtifact.bytecode.object, signer);
        const proxy = await proxyFactory.deploy(implementationAddress, initialization);
        await proxy.waitForDeployment();
        const proxyAddress = await proxy.getAddress();
        saveRecord({ version: "v4", chainId: config.network.chainId, name: config.name, address: proxyAddress, token0: config.token0, token1: config.token1, implementation: implementationAddress, status: "deployed" });
        dispatchNetwork(config.network);
        window.dispatchEvent(new CustomEvent("itp:vault-deployed", { detail: { ...config, address: proxyAddress } }));
        setStatus("ok", [`V4 vault proxy deployed at ${proxyAddress}.`, `Implementation: ${implementationAddress}.`, "The proxy was initialized atomically with the chain adapters and keeper settings."]);
      }
    } catch (error) {
      if (implementationAddress) {
        saveRecord({ version: "v4-implementation", chainId: Number($("deploymentNetwork").value), name: `${$("deploymentName").value.trim()} implementation only`, address: implementationAddress, status: "proxy deployment incomplete" });
        setStatus("err", [`Proxy deployment failed: ${error.shortMessage || error.message}`, `The implementation remains deployed at ${implementationAddress}; it is not a usable vault.`]);
      } else setStatus("err", [error.shortMessage || error.message || String(error)]);
    } finally {
      validateButton.disabled = false;
      deployButton.disabled = false;
    }
  }

  function wire() {
    populateNetworks();
    versionChanged();
    renderRecords();
    $("deploymentNetwork").addEventListener("change", selectNetworkChanged);
    $("deploymentVersion").addEventListener("change", versionChanged);
    $("registerCustomNetwork").addEventListener("click", () => {
      try {
        registerCustomNetwork();
      } catch (error) {
        setStatus("err", [error.message]);
      }
    });
    $("validateDeployment").addEventListener("click", async () => {
      const button = $("validateDeployment");
      button.disabled = true;
      try {
        const config = await validateConfiguration();
        setStatus("ok", [
          `${config.version.toUpperCase()} share-lock artifact is current and has deployable bytecode.`,
          `${config.network.chainName} RPC matches chain ${config.network.chainId}.`,
          "Pool, token, and adapter checks passed. No transaction was sent.",
        ]);
      } catch (error) {
        setStatus("err", [error.shortMessage || error.message || String(error)]);
      } finally {
        button.disabled = false;
      }
    });
    $("deployCompounder").addEventListener("click", deploy);
    $("refreshDeployments").addEventListener("click", renderRecords);
  }

  wire();
})();