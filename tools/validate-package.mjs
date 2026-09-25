import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { validatePersonalContent } from "./personal-content.mjs";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "system.json"), "utf8"),
);
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const personalContentManifest = JSON.parse(
  fs.readFileSync(path.join(root, "content/personal/manifest.json"), "utf8"),
);
const crystalAttunement = JSON.parse(
  fs.readFileSync(
    path.join(root, "content/personal/crystal-attunement.json"),
    "utf8",
  ),
);
const personalContentTool = fs.readFileSync(
  path.join(root, "tools/personal-content.mjs"),
  "utf8",
);
const french = JSON.parse(
  fs.readFileSync(path.join(root, "lang/fr.json"), "utf8"),
);
const styles = fs.readFileSync(path.join(root, "styles/relis.css"), "utf8");
const chatTemplate = fs.readFileSync(
  path.join(root, "templates/chat/check-card.hbs"),
  "utf8",
);
const actorTemplate = fs.readFileSync(
  path.join(root, "templates/actors/character.hbs"),
  "utf8",
);
const itemTemplate = fs.readFileSync(
  path.join(root, "templates/items/item.hbs"),
  "utf8",
);
const itemSheetSource = fs.readFileSync(
  path.join(root, "src/sheets/item-sheet.ts"),
  "utf8",
);
const actorSheetSource = fs.readFileSync(
  path.join(root, "src/sheets/actor-sheet.ts"),
  "utf8",
);
const bootstrapSource = fs.readFileSync(
  path.join(root, "src/relis.ts"),
  "utf8",
);
const inventoryRulesSource = fs.readFileSync(
  path.join(root, "src/rules/inventory.ts"),
  "utf8",
);
const inventoryServiceSource = fs.readFileSync(
  path.join(root, "src/services/inventory.ts"),
  "utf8",
);
const personalContent = validatePersonalContent(root);

