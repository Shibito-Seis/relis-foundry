import { describe, expect, it } from "vitest";
import {
  collectOwnedTalentProjections,
  projectOwnedSpecializationTalent,
} from "../src/rules/talent-projection";

function talent(
  id: string,
  target: "actions" | "passiveRules",
  kind: "oneAction" | "passive",
) {
  return {
    id,
    name: `Talent ${id}`,
    type: "talent",
    system: {
      catalog: {
        kind: "talent-specialization",
        specializationRef: { relisId: "PRO-SPE-01-01-FORME-EQUILIBREE" },
        activation: { kind, actions: kind === "passive" ? 0 : 1 },
        projection: {
          automaticWhenOwned: true,
          target,
          duplicateItem: false,
          source: "ownedTalent",
        },
        ruleElements: [
          {
            key: kind === "passive" ? "penaltyReduction" : "temporaryModifier",
            selector: "skill.melee",
            mode: "upgrade",
            value: 1,
          },
        ],
      },
    },
  };
}

describe("projection des Talents de Spécialisation possédés", () => {
  it("projette une technique active sans créer un deuxième Item", () => {
    const source = talent("active-1", "actions", "oneAction");
    expect(projectOwnedSpecializationTalent(source)).toEqual({
      action: expect.objectContaining({
        sourceId: "active-1",
        sourceName: "Talent active-1",
        specializationId: "PRO-SPE-01-01-FORME-EQUILIBREE",
        activation: expect.objectContaining({ kind: "oneAction", actions: 1 }),
      }),
      passive: null,
    });
  });

  it("projette séparément les règles passives structurées", () => {
    const source = talent("passive-1", "passiveRules", "passive");
    expect(projectOwnedSpecializationTalent(source)).toEqual({
      action: null,
      passive: expect.objectContaining({
        sourceId: "passive-1",
        ruleElements: [
          expect.objectContaining({
            key: "penaltyReduction",
            selector: "skill.melee",
            mode: "upgrade",
            value: 1,
          }),
        ],
      }),
    });
  });

  it("refuse une projection incohérente et sépare les deux flux", () => {
    const invalid = talent("invalid", "actions", "passive");
    expect(projectOwnedSpecializationTalent(invalid)).toBeNull();
    const result = collectOwnedTalentProjections([
      talent("active", "actions", "oneAction"),
      talent("passive", "passiveRules", "passive"),
      invalid,
      { id: "weapon", type: "weapon", system: {} },
    ]);
    expect(result.actions).toHaveLength(1);
    expect(result.passives).toHaveLength(1);
  });
});
