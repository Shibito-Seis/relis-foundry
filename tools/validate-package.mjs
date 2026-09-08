import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "system.json"), "utf8"),
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);

assert.equal(manifest.id, "relis");
assert.equal(manifest.title, "RE:LIS — RE: Lost in Space");
assert.equal(manifest.version, packageJson.version);
assert.equal(manifest.compatibility.minimum, "14");
assert.equal(manifest.compatibility.maximum, "14");
assert.equal(
  Object.hasOwn(manifest.compatibility, "verified"),
  false,
  "verified attend la recette The Forge",
);
assert.deepEqual(manifest.authors, [{ name: "Maoilios aka ShibitoSeis" }]);
assert.equal(manifest.url, "https://github.com/Shibito-Seis/relis-foundry");
assert.equal(
  manifest.manifest,
  "https://raw.githubusercontent.com/Shibito-Seis/relis-foundry/main/system.json",
);
assert.equal(
  manifest.download,
  `https://github.com/Shibito-Seis/relis-foundry/releases/download/v${manifest.version}/relis-v${manifest.version}.zip`,
);

const expectedCounts = {
  Actor: 11,
  Item: 26,
  JournalEntryPage: 21,
  ActiveEffect: 1,
  Combat: 3,
  Combatant: 1,
  ChatMessage: 1,
};
for (const [documentName, expected] of Object.entries(expectedCounts)) {
  assert.equal(
    Object.keys(manifest.documentTypes[documentName] ?? {}).length,
    expected,
    `${documentName}: ${expected} types`,
  );
}
assert.equal(
  Object.values(expectedCounts).reduce((sum, value) => sum + value, 0),
  64,
);

for (const relativePath of [
  ...manifest.esmodules,
  ...manifest.styles,
  ...manifest.languages.map((language) => language.path),
]) {
  assert.equal(
    fs.existsSync(path.join(root, relativePath)),
    true,
    `Fichier déclaré absent : ${relativePath}`,
  );
}

assert.equal(fs.existsSync(path.join(root, "LICENSE")), true);
assert.equal(
  fs.existsSync(path.join(root, "templates/actors/character.hbs")),
  true,
);
assert.equal(fs.existsSync(path.join(root, "templates/items/item.hbs")), true);
assert.equal(
  fs.existsSync(path.join(root, "templates/chat/check-card.hbs")),
  true,
);

console.log("Manifest RE:LIS valide : 64 types, chemins et URLs contrôlés.");
