import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compilePack, extractPack } from "@foundryvtt/foundryvtt-cli";

export const PERSONAL_SOURCE_FORMAT = "relis.personal-content";
export const PERSONAL_SOURCE_FORMAT_VERSION = 1;

export const PERSONAL_ITEM_TYPES = Object.freeze([
  "ancestry",
  "profile",
  "origin",
  "advantage",
  "drawback",
  "path",
  "specialization",
  "post",
  "talent",
  "action",
  "power",
  "weapon",
  "armor",
  "equipment",
  "consumable",
  "ammunition",
  "resource",
  "container",
]);

const PERSONAL_ITEM_TYPE_SET = new Set(PERSONAL_ITEM_TYPES);
const CANONICAL_ID = /^[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/;
const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const PACK_ID = /^[a-z][a-z0-9-]*$/;
const HEX_COLOR = /^#[0-9A-F]{6}$/;
const FORBIDDEN_SOURCE_KEYS = new Set(["_id", "_stats", "ownership"]);

export class PersonalContentError extends Error {
  constructor(messages) {
    super(
      `Pipeline de contenu personnel invalide :\n- ${messages.join("\n- ")}`,
    );
    this.name = "PersonalContentError";
    this.messages = messages;
  }
}

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sortedObject(value) {
  if (Array.isArray(value)) return value.map(sortedObject);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort((left, right) => left.localeCompare(right, "fr"))
      .map((key) => [key, sortedObject(value[key])]),
  );
}

function stableJson(value) {
  return `${JSON.stringify(sortedObject(value), null, 2)}\n`;
}

function readJson(file, errors) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(
      `${path.relative(process.cwd(), file)} : JSON illisible (${error.message})`,
    );
    return null;
  }
}

function relativeInside(root, candidate, label, errors) {
  if (typeof candidate !== "string" || !candidate.trim()) {
    errors.push(`${label} doit être un chemin relatif non vide.`);
    return null;
  }
  const resolved = path.resolve(root, candidate);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    errors.push(`${label} sort du répertoire de contenu : ${candidate}`);
    return null;
  }
  return resolved;
}

function listJsonFiles(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".json") &&
        !entry.name.startsWith("_"),
    )
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "fr"));
}

function validateManifest(value, sourceRoot, errors) {
  if (!isRecord(value)) {
    errors.push("manifest.json doit contenir un objet.");
    return [];
  }
  if (value.format !== PERSONAL_SOURCE_FORMAT)
    errors.push(`manifest.json format attendu : ${PERSONAL_SOURCE_FORMAT}.`);
  if (value.formatVersion !== PERSONAL_SOURCE_FORMAT_VERSION)
    errors.push(
      `manifest.json formatVersion attendu : ${PERSONAL_SOURCE_FORMAT_VERSION}.`,
    );
  if (value.system !== "relis")
    errors.push("manifest.json system doit valoir relis.");
  if (!SEMVER.test(value.contentVersion ?? ""))
    errors.push("manifest.json contentVersion doit être une version SemVer.");
  if (!Array.isArray(value.packs) || value.packs.length === 0) {
    errors.push("manifest.json doit déclarer au moins une famille de packs.");
    return [];
  }

  const seenIds = new Set();
  const seenNames = new Set();
  for (const [index, pack] of value.packs.entries()) {
    const prefix = `manifest.json packs[${index}]`;
    if (!isRecord(pack)) {
      errors.push(`${prefix} doit être un objet.`);
      continue;
    }
    if (!PACK_ID.test(pack.id ?? "")) errors.push(`${prefix}.id est invalide.`);
    if (!PACK_ID.test(pack.name ?? ""))
      errors.push(`${prefix}.name est invalide.`);
    if (seenIds.has(pack.id)) errors.push(`${prefix}.id dupliqué : ${pack.id}`);
    if (seenNames.has(pack.name))
      errors.push(`${prefix}.name dupliqué : ${pack.name}`);
    seenIds.add(pack.id);
    seenNames.add(pack.name);
    if (typeof pack.label !== "string" || !pack.label.trim())
      errors.push(`${prefix}.label doit être un libellé français non vide.`);
    if (pack.documentType !== "Item")
      errors.push(`${prefix}.documentType doit valoir Item.`);
    const directory = relativeInside(
      sourceRoot,
      pack.source,
      `${prefix}.source`,
      errors,
    );
    if (directory && !fs.existsSync(directory))
      errors.push(`${prefix}.source est absent : ${pack.source}`);
    if (!Array.isArray(pack.itemTypes) || pack.itemTypes.length === 0) {
      errors.push(`${prefix}.itemTypes doit contenir au moins un type.`);
    } else {
      const localTypes = new Set();
      for (const type of pack.itemTypes) {
        if (!PERSONAL_ITEM_TYPE_SET.has(type))
          errors.push(
            `${prefix}.itemTypes contient un type hors K1-P : ${type}`,
          );
        if (localTypes.has(type))
          errors.push(`${prefix}.itemTypes duplique ${type}.`);
        localTypes.add(type);
      }
    }
  }
  return value.packs;
}

