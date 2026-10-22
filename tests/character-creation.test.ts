import { describe, expect, it } from "vitest";
import {
  CHARACTER_CREATION_STEPS,
  characterActorSource,
  createCharacterDraft,
  creationStepState,
  deriveCharacterCreation,
  secondarySpecializationCount,
  type CatalogSelection,
} from "../src/rules/character-creation";

function selection(
  name: string,
  type: string,
  relisId: string,
  catalog: Record<string, unknown>,
): CatalogSelection {
  return {
    name,
    type,
    relisId,
    packId: "relis.test",
    uuid: `Compendium.relis.test.Item.${relisId}`,
    img: "icons/svg/item-bag.svg",
    catalog,
  };
}

function completeDraft() {
  const draft = createCharacterDraft("draft-10-d3", "user-1", 1);
  draft.identity.primaryName = "Maya";
  draft.body.ancestry = selection("Esman", "ancestry", "CRE-ANC-019-ESMAN", {
    attributeBonuses: "+1 Force, +1 Vigueur, +1 Maîtrise Magique",
    attributePenalty: "-1 Volonté",
    hitPointProfile: { mode: "fixed", value: 12 },
    energyProfiles: [
      { id: "natural", label: "Profil naturel", mana: 4, prana: 6, flux: 1 },
    ],
  });
  draft.profile.profile = selection("Médecin", "profile", "CRE-PRO-MED-001", {
    standardAttributes: ["Intelligence", "Volonté", "Dextérité"],
    markedProfile:
      "+Intelligence, +Volonté ; -Force, -Présence ou -Technologie",
    skillChoices: ["Médecine", "Sciences", "Sang-froid", "Investigation"],
  });
  draft.profile.profileAttributeChoices = ["intelligence"];
  draft.profile.origin = selection(
    "Colonie scientifique",
    "origin",
    "CRE-ORI-TEST",
    {},
  );
  draft.path.path = selection("Tireur", "path", "PRO-VOI-003-TIREUR", {
    keyAttributes: ["Dextérité", "Intelligence"],
    qualifiedSkillTotal: 4,
    requiredSkills: ["Tir", "Sang-froid"],
    skillChoices: ["Discrétion", "Investigation", "Survie"],
    hitPointsPerLevel: 8,
  });
  draft.path.primarySpecialization = selection(
    "Tireur — Pistolero",
    "specialization",
    "PRO-SPE-03-02-PISTOLERO",
    { pathName: "Tireur" },
  );
  draft.attributes.pathAttribute = "dexterity";
  draft.attributes.freeIncreases = [
    "force",
    "dexterity",
    "intelligence",
    "willpower",
  ];
  draft.skills.profileChoices = ["medicine", "science"];
  draft.skills.pathChoices = ["stealth", "investigation"];
  draft.skills.freeChoices = ["engineering", "computing"];
  draft.assignments.primaryPost = selection(
    "Commandant",
    "post",
    "CRE-PST-001-COMMANDANT",
    { postTier: "primary" },
  );
  draft.assignments.secondaryPosts = [
    selection(
      "Responsable Sécurité",
      "post",
      "CRE-PST-006-RESPONSABLE-SECURITE",
      { postTier: "secondary" },
    ),
  ];
  return draft;
}

