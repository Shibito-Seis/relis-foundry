import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PACKAGE_VERSION, SCHEMA_VERSION } from "../src/config";

const template = readFileSync("templates/actors/character.hbs", "utf8");
const sheet = readFileSync("src/sheets/actor-sheet.ts", "utf8");

/** Track enclosing Handlebars blocks, including else branches. */
function blocksAt(position) {
  const stack = [];
  for (const match of template
    .slice(0, position)
    .matchAll(/{{([#/]\w+[^}]*|else)}}/g)) {
    const token = match[1];
    if (token.startsWith("#")) stack.push(token.slice(1));
    else if (token.startsWith("/")) stack.pop();
    else stack[stack.length - 1] += " else";
  }
  return stack;
}

describe("inventaire partagé PJ/PNJ 0.5.0", () => {
  it("rend un seul inventaire hors des branches de densité et de type", () => {
    expect(sheet).toContain(
      'inventoryTab: isCharacter ? "inventory" : "capabilities"',
    );
    expect(template.match(/class="relis-inventory-tree"/g)).toHaveLength(1);
    expect(blocksAt(template.indexOf('class="relis-inventory-tree"'))).toEqual([
      "if isPerson",
    ]);
    expect(template).toContain('data-tab-panel="{{inventoryTab}}"');
    for (const field of [
      "inventoryTotals",
      "inventoryDiagnostics",
      "inventoryRows",
      "quantityUnit",
      "lot",
      "condition",
      "accessibility",
      "location",
      "ownMass",
      "capacityMass",
      "capacityVolume",
      "capacityBulk",
      "capacityUnits",
    ]) {
      expect(template).toContain(field);
    }
    for (const density of ["npcCondensed", "npcStandard", "npcComplete"]) {
      expect(sheet).toContain(density);
    }
  });
  it("omet les commandes sans propriété et garde leurs conditions métier", () => {
    for (const [action, condition] of [
      ["create-inventory-item", "if editable"],
      ["split-inventory-stack", "if canSplit"],
      ["merge-inventory-stack", "if canMerge"],
      ["move-inventory-item", "if canMove"],
      ["transfer-inventory-item", "if canTransfer"],
    ]) {
      const position = template.indexOf(`data-action="${action}"`);
      expect(position).toBeGreaterThan(0);
      const blocks = blocksAt(position);
      expect(blocks).toContain(condition);
      expect(
        blocks.some(
          (block) => block === "if editable" || block === "if @root.editable",
        ),
      ).toBe(true);
    }
    expect(sheet).toContain("editable: this.actor.isOwner");
  });
  it("affiche la version dynamique sans migration", () => {
    expect(PACKAGE_VERSION).toBe("0.5.3");
    expect(SCHEMA_VERSION).toBe("5");
    expect(sheet).toContain("packageVersion: PACKAGE_VERSION");
    expect(template).toMatch(
      /<footer[^>]*>[\s\S]*?{{packageVersion}}<\/footer>/,
    );
    expect(template).not.toContain("0.3.6");
  });
  it("préserve le div neutre du contrat DialogV2 0.4.1", () => {
    expect(sheet).toMatch(
      /function dialogContent\(\): HTMLDivElement \{\s*return document\.createElement\("div"\);\s*\}/,
    );
    expect(sheet).toContain('field.className = "relis-inventory-dialog-field"');
    expect(sheet).toContain("foundry.applications.api.DialogV2.input({");
  });
  it("présente la charge simplifiée et conserve la recherche validée", () => {
    expect(template).toContain('role="meter"');
    expect(template).toContain("carrying.missing");
    expect(template).toContain("carrying.defined");
    expect(template).not.toContain('class="relis-inventory-summary"');
    expect(template).toContain("data-inventory-search");
    expect(template).toContain("data-inventory-fold");
  });
  it("sépare la consultation du portrait et son édition réservée au propriétaire", () => {
    expect(template).toContain('data-action="showPortraitArtwork"');
    expect(blocksAt(template.indexOf("data-edit-actor-portrait"))).toContain(
      "if editable",
    );
    expect(sheet).toContain("openActorPortraitPicker(this.actor)");
  });
  it("protège les commandes d’équipement et réserve le portage au MJ", () => {
    for (const command of ["state", "save", "apply", "body", "recover"]) {
      const blocks = blocksAt(
        template.indexOf(`data-equipment-command="${command}"`),
      );
      expect(
        blocks.some((block) =>
          ["if editable", "if @root.editable", "if canConfigureBody"].includes(
            block,
          ),
        ),
      ).toBe(true);
    }
    expect(sheet).toContain("canConfigureBody: Boolean(game.user?.isGM)");
    expect(sheet).toContain("previewEquipment(this.actor");
    expect(sheet).toContain("preview.fingerprint");
  });
});

it("place le profil dans la fiche Item et conserve la sélection dans le HTML", () => {
  const itemTemplate = readFileSync("templates/items/item.hbs", "utf8");
  expect(sheet).not.toContain("configureEquipment");
  expect(template).not.toContain('data-equipment-command="profile"');
  expect(itemTemplate).toContain("data-equipment-profile");
  expect(itemTemplate).toContain("{{checked checked}}");
  expect(itemTemplate).toContain("{{#if editable}}");
});
