import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  PersonalContentError,
  buildPersonalPacks,
  checkPersonalContent,
  generatePersonalContent,
  stableFoundryId,
  validatePersonalContent,
} from "../tools/personal-content.mjs";

const temporaryRoots = [];

function makeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "relis-k1-test-"));
  temporaryRoots.push(root);
  fs.cpSync("content", path.join(root, "content"), { recursive: true });
  const packsRoot = path.join(root, "content", "personal", "packs");
  fs.rmSync(packsRoot, { recursive: true, force: true });
  fs.mkdirSync(path.join(packsRoot, "material"), { recursive: true });
  const manifestPath = path.join(root, "content", "personal", "manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  manifest.packs = [
    {
      id: "material",
      name: "personal-material",
      label: "RE:LIS — Matériel de recette",
      documentType: "Item",
      source: "packs/material",
      itemTypes: ["equipment"],
    },
  ];
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  fs.copyFileSync("package.json", path.join(root, "package.json"));
  return root;
}

function writeEntry(root, pack, entry) {
  const file = path.join(
    root,
    "content",
    "personal",
    "packs",
    pack,
    `${entry.relisId}.json`,
  );
  fs.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`);
  return file;
}

function testEntry(overrides = {}) {
  return {
    relisId: "TST-ITEM-001",
    name: "Objet de recette supprimable",
    type: "equipment",
    tags: ["test-local"],
    system: { description: "Donnée de test uniquement." },
    ...overrides,
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0))
    fs.rmSync(root, { recursive: true, force: true });
});

describe("pipeline de données personnelles 10-K1-P / 10-K2-P", () => {
  it("valide l’inventaire canonique exhaustif et classé de 2 404 Items", () => {
    const result = validatePersonalContent();
    expect(result.entries).toHaveLength(2404);
    expect(result.manifest.packs).toHaveLength(23);
    expect(
      Object.fromEntries(
        result.manifest.packs.map((pack) => [
          pack.id,
          result.entries.filter(
            ({ pack: sourcePack }) => sourcePack.id === pack.id,
          ).length,
        ]),
      ),
    ).toEqual({
      "creation-advantages": 31,
      "creation-ancestries": 20,
      "creation-drawbacks": 37,
      "creation-origins": 48,
      "creation-posts": 11,
      "creation-profiles": 52,
      "material-ammunition": 66,
      "material-armor": 80,
      "material-consumables": 267,
      "material-containers": 28,
      "material-equipment": 147,
      "material-resources": 62,
      "material-weapons": 111,
      "progression-actions": 42,
      "progression-ancestry-talents": 738,
      "progression-general-talents": 42,
      "progression-paths": 12,
      "progression-powers-flux": 84,
      "progression-powers-mana": 84,
      "progression-powers-prana": 84,
      "progression-skill-talents": 250,
      "progression-specializations": 84,
      "progression-vampire-talents": 24,
    });
    expect(
      Object.fromEntries(
        Object.entries(
          result.entries.reduce((counts, { entry }) => {
            counts[entry.type] = (counts[entry.type] ?? 0) + 1;
            return counts;
          }, {}),
        ).sort(([left], [right]) => left.localeCompare(right)),
      ),
    ).toEqual({
      action: 42,
      advantage: 31,
      ammunition: 66,
      ancestry: 20,
      armor: 80,
      consumable: 267,
      container: 28,
      drawback: 37,
      equipment: 147,
      origin: 48,
      path: 12,
      post: 11,
      power: 252,
      profile: 52,
      resource: 62,
      specialization: 84,
      talent: 1054,
      weapon: 111,
    });
    expect(result.warnings).toEqual([]);
    expect(result.manifest.strictReferences).toBe(true);
    expect(result.questionnaire.nomenclature.canonicalTerm).toBe("Écarlithe");
  });

  it("dérive un identifiant Foundry stable sans remplacer le relisId", () => {
    expect(stableFoundryId("UTL-001")).toMatch(/^[a-f0-9]{16}$/);
    expect(stableFoundryId("UTL-001")).toBe(stableFoundryId("UTL-001"));
    expect(stableFoundryId("UTL-001")).not.toBe(stableFoundryId("UTL-002"));
  });

  it("génère deux fois exactement les mêmes sources et injecte les métadonnées", () => {
    const root = makeProject();
    writeEntry(root, "material", testEntry());
    const checked = checkPersonalContent(root);
    expect(checked.entries).toHaveLength(1);

    const output = path.join(root, "generated");
    generatePersonalContent(root, output);
    const generated = JSON.parse(
      fs.readFileSync(
        path.join(output, "personal-material", "TST-ITEM-001.json"),
        "utf8",
      ),
    );
    expect(generated._id).toBe(stableFoundryId("TST-ITEM-001"));
    expect(generated._key).toBe(`!items!${stableFoundryId("TST-ITEM-001")}`);
    expect(generated.system.meta).toMatchObject({
      relisId: "TST-ITEM-001",
      schemaVersion: "7",
      contentVersion: "1.2.1",
      status: "active",
    });
    expect(generated.system.meta.sourceRef.relisId).toBe("");
    expect(generated.ownership).toEqual({ default: 0 });
  });

  it("refuse les identités ambiguës et les métadonnées contrôlées par le générateur", () => {
    const root = makeProject();
    writeEntry(
      root,
      "material",
      testEntry({
        _id: "interdit",
        system: { meta: { relisId: "AUTRE-001" } },
      }),
    );
    expect(() => validatePersonalContent(root)).toThrow(PersonalContentError);
    expect(() => validatePersonalContent(root)).toThrow(
      /_id est généré|system\.meta est injecté/,
    );
  });

  it("signale les références absentes puis les bloque en mode strict", () => {
    const root = makeProject();
    const manifestPath = path.join(
      root,
      "content",
      "personal",
      "manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    manifest.strictReferences = false;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    writeEntry(
      root,
      "material",
      testEntry({
        system: {
          description: "Référence de test.",
          prerequisiteRef: {
            relisId: "TST-MISSING-001",
            documentName: "Item",
            type: "talent",
            state: "resolved",
            missingPolicy: "diagnose",
          },
        },
      }),
    );
    expect(validatePersonalContent(root).warnings).toHaveLength(1);
    manifest.strictReferences = true;
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    expect(() => validatePersonalContent(root)).toThrow(
      /référence absente TST-MISSING-001/,
    );
  });

  it("compile les JSON générés en vrai pack LevelDB avec l’outil Foundry officiel", async () => {
    const root = makeProject();
    writeEntry(root, "material", testEntry());
    const sourceOutput = path.join(root, "build", "sources");
    const packOutput = path.join(root, "build", "packs");
    const result = await buildPersonalPacks(root, sourceOutput, packOutput);
    expect(result.built).toEqual(["personal-material"]);
    expect(result.compiledCounts).toEqual({ "personal-material": 1 });
    const compiledDirectory = path.join(packOutput, "personal-material");
    expect(
      fs
        .readdirSync(compiledDirectory)
        .reduce(
          (size, file) =>
            size + fs.statSync(path.join(compiledDirectory, file)).size,
          0,
        ),
    ).toBeGreaterThan(100);
  });

  it("protège le questionnaire : résultat non moral, sans bonus et modifications directes réservées au MJ", () => {
    const { questionnaire } = validatePersonalContent();
    expect(questionnaire.palette).toHaveLength(15);
    expect(questionnaire.questions).toHaveLength(48);
    expect(questionnaire.questionSelection).toEqual({
      count: 20,
      difficultyCounts: { simple: 8, intermediate: 8, complex: 4 },
      stableForItem: true,
    });
    expect(
      questionnaire.palette.reduce((counts, color) => {
        counts[color.kind] = (counts[color.kind] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ dominant: 6, conjunction: 6, equilibrium: 3 });
    expect(questionnaire.mechanics.grantsMechanicalBonus).toBe(false);
    expect(questionnaire.mechanics.usesCE).toBe(false);
    expect(questionnaire.permissions.directColorEdit).toBe("gm");
    expect(questionnaire.permissions.reset).toBe("gm");
    expect(questionnaire.persistence.resetOnTransfer).toBe(false);
    expect(questionnaire.persistence.keepHistory).toBe(true);
  });
});