function validateEntry(entry, file, pack, contentVersion, errors) {
  const label = path.relative(process.cwd(), file);
  if (!isRecord(entry)) {
    errors.push(`${label} doit contenir un objet.`);
    return null;
  }
  for (const key of FORBIDDEN_SOURCE_KEYS)
    if (Object.hasOwn(entry, key))
      errors.push(
        `${label} : ${key} est généré par le pipeline et ne doit pas être saisi.`,
      );
  if (!CANONICAL_ID.test(entry.relisId ?? ""))
    errors.push(`${label} : relisId canonique invalide.`);
  if (path.basename(file) !== `${entry.relisId}.json`)
    errors.push(`${label} : le fichier doit se nommer ${entry.relisId}.json.`);
  if (typeof entry.name !== "string" || !entry.name.trim())
    errors.push(`${label} : name est obligatoire.`);
  if (!PERSONAL_ITEM_TYPE_SET.has(entry.type))
    errors.push(`${label} : type personnel inconnu (${entry.type}).`);
  if (!pack.itemTypes.includes(entry.type))
    errors.push(
      `${label} : le type ${entry.type} n’appartient pas au pack ${pack.id}.`,
    );
  if (!isRecord(entry.system))
    errors.push(`${label} : system doit être un objet.`);
  if (isRecord(entry.system) && Object.hasOwn(entry.system, "meta"))
    errors.push(`${label} : system.meta est injecté par le pipeline.`);
  if (
    entry.img !== undefined &&
    (typeof entry.img !== "string" || !entry.img.trim())
  )
    errors.push(
      `${label} : img doit être un chemin non vide lorsqu’il est présent.`,
    );
  if (
    entry.sort !== undefined &&
    (!Number.isInteger(entry.sort) || entry.sort < 0)
  )
    errors.push(`${label} : sort doit être un entier positif ou nul.`);
  if (
    entry.folder !== undefined &&
    entry.folder !== null &&
    typeof entry.folder !== "string"
  )
    errors.push(`${label} : folder doit être nul ou une chaîne.`);
  if (entry.tags !== undefined) {
    if (
      !Array.isArray(entry.tags) ||
      entry.tags.some((tag) => typeof tag !== "string" || !tag.trim())
    )
      errors.push(`${label} : tags doit être une liste de chaînes non vides.`);
    else if (new Set(entry.tags).size !== entry.tags.length)
      errors.push(`${label} : tags contient un doublon.`);
  }
  if (
    entry.contentVersion !== undefined &&
    entry.contentVersion !== contentVersion
  )
    errors.push(
      `${label} : contentVersion local doit correspondre au manifeste (${contentVersion}).`,
    );
  return entry;
}

