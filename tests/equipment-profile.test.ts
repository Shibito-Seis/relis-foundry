import { describe, expect, it } from "vitest";
import {
  equipmentProfileGroups,
  equipmentProfileUpdate,
} from "../src/ui/equipment-profile";
import { equipmentPlan } from "../src/rules/equipment";
import { initialPhysicalState } from "../src/data/item-defaults";

function form(profile: Record<string, any>): ParentNode {
  const groups = equipmentProfileGroups(profile);
  return {
    querySelectorAll(selector: string) {
      if (selector === "[data-profile-field]") return [];
      const group = groups.find(
        (group) => selector === `[data-profile-list="${group.key}"]`,
      );
      return group?.choices ?? [];
    },
  } as unknown as ParentNode;
}

describe("propriétés d’équipement dans la fiche Item", () => {
  it("restaure les choix enregistrés et préserve les valeurs personnalisées", () => {
    const groups = equipmentProfileGroups({ sizes: ["medium", "custom"] });
    expect(
      groups[0]?.choices
        .filter((choice) => choice.checked)
        .map((choice) => choice.value),
    ).toEqual(["medium", "custom"]);
    expect(groups[0]?.count).toBe(2);
  });
  it("enregistre le retrait du dernier choix par une liste vide explicite", () => {
    const update = equipmentProfileUpdate(form({}));
    expect(update["system.physical.equipmentProfile.sizes"]).toEqual([]);
    expect(update["system.physical.equipmentProfile.natures"]).toEqual([]);
    expect(update["system.physical.equipmentProfile.hostTypes"]).toEqual([]);
    expect(Object.keys(update)).toHaveLength(3);
  });
  it("relit les cases après plusieurs remplacements et refuse toutes tailles sauf Moyen", () => {
    const body = {
      id: "primary",
      size: "medium",
      nature: "biological",
      carrying: { hands: 2, loaded: 10, overloaded: 20 },
    };
    const object = {
      id: "test",
      type: "armor",
      name: "Test local",
      system: { meta: { relisId: "test" }, physical: initialPhysicalState() },
    };
    for (const [sizes, permitted] of [
      [["medium"], true],
      [["large"], false],
      [["tiny", "small", "large", "huge", "gargantuan"], false],
      [[], true],
    ] as [string[], boolean][]) {
      const patch = equipmentProfileUpdate(form({ sizes }));
      object.system.physical.equipmentProfile.sizes = patch[
        "system.physical.equipmentProfile.sizes"
      ] as string[];
      const reopened = equipmentProfileGroups(
        object.system.physical.equipmentProfile,
      );
      expect(
        reopened[0]?.choices
          .filter((choice) => choice.checked)
          .map((choice) => choice.value),
      ).toEqual(sizes);
      const plan = equipmentPlan([object], body, {
        itemId: "test",
        state: "equipped",
      });
      expect(plan.errors.length === 0).toBe(permitted);
      if (!permitted) expect(plan.errors.join()).toMatch(/taille/i);
    }
  });
});