describe("assistant canonique 10-D3", () => {
  it("conserve exactement les douze étapes dans l’ordre validé", () => {
    expect(CHARACTER_CREATION_STEPS.map(({ id }) => id)).toEqual([
      "frame",
      "identity",
      "body",
      "profile",
      "path",
      "attributes",
      "skills",
      "talents",
      "resources",
      "appearance",
      "assignments",
      "review",
    ]);
  });

  it("calcule Attributs, compétences, PV et réserves depuis les catalogues", () => {
    const draft = completeDraft();
    const result = deriveCharacterCreation(draft);
    expect(result.attributes).toMatchObject({
      force: 2,
      dexterity: 2,
      vigor: 1,
      intelligence: 2,
      willpower: 0,
      magicMastery: 1,
    });
    expect(result.requiredQualifiedSkills).toBe(8);
    expect(result.qualifiedSkillCount).toBe(8);
    expect(result.hitPoints).toBe(21);
    expect(result.energyPools).toEqual([
      expect.objectContaining({ key: "mana", maximum: 4 }),
      expect.objectContaining({ key: "prana", maximum: 6 }),
      expect.objectContaining({ key: "flux", maximum: 1 }),
    ]);
    expect(result.diagnostics.filter(({ level }) => level === "error")).toEqual(
      [],
    );
  });

  it("bloque doublons de palier, mauvais choix de Voie et balance non nulle", () => {
    const draft = completeDraft();
    draft.attributes.freeIncreases = ["force", "force", "vigor"];
    draft.attributes.pathAttribute = "presence";
    draft.profile.advantages.push(
      selection("Riche", "advantage", "CRE-AVT-015-RICHE", { value: "+2" }),
    );
    const errors = deriveCharacterCreation(draft)
      .diagnostics.filter(({ level }) => level === "error")
      .map(({ message }) => message);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("quatre augmentations libres"),
        expect.stringContaining("Attribut clef"),
        expect.stringContaining("balance Atouts / Handicaps"),
      ]),
    );
    expect(creationStepState(draft, "attributes")).toBe("blocked");
  });

  it("matérialise une source Actor sans Actor partiel intermédiaire", () => {
    const draft = completeDraft();
    const source = characterActorSource(draft);
    expect(source).toMatchObject({
      name: "Maya",
      type: "character",
      ownership: { default: 0, "user-1": 3 },
      flags: { relis: { characterCreation: { draftId: "draft-10-d3" } } },
      system: {
        build: {
          ancestryRef: { relisId: "CRE-ANC-019-ESMAN" },
          pathRef: { relisId: "PRO-VOI-003-TIREUR" },
        },
        health: { hitPoints: { maximum: 21 } },
      },
    });
    expect(source.system.progression.pendingChoices.length).toBeGreaterThan(0);
    expect(
      source.flags.relis.characterCreation.selections.freeIncreases,
    ).toEqual(draft.attributes.freeIncreases);
  });

  it("applique les effets de création structurés des Atouts et exige leur valeur variable", () => {
    const draft = completeDraft();
    draft.profile.advantages.push(
      selection("Génie", "advantage", "CRE-AVT-001-GENIE", {
        value: "+3",
        creationEffects: { freeAttributeIncreases: 1, qualifiedSkills: 2 },
      }),
    );
    draft.profile.drawbacks.push(
      selection("Dette", "drawback", "CRE-HCP-006-DETTE", {
        value: "-1/-2/-3",
      }),
    );
    draft.profile.advantageAttributeChoices["CRE-AVT-001-GENIE"] = [
      "technology",
    ];
    draft.skills.freeChoices.push("athletics", "endurance");
    let result = deriveCharacterCreation(draft);
    expect(result.attributes.technology).toBe(1);
    expect(result.requiredQualifiedSkills).toBe(10);
    expect(
      result.diagnostics.some(({ message }) => message.includes("Dette")),
    ).toBe(true);
    draft.profile.drawbacks[0]!.catalog.selectedValue = -3;
    result = deriveCharacterCreation(draft);
    expect(
      result.diagnostics.some(({ message }) => message.includes("Dette")),
    ).toBe(false);
    expect(
      result.diagnostics.some(({ message }) => message.includes("balance")),
    ).toBe(false);
  });

  it("impose le Précepte de l’Humanité et refuse les branches secondaires dupliquées", () => {
    const draft = completeDraft();
    draft.body.ancestry = selection(
      "Humain",
      "ancestry",
      "CRE-ANC-001-HUMAIN",
      {
        attributeBonuses: "+1 libre, +1 libre, +1 libre",
        attributePenalty: "Aucun",
        hitPointProfile: { mode: "fixed", value: 10 },
        energyProfiles: [
          {
            id: "natural",
            label: "Profil naturel",
            mana: 3,
            prana: 4,
            flux: 0,
          },
        ],
        automaticDrawbacks: [
          {
            relisId: "CRE-HCP-001-PRECEPTE-DE-L-HUMANITE",
            label: "Précepte de l’Humanité",
            selectedValue: -1,
          },
        ],
      },
    );
    draft.body.ancestryAttributeChoices = ["force", "vigor", "presence"];
    draft.path.secondarySpecializations = [
      draft.path.primarySpecialization!,
      draft.path.primarySpecialization!,
    ];
    const errors = deriveCharacterCreation(draft).diagnostics.map(
      ({ message }) => message,
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Précepte de l’Humanité"),
        expect.stringContaining("à la fois principale et secondaire"),
      ]),
    );
  });

  it("préserve les schémas secondaires 2 / 3 / 4", () => {
    expect(secondarySpecializationCount("duo")).toBe(2);
    expect(secondarySpecializationCount("trio")).toBe(3);
    expect(secondarySpecializationCount("quartet")).toBe(4);
  });

  it("sépare strictement les quatre Postes principaux des sept secondaires", () => {
    const draft = completeDraft();
    draft.assignments.primaryPost!.catalog.postTier = "secondary";
    draft.assignments.secondaryPosts[0]!.catalog.postTier = "primary";
    const errors = deriveCharacterCreation(draft).diagnostics.map(
      ({ message }) => message,
    );
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining("quatre Postes principaux"),
        expect.stringContaining("Poste secondaire"),
      ]),
    );
  });

  it("exige les choix structurés des Atouts sans champ libre substitutif", () => {
    const draft = completeDraft();
    draft.profile.advantages.push(
      selection(
        "Prodige énergétique",
        "advantage",
        "CRE-AVT-010-PRODIGE-ENERGETIQUE",
        {
          value: "+2",
          creationChoices: [
            {
              id: "energy",
              label: "Énergie maîtrisée",
              minimum: 1,
              maximum: 1,
              options: ["Mana", "Prana", "Flux"],
            },
          ],
        },
      ),
    );
    draft.profile.drawbacks.push(
      selection("Dette", "drawback", "CRE-HCP-006-DETTE", { value: "-2" }),
    );
    expect(
      deriveCharacterCreation(draft).diagnostics.some(({ message }) =>
        message.includes("Énergie maîtrisée"),
      ),
    ).toBe(true);
    draft.profile.selectionChoices["CRE-AVT-010-PRODIGE-ENERGETIQUE:energy"] = [
      "Prana",
    ];
    expect(
      deriveCharacterCreation(draft).diagnostics.some(({ message }) =>
        message.includes("Énergie maîtrisée"),
      ),
    ).toBe(false);
  });

  it("reste une création de niveau 1 et consomme les contraintes des catalogues", () => {
    const draft = completeDraft();
    draft.frame.level = 2;
    draft.profile.advantages.push(
      selection(
        "Ma famille est en vie !",
        "advantage",
        "CRE-AVT-025-MA-FAMILLE-EST-EN-VIE",
        {
          value: "+1",
          creationConstraints: {
            requires: [
              {
                relisId: "CRE-HCP-005-FAMILLE-A-NOURRIR",
                label: "Famille à nourrir",
              },
            ],
          },
        },
      ),
    );
    draft.profile.drawbacks.push(
      selection("Dette", "drawback", "CRE-HCP-006-DETTE", {
        value: "-1",
      }),
    );
    const diagnostics = deriveCharacterCreation(draft).diagnostics;
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          step: "frame",
          message: expect.stringContaining("niveau 1"),
        }),
        expect.objectContaining({
          step: "profile",
          message: expect.stringContaining("Famille à nourrir"),
        }),
      ]),
    );
  });
});