function collectReferences(value, pointer = "", results = []) {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      collectReferences(entry, `${pointer}/${index}`, results),
    );
    return results;
  }
  if (!isRecord(value)) return results;
  if (
    typeof value.relisId === "string" &&
    value.relisId &&
    (Object.hasOwn(value, "documentName") ||
      Object.hasOwn(value, "missingPolicy") ||
      Object.hasOwn(value, "state"))
  )
    results.push({ pointer: pointer || "/", reference: value });
  for (const [key, entry] of Object.entries(value))
    collectReferences(entry, `${pointer}/${key}`, results);
  return results;
}

function validateAliases(value, entriesById, errors) {
  if (
    !isRecord(value) ||
    value.format !== "relis.personal-aliases" ||
    value.formatVersion !== 1
  ) {
    errors.push(
      "aliases.json ne respecte pas le contrat relis.personal-aliases v1.",
    );
    return [];
  }
  if (!Array.isArray(value.aliases)) {
    errors.push("aliases.json aliases doit être une liste.");
    return [];
  }
  const seen = new Set();
  for (const [index, alias] of value.aliases.entries()) {
    const label = `aliases.json aliases[${index}]`;
    if (
      !isRecord(alias) ||
      !CANONICAL_ID.test(alias.from ?? "") ||
      !CANONICAL_ID.test(alias.to ?? "")
    ) {
      errors.push(`${label} doit relier deux identifiants canoniques.`);
      continue;
    }
    if (alias.from === alias.to)
      errors.push(`${label} ne peut pas se référer à lui-même.`);
    if (seen.has(alias.from))
      errors.push(`${label} duplique l’alias ${alias.from}.`);
    seen.add(alias.from);
    if (!entriesById.has(alias.to))
      errors.push(`${label} vise une cible absente : ${alias.to}.`);
    if (!SEMVER.test(alias.introducedIn ?? ""))
      errors.push(`${label}.introducedIn doit être une version SemVer.`);
    if (typeof alias.reason !== "string" || !alias.reason.trim())
      errors.push(`${label}.reason est obligatoire.`);
  }
  return value.aliases;
}