assert.equal(manifest.id, "relis");
assert.equal(manifest.title, "RE:LIS — RE: Lost in Space");
assert.equal(manifest.version, packageJson.version);
assert.equal(manifest.compatibility.minimum, "14");
assert.equal(manifest.compatibility.maximum, "14");
assert.equal(
  manifest.compatibility.verified,
  "14",
  "Foundry 14 doit rester marqué vérifié après la recette 10-C sur 14.365",
);
assert.equal(
  french.RELIS?.Ready,
  "RE:LIS {version} est chargé.",
  "Le message de chargement doit accepter la version courante",
);
assert.match(
  bootstrapSource,
  /game\.i18n\.format\("RELIS\.Ready", \{ version: PACKAGE_VERSION \}\)/,
  "Le chargement doit injecter PACKAGE_VERSION dans le message traduit",
);
assert.match(
  actorSheetSource,
  /function dialogContent\(\): HTMLDivElement \{\s*return document\.createElement\("div"\);\s*\}/,
  "DialogV2 exige un div racine sans attribut pour les formulaires d’inventaire",
);
assert.match(
  itemSheetSource,
  /function attunementDialogContent[\s\S]*?const content = document\.createElement\("div"\);\s*const panel = document\.createElement\("div"\);/,
  "Le questionnaire DialogV2 doit conserver un div racine sans attribut",
);
assert.match(
  itemSheetSource,
  /async function askAttunementColor[\s\S]*?const content = document\.createElement\("div"\);\s*const field = document\.createElement\("label"\);/,
  "Le dialogue MJ de couleur doit conserver un div racine sans attribut",
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
  actorTemplate,
  /data-action="split-inventory-stack"/,
  "Scission de pile absente de l’inventaire Actor",
);
assert.match(
  actorTemplate,
  /data-action="transfer-inventory-item"/,
  "Transfert inter-Actor absent de l’inventaire",
);
assert.match(
  itemTemplate,
  /system\.capacity\.mass/,
  "Capacités typées du conteneur absentes de sa fiche",
);
assert.match(
  actorTemplate,
  /10-K2-P\s+en\s+recette\s+·[\s\S]*?\{\{packageVersion\}\}/,
  "Le pied Actor doit utiliser la version dynamique pendant la recette K2-P",
);
assert.match(
  itemTemplate,
  /10-K2-P\s+en\s+recette\s+·\s+paquet[\s\S]*?\{\{packageVersion\}\}/,
  "Le pied Item doit utiliser la version dynamique pendant la recette K2-P",
);
assert.match(
  inventoryRulesSource,
  /descendantIds[\s\S]*Déplacement refusé : il créerait une boucle/,
  "Prévention des cycles de conteneurs absente",
);
assert.match(
  inventoryServiceSource,
  /state: "pending"[\s\S]*activateTransfer/,
  "Transfert préparatoire indisponible puis activé absent",
);
assert.match(
  itemSheetSource,
  /dataset\.relisEditorSurface = "visible"/,
  "La surface ProseMirror réelle n’est pas marquée au moment de son ouverture",
);
assert.match(
  itemSheetSource,
  /toolbar\.dataset\.relisEditorToolbar = "true"/,
  "La barre ProseMirror réelle n’est pas isolée de la surface éditable",
);
assert.match(
  itemSheetSource,
  /editor\.contains\(surface\) \? \[editor\] : \[surfaceRoot\]/,
  "La recherche de la barre ProseMirror n’est pas bornée au composant actif",
);
assert.match(
  itemSheetSource,
  /layout\.style\.setProperty\("flex-direction", "column", "important"\)/,
  "La barre et le contenu ProseMirror ne sont pas empilés verticalement",
);
assert.match(
  styles,
  /\[data-relis-editor-toolbar="true"\]\s*\{[^}]*z-index: 20 !important;[^}]*background: #123444 !important;/s,
  "Le plan d’affichage et le fond de la barre ProseMirror ne sont pas garantis",
);
assert.match(
  itemSheetSource,
  /event\.composedPath\(\)\.find\(isEditableSurface\)/,
  "La surface contenteditable réelle n’est pas résolue depuis les événements d’édition",
);
assert.match(
  itemSheetSource,
  /option\.hidden = selected\.has\(option\.value\)/,
  "Les Traits déjà sélectionnés ne sont pas retirés de la liste de choix",
);
assert.match(
  styles,
  /\.relis-trait-selector select option:checked\s*\{[^}]*display: none !important;/s,
  "Un Trait déjà sélectionné reste visible dans la liste",
);
assert.match(
  chatTemplate,
  /effectDuration/,
  "Durée de l’effet absente de la carte de Chat",
);
assert.match(
  actorTemplate,
  /data-action="switch-tab"/,
  "Navigation d’onglets 10-D1 absente de la fiche Actor",
);
assert.match(
  actorTemplate,
  /<h2\s*>Garde-Robe<\/h2>/,
  "Accès Garde-Robe absent de la coque Personnage",
);
assert.match(
  actorTemplate,
  /data-document-field="system\.detailLevel"/,
  "Sélecteur des densités PNJ absent",
);
assert.match(
  actorTemplate,
  /system\.health\.overexertion/,
  "Suivi du Surmenage absent de la fiche Personnage",
);
assert.match(
  styles,
  /\.relis-id-portrait/,
  "Bandeau d’identité CSS 10-D1 absent",
);
assert.match(
  styles,
  /@media \(prefers-reduced-motion: reduce\)/,
  "Protection reduced-motion absente",
);
assert.match(
  actorTemplate,
  /data-energy-index=/,
  "Mise à jour atomique des réserves absente de la fiche",
);
assert.match(
  actorTemplate,
  /ressource personnelle canonique/,
  "CE de démonstration non distinguée des ressources canoniques",
);
assert.match(
  styles,
  /\.relis-sheet-footer\s*\{[^}]*position: static !important/s,
  "Pied de fiche non protégé contre les styles Foundry",
);
assert.match(
  styles,
  /\.relis-id-portrait\s*\{[^}]*height: clamp/s,
  "Hauteur carrée du médaillon non verrouillée",
);
assert.match(
  styles,
  /\.relis-item-layout/,
  "Mise en page de la fiche Item 10-E1-P absente",
);
assert.match(
  itemTemplate,
  /system\.provenance\.localRevision/,
  "Provenance de l’exemplaire absente de la fiche Item",
);
assert.match(
  itemTemplate,
  /system\.referencePrice\.amount/,
  "Prix de référence absent de la fiche Item",
);
assert.match(
  itemTemplate,
  /system\.physical\.volumeEach/,
  "Volume physique absent de la fiche Item",
);
assert.match(
  itemTemplate,
  /<multi-select[\s\S]*?\{\{#each traitOptions\}\}[\s\S]*?<option/,
  "Options explicites du sélecteur de Traits absentes",
);
assert.doesNotMatch(
  itemTemplate,
  /\{\{\{traitSelector\}\}\}/,
  "Ancien sélecteur de Traits sérialisé encore présent",
);
assert.match(
  styles,
  /\.relis-item-description prose-mirror \.ProseMirror[\s\S]*?color: var\(--relis-ink\) !important;/,
  "Contraste de saisie ProseMirror non garanti",
);
assert.match(
  itemTemplate,
  /data-description-editor-host/,
  "Hôte DOM de l’éditeur ProseMirror absent",
);
assert.doesNotMatch(
  itemTemplate,
  /\{\{\{descriptionEditor\}\}\}/,
  "Ancien éditeur ProseMirror sérialisé encore présent",
);
assert.match(
  styles,
  /\.relis-trait-selector select option\s*\{[^}]*color: #152b38 !important;/s,
  "Contraste des options de Traits non garanti",
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

assert.equal(
  personalContentManifest.format,
  "relis.personal-content",
  "Format source personnel 10-K1-P absent",
);
assert.equal(
  personalContentManifest.packs.length,
  23,
  "Les 23 compendiums personnels classés doivent être préparés ensemble",
);
assert.equal(
  personalContentManifest.strictReferences,
  true,
  "K2-P doit bloquer toute référence canonique absente",
);
assert.equal(
  crystalAttunement.nomenclature.canonicalTerm,
  "Écarlithe",
  "Nomenclature canonique du cristal absente",
);
assert.equal(
  crystalAttunement.permissions.directColorEdit,
  "gm",
  "La couleur directe du cristal doit rester une décision MJ",
);
assert.equal(
  crystalAttunement.mechanics.grantsMechanicalBonus,
  false,
  "Le questionnaire ne doit pas inventer de bonus mécanique",
);
assert.equal(
  crystalAttunement.questions.length,
  48,
  "La banque d’accord doit contenir 48 situations",
);
assert.deepEqual(
  crystalAttunement.questionSelection?.difficultyCounts,
  { simple: 8, intermediate: 8, complex: 4 },
  "Le tirage doit conserver 8 questions simples, 8 intermédiaires et 4 complexes",
);
assert.match(
  personalContentTool,
  /compilePack/,
  "Compilation officielle des packs Foundry non raccordée",
);
assert.equal(
  packageJson.devDependencies["@foundryvtt/foundryvtt-cli"],
  "3.0.4",
  "Version de l’outil officiel Foundry non verrouillée",
);
assert.deepEqual(
  manifest.packs?.map(({ name, type, system }) => ({ name, type, system })),
  personalContentManifest.packs.map((pack) => ({
    name: pack.name,
    type: pack.documentType,
    system: "relis",
  })),
  "Tous les compendiums K2-P doivent être déclarés comme packs Item du système",
);
assert.equal(
  manifest.packs?.every((pack) => pack.path === `packs/${pack.name}`),
  true,
  "Chaque compendium doit viser le répertoire LevelDB construit",
);
assert.equal(
  personalContent.entries.length,
  2412,
  "10-K2-P doit publier les 2 412 Items, dont les huit lignées Demi-Beastkins",
);
assert.equal(
  manifest.packFolders?.length,
  3,
  "Création, Progression et Matériel doivent rester regroupés dans Foundry",
);
assert.equal(
  personalContent.warnings.length,
  0,
  "Aucune référence canonique K2-P ne doit rester en avertissement",
);

console.log(
  "Manifest RE:LIS valide : 64 types, 2 412 Items, 23 packs, chemins, références et URLs contrôlés.",
);
