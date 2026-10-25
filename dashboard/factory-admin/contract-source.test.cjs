const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const viewer = require("./contract-source.js");

test("zap source mapping identifies the actual repository file and both deployed routers", () => {
  const file = path.resolve(__dirname, "../..", viewer.REPO_PATH);
  const content = fs.readFileSync(file, "utf8");
  assert.equal(crypto.createHash("sha256").update(content).digest("hex"), viewer.SHA256);
  assert.equal(Object.keys(viewer.DEPLOYMENTS).length, 2);
});

test("only fully verified AeroZap compilations are presented as verified source", () => {
  const result = { runtimeMatch: "match", creationMatch: "match", compilation: { fullyQualifiedName: `${viewer.PATH}:AeroZap` }, sources: { [viewer.PATH]: { content: "contract AeroZap {}" } } };
  assert.equal(viewer.validateSource(result), result.sources);
  for (const changed of [
    { runtimeMatch: null }, { creationMatch: "partial_match" }, { compilation: { fullyQualifiedName: "other.sol:Fake" } }, { sources: {} },
  ]) assert.throws(() => viewer.validateSource({ ...result, ...changed }));
});
