import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ACOUSTIC_SIGNATURES,
  ACTIVATION_METHODS,
  AMMUNITION_FAMILIES,
  AMMUNITION_VARIANTS,
  AREA_SHAPES,
  ARMOR_KINDS,
  BATTERY_FORMATS,
  CHAMBERINGS,
  CONSUMABLE_DOSES,
  DAMAGE_ATTRIBUTES,
  DAMAGE_DICE,
  DAMAGE_SOURCES,
  DAMAGE_TYPES,
  DEFENSE_TARGETS,
  DURATIONS,
  FEED_INTERFACES,
  FEED_KINDS,
  FIRE_CADENCES,
  FIRE_MODES,
  PHYSICAL_FEED_KINDS,
  POWER_CLASSES,
  PRESSURE_CLASSES,
  RECHARGE_METHODS,
  SAFETY_STATES,
  TECHNICAL_SIZES,
  TECHNOLOGIES,
  TECHNO_BLADE_VARIANTS,
  TREATMENT_FAMILIES,
  WEAPON_ACCESS,
  WEAPON_ATTRIBUTES,
  WEAPON_FAMILIES,
  WEAPON_HANDS,
  WEAPON_SKILLS,
  WEAPON_SUPPORTS,
} from "../src/data/material-catalog";
import { validatePersonalContent } from "../tools/personal-content.mjs";

function entriesById() {
  return new Map(
    validatePersonalContent().entries.map(({ entry }) => [
      entry.relisId,
      entry,
    ]),
  );
}

