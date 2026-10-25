(() => {
  "use strict";
  const PATH = "src/aero/AeroZap.sol";
  const REPO_PATH = `contracts/${PATH}`;
  const SHA256 = "f1e68b460c053362a3e0928d7194fe90392c594c5298b281b9a20c9866251989";
  // Optimism and Base use the Aero v2 zap (v1 zaps 0xb797…c561 on Optimism and 0x64Bf…8688 on Base are superseded).
  const DEPLOYMENTS = {
    "8453": "0xAdF1288917495F806b6014f354638F905B9Ce3fa",
    "10": "0x95E97Def5456d5860a26DD3108A71Dd13b3E3592",
  };
  const V1 = { path: PATH, name: "AeroZap", sha256: SHA256 };
  const V2 = { path: "src/aero/v2/AeroZapV2.sol", name: "AeroZapV2", sha256: "dcb356c4569101e8c8c123f2027895b1bb94ae090fb14129d6a5a97920cc349e" };
  const SOURCES = { "8453": V2, "10": V2 };
  function validateSource(result, source = V1) {
    if (result.runtimeMatch !== "match" || result.creationMatch !== "match") {
      throw new Error("Full creation/runtime verification is unavailable.");
    }
    if (result.compilation?.fullyQualifiedName !== `${source.path}:${source.name}` || typeof result.sources?.[source.path]?.content !== "string") {
      throw new Error(`Verified compilation does not identify the expected ${source.name} source.`);
    }
    return result.sources;
  }
  if (typeof module !== "undefined") module.exports = { PATH, REPO_PATH, SHA256, DEPLOYMENTS, SOURCES, validateSource };
  if (typeof document === "undefined") return;
  const $ = id => document.getElementById(id);
  const link = (href, text) => {
    const a = document.createElement("a");
    a.href = href; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = text;
    $("sourceLinks").append(a, document.createTextNode(" · "));
  };
  (async () => {
    const chain = new URLSearchParams(location.search).get("chain");
    const address = DEPLOYMENTS[chain];
    const source = SOURCES[chain];
    if (!address || !source) throw new Error("Unsupported zap deployment.");
    const repoPath = `contracts/${source.path}`;
    const api = `https://sourcify.dev/server/v2/contract/${chain}/${address}?fields=sources,compilation,runtimeMatch,creationMatch,verifiedAt`;
    const response = await fetch(api, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`Verification service returned HTTP ${response.status}.`);
    const result = await response.json();
    const sources = validateSource(result, source);
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sources[source.path].content))))
      .map(b => b.toString(16).padStart(2, "0")).join("");
    const matches = hash === source.sha256;
    $("sourceStatus").textContent = `Chain ${chain} · ${address} · Sourcify creation and runtime match (${result.verifiedAt}). ${matches ? "Source matches the repository snapshot." : "WARNING: deployed source differs from the repository snapshot; do not assume they are interchangeable."}`;
    $("sourceLocation").textContent = `Repository location: infinite-trading-protocol/${repoPath}. SHA-256 of repository snapshot: ${source.sha256}. Repository link may be unavailable until local changes are pushed.`;
    link(`https://repo.sourcify.dev/contracts/full_match/${chain}/${address}/`, "Published verification");
    link(`https://${chain === "10" ? "optimistic.etherscan.io" : "basescan.org"}/address/${address}#code`, "Explorer code");
    link(`https://github.com/InfiniteTradingProtocol/infinite-trading-protocol/blob/main/${repoPath}`, "Repository source");
    const files = [source.path, ...Object.keys(sources).filter(p => p !== source.path).sort()];
    for (const file of files) {
      const option = document.createElement("option");
      option.value = file; option.textContent = file; $("sourceFile").append(option);
    }
    const render = () => { $("sourceCode").textContent = sources[$("sourceFile").value].content; $("copyStatus").textContent = ""; };
    $("sourceFile").disabled = false; $("sourceFile").addEventListener("change", render);
    $("copySource").disabled = false;
    $("copySource").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText($("sourceCode").textContent);
        $("copyStatus").textContent = "Source copied.";
      } catch { $("copyStatus").textContent = "Clipboard unavailable. Select the source and copy it manually."; }
    });
    render();
  })().catch(error => { $("sourceStatus").textContent = `Source verification failed: ${error.message}`; });
})();
