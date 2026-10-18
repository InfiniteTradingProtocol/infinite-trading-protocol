(() => {
  const factoryIface = new ethers.Interface([
    "function createVault(address owner, bytes32 metadataHash, string metadataUri, string strategyTag, bytes32 salt) payable returns (address)",
    "function setApprovedAsset(address token, bool approved)",
    "function setApprovedRouter(address router, bool approved)",
    "function setApprovedExecutor(address executor, bool approved)",
    "function setFeeConfig(uint16 tradeFeeBps, uint16 executorFeeShareBps)"
  ]);

  const qs = (id) => document.getElementById(id);
  const parseList = (value) => value.split(",").map((p) => p.trim()).filter(Boolean);

  function setPreview(text) {
    qs("preview").textContent = text;
  }

  function readForm() {
    const network = Number(qs("network").value || 10);
    const factoryAddress = qs("factoryAddress").value.trim();
    const owner = qs("owner").value.trim();
    const treasury = qs("treasury").value.trim();
    const metadataUri = qs("metadataUri").value.trim();
    const strategyTag = qs("strategyTag").value.trim();
    const approvedAssets = parseList(qs("approvedAssets").value);
    const approvedRouters = parseList(qs("approvedRouters").value);
    const approvedExecutors = parseList(qs("approvedExecutors").value);
    const tradeFeeBps = Number(qs("tradeFeeBps").value || 25);
    const executorFeeShareBps = Number(qs("executorFeeShareBps").value || 5000);

    return {
      network,
      factoryAddress,
      owner,
      treasury,
      metadataUri,
      strategyTag,
      approvedAssets,
      approvedRouters,
      approvedExecutors,
      tradeFeeBps,
      executorFeeShareBps,
    };
  }

  function buildVaultConfig() {
    const form = readForm();
    const metadata = {
      version: "1.0",
      network: form.network,
      owner: form.owner || "0x0000000000000000000000000000000000000000",
      treasury: form.treasury || "0x0000000000000000000000000000000000000000",
      strategyTag: form.strategyTag,
      metadataUri: form.metadataUri,
      approvedAssets: form.approvedAssets,
      approvedRouters: form.approvedRouters,
      approvedExecutors: form.approvedExecutors,
      tradeFeeBps: form.tradeFeeBps,
      executorFeeShareBps: form.executorFeeShareBps,
    };

    const metadataHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(metadata)));
    const salt = ethers.keccak256(ethers.toUtf8Bytes(`${form.owner}-${Date.now()}`));

    const payload = {
      metadataHash,
      salt,
      metadataUri: form.metadataUri,
      strategyTag: form.strategyTag,
      owner: form.owner,
      data: factoryIface.encodeFunctionData("createVault", [
        form.owner || "0x0000000000000000000000000000000000000000",
        metadataHash,
        form.metadataUri,
        form.strategyTag,
        salt,
      ]),
      policy: {
        tradeFeeBps: form.tradeFeeBps,
        executorFeeShareBps: form.executorFeeShareBps,
        approvedAssets: form.approvedAssets,
        approvedRouters: form.approvedRouters,
        approvedExecutors: form.approvedExecutors,
      },
    };

    return payload;
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setPreview("No wallet provider detected. Install MetaMask or Rabby, then connect a wallet.");
      return;
    }
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();
    qs("owner").value = address;
    qs("walletStatus").textContent = `Connected: ${address.slice(0, 6)}...${address.slice(-4)}`;
    qs("approvedExecutors").value = address;
  }

  async function sendTx() {
    if (!window.ethereum) {
      setPreview("Wallet not connected.");
      return;
    }
    const payload = buildVaultConfig();
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const factory = new ethers.Contract(qs("factoryAddress").value, [
      "function createVault(address owner, bytes32 metadataHash, string metadataUri, string strategyTag, bytes32 salt) payable returns (address)"
    ], signer);

    try {
      const tx = await factory.createVault(
        payload.owner,
        payload.metadataHash,
        payload.metadataUri,
        payload.strategyTag,
        payload.salt,
        { value: 0 }
      );
      setPreview(`Sent createVault transaction.\nHash: ${tx.hash}\n\nFactory payload:\n${JSON.stringify(payload, null, 2)}`);
      await tx.wait();
      setPreview(`Confirmed createVault transaction.\nHash: ${tx.hash}\n\nFactory payload:\n${JSON.stringify(payload, null, 2)}`);
    } catch (error) {
      setPreview(`Transaction failed:\n${error?.message || String(error)}`);
    }
  }

  document.getElementById("buildPayload").addEventListener("click", () => {
    const payload = buildVaultConfig();
    setPreview(JSON.stringify(payload, null, 2));
  });

  document.getElementById("connectWallet").addEventListener("click", connectWallet);
  document.getElementById("sendTx").addEventListener("click", sendTx);

  setPreview(JSON.stringify(buildVaultConfig(), null, 2));
})();