describe("compendiums canoniques 10-K2-P", () => {
  it("conserve les identifiants canoniques historiques et les trois domaines", () => {
    const entries = entriesById();
    for (const relisId of [
      "STK-001",
      "CLN-001",
      "ALM-001",
      "PHA-001",
      "MYS-001",
      "UTL-001",
    ])
      expect(entries.has(relisId), relisId).toBe(true);
    expect([...entries.values()].some(({ type }) => type === "ancestry")).toBe(
      true,
    );
    expect([...entries.values()].some(({ type }) => type === "power")).toBe(
      true,
    );
    expect([...entries.values()].some(({ type }) => type === "weapon")).toBe(
      true,
    );
  });

  it("sépare l’Écarlithe brute, le Cœur accordable et sa techno-lame", () => {
    const entries = entriesById();
    const raw = entries.get("MAT-RES-ECARLITHE-BRUTE");
    const heart = entries.get("MAT-RES-COEUR-ECARLITHE");
    const blade = entries.get("MAT-WPN-PRANA-TECHNOLAME");
    expect(raw.system.catalog).toMatchObject({
      colorState: "black",
      installable: false,
      attunementState: "not-applicable",
    });
    expect(heart.system.catalog).toMatchObject({
      colorState: "colorless",
      installable: true,
      attunementState: "unattuned",
    });
    expect(heart.system.energyProfile).toMatchObject({
      kind: "pranaCrystal",
      interfaceId: "crystalSocket",
      current: null,
      maximum: null,
      rechargeable: false,
    });
    expect(blade.system.weaponProfile).toMatchObject({
      familyId: "martialTechnoBlade",
      technoBladeVariant: "pranaCrystal",
      feedKind: "pranaCrystal",
      feedInterfaceId: "crystalSocket",
    });
  });

  it("n’invente aucun jet pour les 42 Actions de catalogue", () => {
    const actions = [...entriesById().values()].filter(
      ({ type }) => type === "action",
    );
    expect(actions).toHaveLength(42);
    for (const action of actions)
      expect(action.system.test).toMatchObject({
        configured: false,
        attributeKey: "",
        skillKey: "",
        difficulty: null,
      });
  });

  it("n’émet que des identifiants matériels acceptés par les registres fermés", () => {
    const material = [...entriesById().values()].filter((entry) =>
      [
        "weapon",
        "armor",
        "equipment",
        "consumable",
        "ammunition",
        "resource",
        "container",
      ].includes(entry.type),
    );
    const accepted = (registry, value, label) => {
      if (value) expect(Object.hasOwn(registry, value), label).toBe(true);
    };
    const acceptedMany = (registry, values, label) => {
      for (const value of values ?? []) accepted(registry, value, label);
    };
    for (const entry of material) {
      const weapon = entry.system.weaponProfile;
      if (weapon) {
        accepted(WEAPON_FAMILIES, weapon.familyId, entry.relisId);
        accepted(WEAPON_SUPPORTS, weapon.support, entry.relisId);
        accepted(WEAPON_ACCESS, weapon.access, entry.relisId);
        accepted(DEFENSE_TARGETS, weapon.defenseTarget, entry.relisId);
        accepted(WEAPON_HANDS, weapon.handsMode, entry.relisId);
        accepted(WEAPON_SKILLS, weapon.skillId, entry.relisId);
        accepted(WEAPON_ATTRIBUTES, weapon.attributeId, entry.relisId);
        accepted(
          TECHNO_BLADE_VARIANTS,
          weapon.technoBladeVariant,
          entry.relisId,
        );
        accepted(
          {
            melee: true,
            ranged: true,
            thrown: true,
            mounted: true,
            natural: true,
          },
          weapon.attackMode,
          entry.relisId,
        );
        accepted(
          Object.fromEntries(DAMAGE_DICE.map((value) => [value, true])),
          weapon.damageDie,
          entry.relisId,
        );
        accepted(DAMAGE_ATTRIBUTES, weapon.damageAttribute, entry.relisId);
        accepted(
          {
            contact: true,
            thrown: true,
            increments: true,
            zone: true,
            special: true,
          },
          weapon.rangeKind,
          entry.relisId,
        );
        accepted(FIRE_CADENCES, weapon.cadenceId, entry.relisId);
        accepted(ACOUSTIC_SIGNATURES, weapon.acousticSignature, entry.relisId);
        accepted(FEED_KINDS, weapon.feedKind, entry.relisId);
        accepted(
          PHYSICAL_FEED_KINDS,
          weapon.hybridPhysicalFeedKind,
          entry.relisId,
        );
        accepted(CHAMBERINGS, weapon.chamberingId, entry.relisId);
        accepted(PRESSURE_CLASSES, weapon.pressureClassId, entry.relisId);
        accepted(FEED_INTERFACES, weapon.feedInterfaceId, entry.relisId);
        acceptedMany(FIRE_MODES, weapon.modeIds, entry.relisId);
        acceptedMany(DAMAGE_TYPES, weapon.damageTypes, entry.relisId);
        acceptedMany(DAMAGE_SOURCES, weapon.damageSources, entry.relisId);
      }
      const energy = entry.system.energyProfile;
      if (energy) {
        accepted(
          {
            battery: true,
            internal: true,
            generator: true,
            singleUse: true,
            pranaCrystal: true,
          },
          energy.kind,
          entry.relisId,
        );
        accepted(BATTERY_FORMATS, energy.formatId, entry.relisId);
        accepted(POWER_CLASSES, energy.powerClassId, entry.relisId);
        accepted(TECHNOLOGIES, energy.technologyId, entry.relisId);
        accepted(FEED_INTERFACES, energy.interfaceId, entry.relisId);
        accepted(
          { rechargeable: true, consumable: true, hybrid: true },
          energy.cycle,
          entry.relisId,
        );
        accepted(RECHARGE_METHODS, energy.rechargeMethodId, entry.relisId);
        accepted(DURATIONS, energy.rechargeDurationId, entry.relisId);
        accepted(ACOUSTIC_SIGNATURES, energy.signatureId, entry.relisId);
      }
      const ammunition = entry.system.ammunitionProfile;
      if (ammunition) {
        accepted(AMMUNITION_FAMILIES, ammunition.familyId, entry.relisId);
        accepted(AMMUNITION_VARIANTS, ammunition.variantId, entry.relisId);
        accepted(CHAMBERINGS, ammunition.chamberingId, entry.relisId);
        accepted(PRESSURE_CLASSES, ammunition.pressureClassId, entry.relisId);
        acceptedMany(
          FEED_INTERFACES,
          ammunition.feedInterfaceIds,
          entry.relisId,
        );
        acceptedMany(DAMAGE_TYPES, ammunition.damageTypes, entry.relisId);
        acceptedMany(DAMAGE_SOURCES, ammunition.damageSources, entry.relisId);
      }
      const equipment = entry.system.physical?.equipmentProfile;
      if (equipment) {
        accepted(
          { manipulable: true, wearable: true, resource: true },
          equipment.family,
          entry.relisId,
        );
        accepted(TECHNOLOGIES, equipment.technologyId, entry.relisId);
        accepted(TECHNICAL_SIZES, equipment.technicalSizeId, entry.relisId);
        accepted(
          { accessory: true, modification: true, improvement: true },
          equipment.installationKind,
          entry.relisId,
        );
      }
      const protection = entry.system.protectionProfile;
      if (protection) {
        accepted(
          { ...ARMOR_KINDS, shield: "Bouclier" },
          protection.kind,
          entry.relisId,
        );
        accepted(
          {
            common: true,
            martial: true,
            specialized: true,
            heavy: true,
          },
          protection.access,
          entry.relisId,
        );
        accepted(DURATIONS, protection.equipTimeId, entry.relisId);
        accepted(
          { none: true, partial: true, sealed: true },
          protection.sealing,
          entry.relisId,
        );
      }
      const consumable = entry.system.consumableProfile;
      if (consumable) {
        accepted(
          {
            medical: true,
            drug: true,
            toxin: true,
            potion: true,
            matrix: true,
            grenade: true,
            mine: true,
            charge: true,
            utility: true,
          },
          consumable.kind,
          entry.relisId,
        );
        accepted(CONSUMABLE_DOSES, consumable.doseId, entry.relisId);
        accepted(
          TREATMENT_FAMILIES,
          consumable.treatmentFamilyId,
          entry.relisId,
        );
        accepted(DURATIONS, consumable.durationId, entry.relisId);
        accepted(ACTIVATION_METHODS, consumable.activationId, entry.relisId);
        accepted(AREA_SHAPES, consumable.areaId, entry.relisId);
        accepted(SAFETY_STATES, consumable.safetyState, entry.relisId);
        acceptedMany(DAMAGE_TYPES, consumable.damageTypes, entry.relisId);
      }
    }
  });

  it("déclare les trois packs Item compilés dans le manifeste Foundry", () => {
    const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
    expect(manifest.packs).toEqual([
      expect.objectContaining({
        name: "personal-creation",
        type: "Item",
        path: "packs/personal-creation",
      }),
      expect.objectContaining({
        name: "personal-progression",
        type: "Item",
        path: "packs/personal-progression",
      }),
      expect.objectContaining({
        name: "personal-material",
        type: "Item",
        path: "packs/personal-material",
      }),
    ]);
  });
});