function validateQuestionnaire(value, errors) {
  if (
    !isRecord(value) ||
    value.format !== "relis.crystal-attunement" ||
    value.formatVersion !== 1
  ) {
    errors.push(
      "crystal-attunement.json ne respecte pas le contrat relis.crystal-attunement v1.",
    );
    return;
  }
  if (!CANONICAL_ID.test(value.relisId ?? ""))
    errors.push("Questionnaire : relisId invalide.");
  if (!SEMVER.test(value.contentVersion ?? ""))
    errors.push("Questionnaire : contentVersion doit être SemVer.");
  if (
    !isRecord(value.nomenclature) ||
    !value.nomenclature.canonicalTerm ||
    !value.nomenclature.rawTerm ||
    !value.nomenclature.focusTerm
  )
    errors.push("Questionnaire : nomenclature complète obligatoire.");
  if (!Array.isArray(value.axes) || value.axes.length < 2)
    errors.push("Questionnaire : au moins deux axes sont requis.");
  const axes = new Set();
  for (const [index, axis] of (value.axes ?? []).entries()) {
    if (
      !isRecord(axis) ||
      !PACK_ID.test(axis.id ?? "") ||
      typeof axis.label !== "string" ||
      !axis.label.trim()
    )
      errors.push(`Questionnaire : axe ${index} invalide.`);
    else if (axes.has(axis.id))
      errors.push(`Questionnaire : axe dupliqué ${axis.id}.`);
    else axes.add(axis.id);
  }
  const colors = new Set();
  const colorAxisKeys = new Set();
  const paletteCounts = { dominant: 0, conjunction: 0, equilibrium: 0 };
  for (const [index, color] of (value.palette ?? []).entries()) {
    if (
      !isRecord(color) ||
      !PACK_ID.test(color.id ?? "") ||
      !HEX_COLOR.test(color.hex ?? "") ||
      !Object.hasOwn(paletteCounts, color.kind ?? "") ||
      !Array.isArray(color.axes) ||
      color.axes.some((axis) => !axes.has(axis)) ||
      new Set(color.axes).size !== color.axes.length ||
      (color.kind === "dominant"
        ? color.axes.length !== 1
        : color.axes.length !== 2)
    )
      errors.push(`Questionnaire : couleur ${index} invalide.`);
    else {
      if (colors.has(color.id))
        errors.push(`Questionnaire : couleur dupliquée ${color.id}.`);
      const axisKey = [...color.axes].sort().join("+");
      if (colorAxisKeys.has(axisKey))
        errors.push(
          `Questionnaire : résultat chromatique dupliqué ${axisKey}.`,
        );
      colors.add(color.id);
      colorAxisKeys.add(axisKey);
      paletteCounts[color.kind] += 1;
    }
  }
  for (const [kind, expected] of Object.entries({
    dominant: 6,
    conjunction: 6,
    equilibrium: 3,
  }))
    if (paletteCounts[kind] !== expected)
      errors.push(`Questionnaire : ${expected} couleurs ${kind} attendues.`);
  for (const axis of axes) {
    const key = axis;
    if (!colorAxisKeys.has(key))
      errors.push(
        `Questionnaire : aucune couleur dominante pour l’axe ${axis}.`,
      );
  }
  if (
    !isRecord(value.resolution) ||
    value.resolution.pairOutcomeRequiresExactlyTwoTopAxes !== true ||
    value.resolution.unrecognizedTieUsesTieBreaker !== true ||
    value.resolution.directColorChoice !== false ||
    value.resolution.blackAttunedOutcome !== false ||
    value.resolution.blackIsReservedForRawEcarlethe !== true
  )
    errors.push("Questionnaire : contrat de résolution chromatique incomplet.");
  const questionIds = new Set();
  if (value.questions?.length !== 8)
    errors.push("Questionnaire : huit situations sont requises.");
  for (const [questionIndex, question] of (value.questions ?? []).entries()) {
    const label = `Questionnaire : question ${questionIndex}`;
    if (
      !isRecord(question) ||
      !PACK_ID.test(question.id ?? "") ||
      typeof question.prompt !== "string" ||
      !question.prompt.trim()
    ) {
      errors.push(`${label} invalide.`);
      continue;
    }
    if (questionIds.has(question.id))
      errors.push(`${label} duplique ${question.id}.`);
    questionIds.add(question.id);
    if (!Array.isArray(question.options) || question.options.length !== 4)
      errors.push(`${label} doit proposer exactement quatre réponses.`);
    const optionIds = new Set();
    for (const option of question.options ?? []) {
      if (
        !isRecord(option) ||
        !PACK_ID.test(option.id ?? "") ||
        typeof option.label !== "string" ||
        !option.label.trim() ||
        !isRecord(option.weights)
      ) {
        errors.push(`${label} contient une réponse invalide.`);
        continue;
      }
      if (optionIds.has(option.id))
        errors.push(`${label} duplique la réponse ${option.id}.`);
      optionIds.add(option.id);
      for (const [axis, weight] of Object.entries(option.weights))
        if (
          !axes.has(axis) ||
          !Number.isInteger(weight) ||
          weight <= 0 ||
          weight > 3
        )
          errors.push(`${label} contient un poids invalide pour ${axis}.`);
    }
  }
  if (!isRecord(value.tieBreaker) || !Array.isArray(value.tieBreaker.options)) {
    errors.push("Questionnaire : départage explicite obligatoire.");
  } else {
    const tieAxes = new Set(
      value.tieBreaker.options.map((option) => option.axis),
    );
    for (const axis of axes)
      if (!tieAxes.has(axis))
        errors.push(`Questionnaire : départage absent pour ${axis}.`);
    if (value.tieBreaker.showOnlyTiedAxes !== true)
      errors.push(
        "Questionnaire : le départage doit rester borné aux axes ex æquo.",
      );
  }
  if (
    !isRecord(value.permissions) ||
    value.permissions.directColorEdit !== "gm" ||
    value.permissions.reset !== "gm"
  )
    errors.push(
      "Questionnaire : modification directe de couleur et réinitialisation doivent rester MJ.",
    );
  if (
    !isRecord(value.persistence) ||
    value.persistence.resetOnTransfer !== false ||
    value.persistence.keepHistory !== true
  )
    errors.push(
      "Questionnaire : l’accord doit persister aux transferts et conserver son historique.",
    );
  if (
    !isRecord(value.mechanics) ||
    value.mechanics.grantsMechanicalBonus !== false
  )
    errors.push(
      "Questionnaire : la couleur ne doit accorder aucun bonus mécanique en K1-P.",
    );
}

