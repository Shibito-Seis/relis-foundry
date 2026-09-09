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
const french = JSON.parse(
  fs.readFileSync(path.join(root, "lang/fr.json"), "utf8"),
);
const styles = fs.readFileSync(path.join(root, "styles/relis.css"), "utf8");
const chatTemplate = fs.readFileSync(
  path.join(root, "templates/chat/check-card.hbs"),
  "utf8",
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
  const documentTypes = manifest.documentTypes[documentName] ?? {};
  assert.equal(
    Object.keys(documentTypes).length,
    expected,
    `${documentName}: ${expected} types`,
  );
  for (const type of Object.keys(documentTypes))
    assert.equal(
      typeof french.TYPES?.[documentName]?.[type],
      "string",
      `Traduction française absente : TYPES.${documentName}.${type}`,
    );
}
assert.equal(
  Object.values(expectedCounts).reduce((sum, value) => sum + value, 0),
  64,
);
assert.equal(
  french.RELIS?.Condition?.calibrated?.Name,
  "Calibré",
  "Libellé de la condition de démonstration absent",
);
assert.match(
  styles,
  /\.chat-message \.message-content \.relis-chat-card h3/,
  "Protection de contraste de la carte de Chat absente",
);
assert.match(
  chatTemplate,
  /effectDuration/,
  "Durée de l’effet absente de la carte de Chat",
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
