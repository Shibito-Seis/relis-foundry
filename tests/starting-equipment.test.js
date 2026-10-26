import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { STARTING_EQUIPMENT_PACKAGES } from "../src/rules/starting-equipment";

function jsonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory()
      ? jsonFiles(target)
      : entry.isFile() && entry.name.endsWith(".json")
        ? [target]
        : [];
  });
}

describe("paquetages de départ 10-D3", () => {
  it("ne référence que des Items matériels existants de niveau 1 ou inférieur", () => {
    const byRelisId = new Map();
    for (const file of jsonFiles("content/personal/packs")) {
      const source = JSON.parse(fs.readFileSync(file, "utf8"));
      if (source.relisId) byRelisId.set(String(source.relisId), source);
    }

    for (const equipmentPackage of STARTING_EQUIPMENT_PACKAGES.filter(
      ({ levelOneAvailable }) => levelOneAvailable,
    )) {
      expect(equipmentPackage.contents.length).toBeGreaterThan(0);
      for (const content of equipmentPackage.contents) {
        const source = byRelisId.get(content.relisId);
        expect(
          source,
          `${equipmentPackage.label} : ${content.relisId}`,
        ).toBeDefined();
        expect(Number(source.system?.level ?? 0)).toBeLessThanOrEqual(1);
        expect(content.quantity).toBeGreaterThan(0);
      }
    }
  });

  it("garde les huit paquetages dans le budget personnel maximal de création", () => {
    expect(STARTING_EQUIPMENT_PACKAGES).toHaveLength(8);
    for (const equipmentPackage of STARTING_EQUIPMENT_PACKAGES) {
      expect(equipmentPackage.cost).toBeGreaterThan(0);
      expect(equipmentPackage.cost).toBeLessThanOrEqual(5_000);
    }
  });
});