export function stableFoundryId(relisId) {
  return createHash("sha256")
    .update(relisId, "utf8")
    .digest("hex")
    .slice(0, 16);
}

export function createFoundryItem(entry, manifest, packageVersion) {
  const tags = Array.from(new Set(entry.tags ?? [])).sort((left, right) =>
    left.localeCompare(right, "fr"),
  );
  const system = clone(entry.system);
  system.meta = {
    schemaVersion: "7",
    rulesVersion: "1.0.0",
    contentVersion: manifest.contentVersion,
    relisId: entry.relisId,
    sourceRef: {
      relisId: "",
      uuid: "",
      documentName: "",
      type: "",
      state: "unresolved",
      labelSnapshot: "",
      missingPolicy: "diagnose",
    },
    sourceVersion: "",
    revision: 0,
    status: "active",
    causeRefs: [],
    tags,
  };
  const foundryId = stableFoundryId(entry.relisId);
  return {
    _key: `!items!${foundryId}`,
    _id: foundryId,
    name: entry.name,
    type: entry.type,
    img: entry.img ?? "icons/svg/item-bag.svg",
    system,
    effects: clone(entry.effects ?? []),
    folder: entry.folder ?? null,
    sort: entry.sort ?? 0,
    ownership: { default: 0 },
    flags: {
      ...clone(entry.flags ?? {}),
      relis: {
        canonicalId: entry.relisId,
        contentVersion: manifest.contentVersion,
        sourceFormatVersion: manifest.formatVersion,
      },
    },
    _stats: {
      systemId: "relis",
      systemVersion: packageVersion,
      coreVersion: "14",
      createdTime: 0,
      modifiedTime: 0,
      lastModifiedBy: null,
    },
  };
}

export function validatePersonalContent(projectRoot = process.cwd()) {
  const errors = [];
  const warnings = [];
  const sourceRoot = path.join(projectRoot, "content", "personal");
  const manifest = readJson(path.join(sourceRoot, "manifest.json"), errors);
  const aliases = readJson(path.join(sourceRoot, "aliases.json"), errors);
  const questionnaire = readJson(
    path.join(sourceRoot, "crystal-attunement.json"),
    errors,
  );
  const packs = validateManifest(manifest, sourceRoot, errors);
  const entries = [];
  const entriesById = new Map();
  const foundryIds = new Map();

  for (const pack of packs) {
    const directory = relativeInside(
      sourceRoot,
      pack.source,
      `pack ${pack.id}`,
      errors,
    );
    if (!directory) continue;
    for (const file of listJsonFiles(directory)) {
      const entry = validateEntry(
        readJson(file, errors),
        file,
        pack,
        manifest.contentVersion,
        errors,
      );
      if (!entry) continue;
      if (entriesById.has(entry.relisId))
        errors.push(
          `${path.relative(projectRoot, file)} : relisId dupliqué ${entry.relisId}.`,
        );
      entriesById.set(entry.relisId, entry);
      const foundryId = stableFoundryId(entry.relisId);
      if (foundryIds.has(foundryId))
        errors.push(
          `Collision d’identifiant Foundry entre ${foundryIds.get(foundryId)} et ${entry.relisId}.`,
        );
      foundryIds.set(foundryId, entry.relisId);
      entries.push({ entry, file, pack });
    }
  }

  for (const { entry, file } of entries) {
    for (const { pointer, reference } of collectReferences(entry.system)) {
      if (!CANONICAL_ID.test(reference.relisId)) {
        errors.push(
          `${path.relative(projectRoot, file)}${pointer} : référence RE:LIS invalide.`,
        );
        continue;
      }
      if (!entriesById.has(reference.relisId)) {
        const message = `${path.relative(projectRoot, file)}${pointer} : référence absente ${reference.relisId}.`;
        if (manifest.strictReferences) errors.push(message);
        else warnings.push(message);
      }
    }
  }

  validateAliases(aliases, entriesById, errors);
  validateQuestionnaire(questionnaire, errors);
  if (questionnaire?.contentVersion !== manifest?.contentVersion)
    errors.push(
      "Le questionnaire et le manifeste doivent partager contentVersion.",
    );
  if (errors.length) throw new PersonalContentError(errors);
  return { sourceRoot, manifest, aliases, questionnaire, entries, warnings };
}

