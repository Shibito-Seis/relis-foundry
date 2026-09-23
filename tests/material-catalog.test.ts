// @ts-expect-error Le projet n'embarque volontairement pas @types/node.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACCURACY_VALUES,
  allowedAmmunitionFamilies,
  allowedFeedKinds,
  requiredTechnoBladeFeed,
} from "../src/data/material-catalog";
import { migrateMaterialSystem } from "../src/data/material-migration";
import { initialPhysicalState } from "../src/data/item-defaults";
import { materialDiagnostics } from "../src/rules/personal-material";

describe("10-E4-P v0.6.1 — registres matériels fermés", () => {
  it("réserve les armes longues énergétiques aux batteries", () => {
    expect(allowedFeedKinds("energyLongGun")).toEqual(["energy"]);
    expect(allowedAmmunitionFamilies("energyLongGun")).toEqual([
      "battery",
      "technomagical",
    ]);
    expect(allowedAmmunitionFamilies("energyLongGun")).not.toContain(
      "ballistic",
    );
    expect(allowedFeedKinds("handgun")).toEqual([
      "none",
      "internal",
      "detachable",
      "energy",
      "hybrid",
    ]);
  });

  it("distingue les trois techno-lames sans transformer le Prana en CE", () => {
    expect(requiredTechnoBladeFeed("vibratoryMaterial")).toBe("energy");
    expect(requiredTechnoBladeFeed("retractableConductor")).toBe("energy");
    expect(requiredTechnoBladeFeed("pranaCrystal")).toBe("pranaCrystal");
    expect(allowedFeedKinds("martialTechnoBlade", "pranaCrystal")).toEqual([
      "pranaCrystal",
    ]);
    expect(
      allowedAmmunitionFamilies("martialTechnoBlade", "vibratoryMaterial"),
    ).toEqual(["battery"]);
    expect(
      allowedAmmunitionFamilies("martialTechnoBlade", "pranaCrystal"),
    ).toEqual(["pranaCrystal"]);

    const diagnostics = materialDiagnostics({
      id: "blade",
      name: "Lame de recette",
      type: "weapon",
      system: {
        physical: initialPhysicalState(),
        weaponProfile: {
          familyId: "martialTechnoBlade",
          technoBladeVariant: "pranaCrystal",
          feedKind: "energy",
        },
      },
    });
    expect(diagnostics.map(({ message }) => message).join(" ")).toMatch(
      /Prana.*jamais une batterie/i,
    );
  });

  it("expose toute l’échelle de Précision validée de -4 à +4", () => {
    expect(ACCURACY_VALUES).toEqual([-4, -3, -2, -1, 0, 1, 2, 3, 4]);
  });

  it("convertit seulement les anciennes valeurs reconnues", () => {
    const system = migrateMaterialSystem(
      {
        weaponProfile: {
          family: "Armes de poing",
          skillKey: "Tir",
          attributeKey: "Dextérité",
          handsRequired: 1,
          handsFlexible: true,
          cadence: "Semi-automatique",
          chamberId: "BAL-9P",
          damageTypes: ["Perforant", "valeur locale conservée"],
        },
      },
      "weapon",
    );
    expect(system.weaponProfile).toMatchObject({
      familyId: "handgun",
      skillId: "shooting",
      attributeId: "dexterity",
      handsMode: "versatile",
      cadenceId: "sequential",
      chamberingId: "BAL-9P",
      damageTypes: ["piercing", "valeur locale conservée"],
    });
  });

  it("ne présente aucun champ texte libre dans les profils spécialisés", () => {
    const template = readFileSync("templates/items/item.hbs", "utf8");
    for (const [start, end] of [
      ["{{#if isWeapon}}", "{{#if hasProtectionProfile}}"],
      ["{{#if hasProtectionProfile}}", "{{#if hasEnergyProfile}}"],
      ["{{#if hasEnergyProfile}}", "{{#if hasSupplyProfile}}"],
      ["{{#if isAmmunition}}", "{{#if isConsumable}}"],
      ["{{#if isConsumable}}", "{{#if isResource}}"],
    ] as const) {
      const section = template.slice(
        template.indexOf(start),
        template.indexOf(end, template.indexOf(start) + start.length),
      );
      expect(section, start).not.toContain('type="text"');
    }
    expect(template).toContain("multi-select");
    expect(template).toContain("system.weaponProfile.familyId");
    expect(template).not.toContain("system.weaponProfile.prerequisiteSummary");
  });
});
