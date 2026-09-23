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

describe("pipeline de données personnelles 10-K1-P", () => {
  it("valide le manifeste canonique vide sans fabriquer de faux Item", () => {
    const result = validatePersonalContent();
    expect(result.entries).toHaveLength(0);
    expect(result.manifest.packs.map((pack) => pack.id)).toEqual([
      "creation",
      "progression",
      "material",
    ]);
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
    expect(generated.system.meta).toMatchObject({
      relisId: "TST-ITEM-001",
      schemaVersion: "7",
      contentVersion: "1.0.0",
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
    const manifestPath = path.join(
      root,
      "content",
      "personal",
      "manifest.json",
    );
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
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
    expect(
      fs.readdirSync(path.join(packOutput, "personal-material")).length,
    ).toBeGreaterThan(0);
  });

  it("protège le questionnaire : résultat non moral, sans bonus et modifications directes réservées au MJ", () => {
    const { questionnaire } = validatePersonalContent();
    expect(questionnaire.palette).toHaveLength(questionnaire.axes.length);
    expect(questionnaire.mechanics.grantsMechanicalBonus).toBe(false);
    expect(questionnaire.mechanics.usesCE).toBe(false);
    expect(questionnaire.permissions.directColorEdit).toBe("gm");
    expect(questionnaire.permissions.reset).toBe("gm");
    expect(questionnaire.persistence.resetOnTransfer).toBe(false);
    expect(questionnaire.persistence.keepHistory).toBe(true);
  });
});