function safeEmptyDirectory(directory) {
  const resolved = path.resolve(directory);
  if (resolved === path.parse(resolved).root || resolved.length < 12)
    throw new Error(`Répertoire de génération refusé : ${resolved}`);
  fs.rmSync(resolved, { recursive: true, force: true });
  fs.mkdirSync(resolved, { recursive: true });
}

function readPackageVersion(projectRoot) {
  return JSON.parse(
    fs.readFileSync(path.join(projectRoot, "package.json"), "utf8"),
  ).version;
}

export function generatePersonalContent(
  projectRoot = process.cwd(),
  outputRoot = path.join(projectRoot, "build", "content-source"),
) {
  const validation = validatePersonalContent(projectRoot);
  safeEmptyDirectory(outputRoot);
  const packageVersion = readPackageVersion(projectRoot);
  const counts = {};
  for (const pack of validation.manifest.packs) {
    const target = path.join(outputRoot, pack.name);
    fs.mkdirSync(target, { recursive: true });
    const packEntries = validation.entries
      .filter((candidate) => candidate.pack.id === pack.id)
      .sort((left, right) =>
        left.entry.relisId.localeCompare(right.entry.relisId, "fr"),
      );
    counts[pack.name] = packEntries.length;
    for (const { entry } of packEntries)
      fs.writeFileSync(
        path.join(target, `${entry.relisId}.json`),
        stableJson(
          createFoundryItem(entry, validation.manifest, packageVersion),
        ),
      );
  }
  const index = {
    format: "relis.generated-personal-content",
    formatVersion: PERSONAL_SOURCE_FORMAT_VERSION,
    contentVersion: validation.manifest.contentVersion,
    packageVersion,
    packs: validation.manifest.packs.map((pack) => ({
      id: pack.id,
      name: pack.name,
      label: pack.label,
      documentType: pack.documentType,
      system: "relis",
      path: `packs/${pack.name}`,
      itemTypes: pack.itemTypes,
      entries: counts[pack.name],
    })),
    questionnaire: {
      relisId: validation.questionnaire.relisId,
      contentVersion: validation.questionnaire.contentVersion,
    },
  };
  fs.writeFileSync(path.join(outputRoot, "index.json"), stableJson(index));
  return { ...validation, outputRoot, index, counts };
}

function directoryDigest(directory) {
  const files = [];
  function visit(current) {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(path.relative(directory, absolute));
    }
  }
  visit(directory);
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update("\0");
    hash.update(fs.readFileSync(path.join(directory, file)));
    hash.update("\0");
  }
  return { digest: hash.digest("hex"), files };
}

