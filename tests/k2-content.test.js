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
import { projectOwnedSpecializationTalent } from "../src/rules/talent-projection";

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

  it("recalcule les 111 armes et couvre arcs, carreaux et rechargement unitaire", () => {
    const entries = entriesById();
    const weapons = [...entries.values()].filter(
      ({ type }) => type === "weapon",
    );
    expect(weapons).toHaveLength(111);
    for (const weapon of weapons) {
      expect(weapon.system.weaponProfile.familyId, weapon.relisId).not.toBe("");
      expect(weapon.system.weaponProfile.skillId, weapon.relisId).not.toBe("");
      expect(weapon.system.weaponProfile.attributeId, weapon.relisId).not.toBe(
        "",
      );
    }
    expect(
      entries.get("MAT-WPN-077-ARC-COURT").system.weaponProfile,
    ).toMatchObject({
      skillId: "shooting",
      attributeId: "dexterity",
      feedKind: "none",
      chamberingId: "ARW-SHORT",
      ammunitionFamilyIds: ["arrow"],
      ammunitionConsumption: { single: 1 },
    });
    expect(
      entries.get("MAT-WPN-082-ARBALETE-A-REPETITION").system.weaponProfile,
    ).toMatchObject({
      feedKind: "internal",
      internalCapacity: 6,
      chamberingId: "BOLT-REPEATING",
    });
    expect(
      entries.get("MAT-WPN-083-JAVELOT").system.weaponProfile,
    ).toMatchObject({
      attackMode: "thrown",
      feedKind: "none",
      damageAttribute: "force",
      ammunitionFamilyIds: [],
    });
    expect(
      [...entries.values()].filter(({ relisId }) =>
        /^(?:ARW|BOLT)-/.test(relisId),
      ),
    ).toHaveLength(6);
  });

  it("stocke les boîtes comme quantités réelles et réserve l’interface aux chargeurs", () => {
    const entries = entriesById();
    expect(entries.get("BAL-357M").system).toMatchObject({
      physical: { quantity: 30 },
      referencePrice: { quantityBasis: 30 },
      ammunitionProfile: { feedInterfaceIds: [], feedInterfaces: [] },
    });
    for (const ammunition of [...entries.values()].filter(
      ({ type }) => type === "ammunition",
    ))
      expect(
        ammunition.system.ammunitionProfile.feedInterfaceIds ?? [],
        ammunition.relisId,
      ).toEqual([]);
  });

  it("structure les 16 focaliseurs sans confondre tampon magique et CE", () => {
    const focalizers = [...entriesById().values()].filter(
      ({ system }) => system.catalog?.focusProfile,
    );
    expect(focalizers).toHaveLength(16);
    for (const focalizer of focalizers) {
      expect(focalizer.system.catalog.focusProfile).toMatchObject({
        ceDoesNotRefillBuffer: true,
        automationLot: "10-F",
      });
      expect(focalizer.system.energyProfile.kind).toBe("internal");
      expect(focalizer.system.energyProfile.maximum).toBeGreaterThan(0);
    }
  });

  it("publie 5 100 descriptions lisibles sans tableau technique brut", () => {
    const entries = [...entriesById().values()];
    expect(entries).toHaveLength(5100);
    for (const entry of entries) {
      expect(
        String(entry.system.description ?? "").trim(),
        entry.relisId,
      ).not.toBe("");
      expect(entry.system.description, entry.relisId).not.toContain("<dl>");
    }
  });

  it("porte dans les catalogues les contraintes de création consommées par 10-D3", () => {
    const entries = entriesById();
    expect(
      entries.get("CRE-ANC-001-HUMAIN").system.catalog.automaticDrawbacks,
    ).toEqual([
      expect.objectContaining({
        relisId: "CRE-HCP-001-PRECEPTE-DE-L-HUMANITE",
        selectedValue: -1,
      }),
    ]);
    expect(
      entries.get("CRE-AVT-025-MA-FAMILLE-EST-EN-VIE").system.catalog
        .creationConstraints.requires,
    ).toContainEqual(
      expect.objectContaining({ relisId: "CRE-HCP-005-FAMILLE-A-NOURRIR" }),
    );
    expect(
      entries.get("CRE-AVT-031-PHYSIOLOGIE-VAMPIRIQUE").system.catalog
        .creationConstraints.requires,
    ).toContainEqual(
      expect.objectContaining({ relisId: "CRE-HCP-037-FAIM-ECARLATE" }),
    );
    for (const relisId of [
      "CRE-AVT-010-PRODIGE-ENERGETIQUE",
      "CRE-AVT-019-CORPS-ADAPTE",
      "CRE-AVT-020-IMMUNITE-RARE",
      "CRE-AVT-022-EDUCATION-D-ELITE",
    ])
      expect(
        entries.get(relisId).system.catalog.creationChoices,
        relisId,
      ).toEqual([
        expect.objectContaining({
          minimum: expect.any(Number),
          maximum: expect.any(Number),
          options: expect.any(Array),
        }),
      ]);
  });

  it("déduit la nature corporelle et sépare 4 Postes principaux de 7 secondaires", () => {
    const values = [...entriesById().values()];
    const ancestries = values.filter(
      ({ type, system }) =>
        type === "ancestry" && system.catalog.selectable !== false,
    );
    expect(
      ancestries.find(({ relisId }) => relisId === "CRE-ANC-018-IAA").system
        .catalog.bodyNature,
    ).toBe("synthetic");
    for (const ancestry of ancestries.filter(
      ({ relisId }) => relisId !== "CRE-ANC-018-IAA",
    ))
      expect(ancestry.system.catalog.bodyNature, ancestry.relisId).toBe(
        "biological",
      );
    const posts = values.filter(({ type }) => type === "post");
    expect(
      posts.filter(({ system }) => system.catalog.postTier === "primary"),
    ).toHaveLength(4);
    expect(
      posts.filter(({ system }) => system.catalog.postTier === "secondary"),
    ).toHaveLength(7);
  });

  it("développe les 28 documents d’Ascendance et les 12 Voies depuis leurs sections canoniques", () => {
    const values = [...entriesById().values()];
    const plainWords = (description) =>
      String(description ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&[a-z#0-9]+;/giu, " ")
        .trim()
        .split(/\s+/u)
        .filter(Boolean);
    const ancestries = values.filter(({ type }) => type === "ancestry");
    expect(ancestries).toHaveLength(28);
    for (const ancestry of ancestries) {
      expect(
        plainWords(ancestry.system.description).length,
        ancestry.relisId,
      ).toBeGreaterThanOrEqual(55);
      expect(ancestry.system.description, ancestry.relisId).toContain("<h3>");
    }
    const paths = values.filter(({ type }) => type === "path");
    expect(paths).toHaveLength(12);
    for (const path of paths) {
      expect(
        plainWords(path.system.description).length,
        path.relisId,
      ).toBeGreaterThanOrEqual(140);
      for (const heading of [
        "Concept",
        "Rôle en combat",
        "Rôle hors combat",
        "Branches",
        "Repères de création",
      ])
        expect(
          path.system.description,
          `${path.relisId} — ${heading}`,
        ).toContain(`<h3>${heading}</h3>`);
    }
  });

  it("sépare les huit lignées Demi-Beastkins sans dupliquer leur catalogue hybride", () => {
    const entries = entriesById();
    const group = entries.get("CRE-ANC-011-DEMI-BEASTKIN");
    const variants = [
      ["CRE-ANC-020-DEMI-BEASTKIN-RENARD", "Beastkin Renard", "-1 Vigueur"],
      ["CRE-ANC-021-DEMI-BEASTKIN-CHAT", "Beastkin Chat", "-1 Force"],
      ["CRE-ANC-022-DEMI-BEASTKIN-FELIN", "Beastkin Félin", "-1 Volonté"],
      [
        "CRE-ANC-023-DEMI-BEASTKIN-CHIEN",
        "Beastkin Chien",
        "-1 Maîtrise Magique",
      ],
      ["CRE-ANC-024-DEMI-BEASTKIN-LOUP", "Beastkin Loup", "-1 Présence"],
      ["CRE-ANC-025-DEMI-BEASTKIN-LEZARD", "Beastkin Lézard", "-1 Présence"],
      ["CRE-ANC-026-DEMI-BEASTKIN-OURS", "Beastkin Ours", "-1 Dextérité"],
      ["CRE-ANC-027-DEMI-BEASTKIN-SOURIS", "Beastkin Souris", "-1 Force"],
    ];

    expect(group.system.catalog).toMatchObject({
      kind: "ancestry-group",
      selectable: false,
    });
    expect(
      group.system.catalog.memberRefs.map(({ relisId }) => relisId),
    ).toEqual(variants.map(([relisId]) => relisId));

    for (const [relisId, parentName, penalty] of variants) {
      const ancestry = entries.get(relisId);
      const parent = [...entries.values()].find(
        ({ name }) => name === parentName,
      );
      expect(ancestry.system.catalog).toMatchObject({
        kind: "ancestry",
        selectable: true,
        parentAncestry: parentName,
        inheritedAttributeChoiceCount: 2,
        freeAttributeChoiceCount: 1,
        attributeChoicesMustBeDistinct: true,
        freeAttributeMayOffsetPenalty: true,
        attributePenalty: penalty,
        talentCatalogs: ["Humain", parentName, "Demi-Beastkin"],
        parentAncestryRef: {
          relisId: parent.relisId,
          state: "resolved",
        },
      });
      expect(ancestry.system.catalog.inheritedAttributeChoices).toHaveLength(3);
      expect(ancestry.system.catalog.hitPointProfile).toMatchObject({
        mode: "dominance",
        profiles: [
          { id: "human", value: 10 },
          {
            id: "nonHuman",
            value: parent.system.catalog.hitPointProfile.value,
          },
        ],
      });
      expect(ancestry.system.catalog.energyProfiles).toHaveLength(2);
      expect(ancestry.system.catalog.energySelectionRequired).toBe(true);
    }

    const ancestries = [...entries.values()].filter(
      ({ type }) => type === "ancestry",
    );
    expect(
      ancestries.filter(({ system }) => system.catalog.selectable !== false),
    ).toHaveLength(26);
    expect(
      ancestries.filter(
        ({ system }) => system.catalog.kind === "ancestry-group",
      ),
    ).toHaveLength(2);

    for (const stableRelisId of [
      "CRE-ANC-012-ELFE",
      "CRE-ANC-013-DEMI-ELFE",
      "CRE-ANC-019-ESMAN",
    ])
      expect(entries.has(stableRelisId), stableRelisId).toBe(true);
  });

  it("publie les 84 catalogues complets avec Actions projetées et passifs structurés", () => {
    const values = [...entriesById().values()];
    const specializations = values.filter(
      ({ type }) => type === "specialization",
    );
    const talents = values.filter(
      ({ system }) => system.catalog?.kind === "talent-specialization",
    );
    expect(specializations).toHaveLength(84);
    expect(talents).toHaveLength(2688);
    const expectedLevels = [
      1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 23, 25, 28, 30,
    ];
    for (const specialization of specializations) {
      const catalog = specialization.system.catalog;
      const owned = talents.filter(
        (talent) =>
          talent.system.catalog.specializationRef.relisId ===
          specialization.relisId,
      );
      expect(owned, specialization.relisId).toHaveLength(32);
      expect(catalog.talentCount, specialization.relisId).toBe(32);
      expect(catalog.talentRefs, specialization.relisId).toHaveLength(32);
      expect(catalog.talentLevels, specialization.relisId).toEqual(
        expectedLevels,
      );
      expect(catalog.automaticGrants, specialization.relisId).toEqual([]);
      expect(catalog.grantPolicy).toMatchObject({
        selectedTalentsOnly: true,
        projectOwnedActionsAutomatically: true,
        applyOwnedPassiveRulesAutomatically: true,
        duplicateActionItems: false,
      });
      for (const level of expectedLevels)
        expect(
          owned.filter((talent) => talent.system.level === level),
          `${specialization.relisId} niveau ${level}`,
        ).toHaveLength(2);
      expect(specialization.system.description).toContain(
        "trente-deux Talents",
      );
    }
    const actions = talents.filter(
      (talent) => talent.system.catalog.projection.target === "actions",
    );
    const passives = talents.filter(
      (talent) => talent.system.catalog.projection.target === "passiveRules",
    );
    expect(actions).toHaveLength(1344);
    expect(passives).toHaveLength(1344);
    for (const talent of talents) {
      expect(talent.system.catalog.ruleElements).toHaveLength(1);
      expect(talent.system.requirementRefs[0].type).toBe("specialization");
      expect(projectOwnedSpecializationTalent(talent)).not.toBeNull();
    }
  });

  it("structure les PV des douze Voies et les réserves naturelles d’Ascendance", () => {
    const entries = entriesById();
    const expectedGrowth = {
      Bretteur: 10,
      Briseur: 12,
      Tireur: 8,
      Soldat: 10,
      Médecin: 8,
      Channeler: 6,
      "Techno-mage": 8,
      Ingénieur: 8,
      Pilote: 8,
      Interfaceur: 8,
      Explorateur: 10,
      Émissaire: 8,
    };
    const paths = [...entries.values()].filter(({ type }) => type === "path");
    expect(paths).toHaveLength(12);
    for (const path of paths) {
      expect(path.system.catalog.hitPointsPerLevel, path.relisId).toBe(
        expectedGrowth[path.name],
      );
      expect(path.system.catalog.grantsHitPointsAsSecondary).toBe(false);
    }

    expect(entries.get("CRE-ANC-001-HUMAIN").system.catalog).toMatchObject({
      hitPointProfile: { mode: "fixed", value: 10 },
      energyProfiles: [{ id: "natural", prana: 4, mana: 3, flux: 0 }],
      energySelectionRequired: false,
      energyComponentsRemainSeparate: true,
    });
    expect(entries.get("CRE-ANC-012-ELFE").system.catalog).toMatchObject({
      hitPointProfile: { mode: "fixed", value: 8 },
      energyProfiles: [{ id: "natural", prana: 2, mana: 6, flux: 5 }],
    });
    expect(entries.get("CRE-ANC-013-DEMI-ELFE").system.catalog).toMatchObject({
      hitPointProfile: { mode: "fixed", value: 9 },
      energyProfiles: [
        { id: "human", prana: 3, mana: 4, flux: 2 },
        { id: "nonHuman", prana: 3, mana: 5, flux: 3 },
      ],
      energySelectionRequired: true,
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

  it("déclare les packs classés et leurs dossiers PF2e-like dans le manifeste Foundry", () => {
    const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
    expect(manifest.packs).toHaveLength(25);
    expect(manifest.packs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "creation-ancestries", type: "Item" }),
        expect.objectContaining({
          name: "creation-ancestry-journals",
          type: "JournalEntry",
        }),
        expect.objectContaining({
          name: "progression-specialization-talents",
          type: "Item",
        }),
        expect.objectContaining({
          name: "progression-ancestry-talents",
          type: "Item",
        }),
        expect.objectContaining({ name: "material-weapons", type: "Item" }),
        expect.objectContaining({ name: "material-ammunition", type: "Item" }),
      ]),
    );
    expect(manifest.packFolders).toHaveLength(3);
    expect(JSON.stringify(manifest.packFolders)).toContain("Talents");
    expect(JSON.stringify(manifest.packFolders)).toContain(
      "Combat et protection",
    );
  });
});
