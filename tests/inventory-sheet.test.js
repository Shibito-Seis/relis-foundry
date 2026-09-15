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

describe("inventaire partagé PJ/PNJ 0.4.2", () => {
  it("rend un seul inventaire hors des branches de densité et de type", () => {
    expect(sheet).toContain(
      'inventoryTab: isCharacter ? "inventory" : "capabilities"',
    );
    expect(template.match(/class="relis-inventory-tree"/g)).toHaveLength(1);
    expect(blocksAt(template.indexOf('class="relis-inventory-tree"'))).toEqual([
      "if isPerson",
      "if hasInventory",
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
    expect(PACKAGE_VERSION).toBe("0.4.2");
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
});
