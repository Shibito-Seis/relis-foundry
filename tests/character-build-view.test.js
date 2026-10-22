import fs from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  assignBuildSelection,
  buildSlotRows,
} from "../src/services/character-build";

function item(id, name, relisId) {
  return {
    id,
    name,
    img: "icons/svg/item-bag.svg",
    type: "ancestry",
    uuid: `Actor.A.Item.${id}`,
    system: { meta: { relisId } },
    flags: {},
  };
}

describe("construction manuelle PF2e-like 10-D3", () => {
  it("diagnostique quatre Ascendances historiques sans en supprimer une", () => {
    const actor = {
      system: {
        build: {
          ancestryRef: {
            relisId: "CRE-ANC-001-HUMAIN",
            uuid: "Actor.A.Item.a1",
          },
        },
        post: {},
      },
      items: [
        item("a1", "Humain", "CRE-ANC-001-HUMAIN"),
        item("a2", "Elfe", "CRE-ANC-012-ELFE"),
        item("a3", "Nain", "CRE-ANC-014-NAIN"),
        item("a4", "Esman", "CRE-ANC-019-ESMAN"),
      ],
    };
    const ancestry = buildSlotRows(actor).find(({ key }) => key === "ancestry");
    expect(ancestry?.items).toHaveLength(4);
    expect(ancestry?.items.filter(({ selected }) => selected)).toHaveLength(1);
    expect(ancestry?.diagnostic).toContain(
      "Aucun n’est supprimé automatiquement",
    );
  });

  it("place loupe et corbeille sous propriété et retire les Items de construction du fourre-tout", () => {
    const template = fs.readFileSync("templates/actors/character.hbs", "utf8");
    const sheet = fs.readFileSync("src/sheets/actor-sheet.ts", "utf8");
    expect(template).toContain('data-action="pick-build-item"');
    expect(template).toContain('data-action="remove-build-item"');
    expect(template).toMatch(
      /data-action="pick-build-item"[^>]+data-owner-control/u,
    );
    expect(template).toMatch(
      /data-action="remove-build-item"[^>]+data-owner-control/u,
    );
    expect(sheet).toContain("!BUILD_ITEM_TYPES.has(item.type)");
    expect(template).toContain("Construction du PNJ");
    expect(template).toContain("buildSummary.ancestry");
  });

  it("rattache un Item historique existant sans en créer une cinquième copie", async () => {
    const legacy = item("a2", "Elfe", "CRE-ANC-012-ELFE");
    const actor = {
      isOwner: true,
      system: { build: { ancestryRef: null }, post: {} },
      items: [legacy],
      createEmbeddedDocuments: vi.fn(),
      deleteEmbeddedDocuments: vi.fn(),
      update: vi.fn(),
    };
    globalThis.game = { user: { isGM: true } };
    await assignBuildSelection(actor, "ancestry", {
      name: "Elfe",
      type: "ancestry",
      relisId: "CRE-ANC-012-ELFE",
      packId: "relis.creation-ancestries",
      uuid: "Compendium.relis.creation-ancestries.Item.elfe",
      img: "icons/svg/item-bag.svg",
      catalog: {},
    });
    expect(actor.createEmbeddedDocuments).not.toHaveBeenCalled();
    expect(actor.update).toHaveBeenCalledWith({
      "system.build.ancestryRef": expect.objectContaining({
        uuid: "Actor.A.Item.a2",
        relisId: "CRE-ANC-012-ELFE",
      }),
    });
    expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("conserve l’ancienne référence comme historique lors d’un remplacement manuel", async () => {
    const active = item("a1", "Humain", "CRE-ANC-001-HUMAIN");
    const actor = {
      isOwner: true,
      system: {
        build: {
          ancestryRef: {
            relisId: active.system.meta.relisId,
            uuid: active.uuid,
          },
        },
        post: {},
      },
      items: [active],
      createEmbeddedDocuments: vi
        .fn()
        .mockResolvedValue([item("a2", "Elfe", "CRE-ANC-012-ELFE")]),
      deleteEmbeddedDocuments: vi.fn(),
      update: vi.fn(),
    };
    globalThis.game = { user: { isGM: true } };
    globalThis.fromUuid = vi.fn().mockResolvedValue({
      documentName: "Item",
      toObject: () => ({
        name: "Elfe",
        type: "ancestry",
        system: { meta: { relisId: "CRE-ANC-012-ELFE" }, catalog: {} },
      }),
    });
    await assignBuildSelection(actor, "ancestry", {
      name: "Elfe",
      type: "ancestry",
      relisId: "CRE-ANC-012-ELFE",
      packId: "relis.creation-ancestries",
      uuid: "Compendium.relis.creation-ancestries.Item.elfe",
      img: "icons/svg/item-bag.svg",
      catalog: {},
    });
    expect(actor.update).toHaveBeenCalled();
    expect(actor.deleteEmbeddedDocuments).not.toHaveBeenCalled();
  });

  it("protège le contrat DialogV2 : racine nue, classe sur l’enfant", () => {
    const service = fs.readFileSync("src/services/character-build.ts", "utf8");
    expect(service).toContain('const root = document.createElement("div")');
    expect(service).toContain('browser.className = "relis-catalog-browser"');
    expect(service).not.toMatch(/root\.className\s*=/u);
  });

  it("verrouille les catalogues lisibles, filtrables et réellement défilants", () => {
    const service = fs.readFileSync("src/services/character-build.ts", "utf8");
    const style = fs.readFileSync("styles/relis.css", "utf8");
    expect(service).toContain("openCatalogSelectionDocument");
    expect(service).toContain("Valider la sélection");
    expect(service).toContain("normalizeCatalogSearch");
    expect(service).toContain("Sélectionner");
    expect(service).toContain("Lire");
    expect(style).toMatch(
      /\.relis-catalog-browser__entry\[hidden\]\s*\{\s*display:\s*none/u,
    );
    expect(style).toMatch(
      /\.relis-catalog-browser__list[\s\S]*?overflow-y:\s*auto/u,
    );
  });

  it("impose les sélecteurs Foundry, les plafonds de choix et le nettoyage sûr", () => {
    const assistant = fs.readFileSync(
      "src/ui/character-creation-assistant.ts",
      "utf8",
    );
    const template = fs.readFileSync(
      "templates/apps/character-creation.hbs",
      "utf8",
    );
    const service = fs.readFileSync("src/services/character-build.ts", "utf8");
    expect(assistant).toContain("FilePicker.implementation");
    expect(assistant).toContain("input.dataset.maxSelections");
    expect(template).toContain('data-max-selections="4"');
    expect(template).toContain('data-picker="equipment"');
    expect(template).not.toContain('placeholder="Chemin Foundry facultatif"');
    expect(service).toMatch(/let actor: Actor \| null = null/u);
    expect(service).toMatch(/if \(actor\) await actor\.delete\(\)/u);
  });
});