export async function buildPersonalPacks(
  projectRoot = process.cwd(),
  sourceOutput = path.join(projectRoot, "build", "content-source"),
  packOutput = path.join(projectRoot, "build", "content-packs"),
) {
  const generated = generatePersonalContent(projectRoot, sourceOutput);
  safeEmptyDirectory(packOutput);
  const built = [];
  const compiledCounts = {};
  for (const pack of generated.manifest.packs) {
    if ((generated.counts[pack.name] ?? 0) === 0) continue;
    const compiledPack = path.join(packOutput, pack.name);
    await compilePack(path.join(sourceOutput, pack.name), compiledPack, {
      log: false,
    });
    const verificationRoot = fs.mkdtempSync(
      path.join(os.tmpdir(), `relis-${pack.id}-compiled-`),
    );
    try {
      await extractPack(compiledPack, verificationRoot, {
        log: false,
        transformName: (entry) => `${entry._id}.json`,
      });
      const compiledCount = listJsonFiles(verificationRoot).length;
      const expectedCount = generated.counts[pack.name];
      if (compiledCount !== expectedCount)
        throw new Error(
          `${pack.name} : ${compiledCount} entrée(s) LevelDB extraite(s), ${expectedCount} attendue(s).`,
        );
      compiledCounts[pack.name] = compiledCount;
    } finally {
      fs.rmSync(verificationRoot, { recursive: true, force: true });
    }
    built.push(pack.name);
  }
  fs.writeFileSync(
    path.join(packOutput, "index.json"),
    stableJson({
      format: "relis.compiled-personal-packs",
      formatVersion: PERSONAL_SOURCE_FORMAT_VERSION,
      contentVersion: generated.manifest.contentVersion,
      built,
      compiledCounts,
      skippedEmpty: generated.manifest.packs
        .map((pack) => pack.name)
        .filter((name) => !built.includes(name)),
    }),
  );
  return { ...generated, packOutput, built, compiledCounts };
}

export function checkPersonalContent(projectRoot = process.cwd()) {
  const first = fs.mkdtempSync(path.join(os.tmpdir(), "relis-k1-a-"));
  const second = fs.mkdtempSync(path.join(os.tmpdir(), "relis-k1-b-"));
  try {
    const left = generatePersonalContent(projectRoot, first);
    generatePersonalContent(projectRoot, second);
    const leftDigest = directoryDigest(first);
    const rightDigest = directoryDigest(second);
    if (
      leftDigest.digest !== rightDigest.digest ||
      JSON.stringify(leftDigest.files) !== JSON.stringify(rightDigest.files)
    )
      throw new Error(
        "La génération des sources de packs n’est pas déterministe.",
      );
    for (const schema of fs.readdirSync(
      path.join(projectRoot, "content", "schemas"),
    ))
      if (schema.endsWith(".json"))
        JSON.parse(
          fs.readFileSync(
            path.join(projectRoot, "content", "schemas", schema),
            "utf8",
          ),
        );
    return { ...left, digest: leftDigest.digest };
  } finally {
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
}

async function runCli() {
  const command = process.argv[2] ?? "check";
  if (command === "validate") {
    const result = validatePersonalContent();
    console.log(
      `Contenu personnel valide : ${result.entries.length} entrée(s), ${result.warnings.length} avertissement(s).`,
    );
    return;
  }
  if (command === "generate") {
    const result = generatePersonalContent();
    console.log(
      `Sources de packs générées : ${result.entries.length} entrée(s) dans ${path.relative(process.cwd(), result.outputRoot)}.`,
    );
    return;
  }
  if (command === "build") {
    const result = await buildPersonalPacks();
    console.log(
      `Packs personnels compilés : ${result.built.length}; familles sans contenu ignorées : ${result.manifest.packs.length - result.built.length}.`,
    );
    return;
  }
  if (command === "check") {
    const result = checkPersonalContent();
    console.log(
      `Pipeline 10-K1-P déterministe : ${result.digest}; ${result.entries.length} entrée(s) canonique(s).`,
    );
    return;
  }
  throw new Error(`Commande inconnue : ${command}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  runCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
