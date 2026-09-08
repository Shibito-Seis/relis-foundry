import assert from "node:assert/strict";
import fs from "node:fs";

const tag = process.argv[2] ?? "";
const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
assert.match(tag, /^v\d+\.\d+\.\d+$/);
assert.equal(
  tag,
  `v${manifest.version}`,
  `Le tag ${tag} ne correspond pas au manifest ${manifest.version}.`,
);
console.log(`Tag ${tag} cohérent avec system.json.`);
