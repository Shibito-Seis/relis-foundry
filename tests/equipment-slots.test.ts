import { describe, expect, it } from "vitest";
import {
  BODY_SLOTS,
  slotSummary,
  slotProfileErrors,
  technicalUsage,
} from "../src/rules/equipment-slots";
import { equipmentPlan, projectEquipment } from "../src/rules/equipment";
import { initialPhysicalState } from "../src/data/item-defaults";
import type { InventoryItemLike } from "../src/rules/inventory";
const body = {
  id: "primary",
  size: "medium",
  nature: "biological",
  carrying: { hands: 2 },
};
function item(
  id: string,
  profile: Record<string, any> = {},
  physical: Record<string, any> = {},
): InventoryItemLike {
  return {
    id,
    uuid: `Actor.test.Item.${id}`,
    name: id,
    type: "equipment",
    system: {
      meta: { relisId: id },
      physical: {
        ...initialPhysicalState(),
        equipmentProfile: profile,
        ...physical,
      },
    },
  };
}
const equip = (items: InventoryItemLike[], id: string) =>
  equipmentPlan(items, body, { itemId: id, state: "equipped" });
describe("emplacements canoniques — Bible 41.137, 41.145, 41.146 et 41.53", () => {
  it("définit les sept emplacements indépendamment des zones protégées", () => {
    expect(Object.keys(BODY_SLOTS)).toHaveLength(7);
    expect(slotSummary({ bodySlots: ["underlayer", "armor"] })).toBe(
      "Sous-couche corporelle + Armure principale",
    );
  });
  it("autorise sous-casque et casque mais refuse deux casques", () => {
    const a = item(
      "casque",
      { bodySlots: ["helmet"] },
      { equipState: "equipped", bodyId: body.id },
    );
    expect(
      equip([a, item("dessous", { bodySlots: ["underhelmet"] })], "dessous")
        .errors,
    ).toEqual([]);
    expect(
      equip(
        [a, item("autre", { bodySlots: ["helmet"] })],
        "autre",
      ).errors.join(),
    ).toMatch(/Casque principal.*casque/);
  });
  it("refuse les occupations partielles d’une EVA ou d’un ensemble de membres", () => {
    for (const slots of [
      ["underlayer", "armor"],
      ["arms", "legs"],
    ]) {
      const a = item(
        "pièce",
        { bodySlots: [slots[1]] },
        { equipState: "equipped", bodyId: body.id },
      );
      expect(
        equip(
          [a, item("ensemble", { bodySlots: slots })],
          "ensemble",
        ).errors.join(),
      ).toMatch(/occupé/);
    }
  });
  it("sépare les corps et ne réserve pas les emplacements des objets rangés", () => {
    const a = item(
      "autre corps",
      { bodySlots: ["armor"] },
      { equipState: "equipped", bodyId: "other" },
    );
    const b = item("rangé", { bodySlots: ["armor"] });
    expect(equip([a, b], "rangé").errors).toEqual([]);
  });
  it("refuse l’inconnu et conserve l’ancien texte sans le deviner", () => {
    const a = item("ancien", { slot: "torse" });
    expect(equip([a], a.id).errors.join()).toMatch(/reconfigurer/);
    expect(a.system.physical.equipmentProfile.slot).toBe("torse");
    expect(
      equip([item("x", { bodySlots: ["inventé"] })], "x").errors.join(),
    ).toMatch(/inconnu/);
  });
  it("permet une confirmation explicite sans emplacement en conservant l’ancien champ", () => {
    const a = item("ancien", {
      slot: "torse",
      slotsConfigured: true,
      bodySlots: [],
    });
    expect(equip([a], a.id).errors).toEqual([]);
  });
  it("simule les occupations cumulées et libère avant d’appliquer un ensemble", () => {
    const items = [
      item("a", { bodySlots: ["armor"] }),
      item("b", { bodySlots: ["armor"] }),
    ];
    const requests = items.map((i) => ({ itemId: i.id, state: "equipped" }));
    expect(projectEquipment(items, body, requests).updates).toEqual([]);
    expect(projectEquipment(items, body, requests, true).updates).toHaveLength(
      1,
    );
    items[0]!.system.physical.equipState = "equipped";
    expect(
      projectEquipment(items, body, [
        { itemId: "b", state: "equipped" },
        { itemId: "a", state: "stored" },
      ]).failed,
    ).toBe(false);
  });
  it("compte les modules par hôte, avec référence stable, sans compter deux fois le même module", () => {
    const host = item("hôte", { providedSlots: { utility: 3, optic: 1 } });
    const mounted = item(
      "monté",
      { requiredSlots: { utility: 2 } },
      { equipState: "installed", hostRef: { relisId: host.id } },
    );
    const module = item("nouveau", {
      installable: true,
      requiredSlots: { utility: 2, optic: 1 },
    });
    const plan = () =>
      equipmentPlan([host, mounted, module], body, {
        itemId: module.id,
        state: "installed",
        hostId: host.id,
      });
    expect(plan().errors.join()).toMatch(
      /Utilitaire.*2 requis.*2 occupé.*3 disponible/,
    );
    module.system.physical.equipmentProfile.requiredSlots.utility = 1;
    expect(plan().errors).toEqual([]);
    expect(technicalUsage([host, mounted], host)).toEqual({ utility: 2 });
    mounted.system.physical.equipmentProfile.installable = true;
    expect(
      equipmentPlan([host, mounted], body, {
        itemId: mounted.id,
        state: "installed",
        hostId: host.id,
      }).errors,
    ).toEqual([]);
  });
  it("refuse un type absent, une capacité négative ou fractionnaire", () => {
    const host = item("h", { providedSlots: { optic: 0 } }),
      module = item("m", { installable: true, requiredSlots: { optic: 1 } });
    expect(
      equipmentPlan([host, module], body, {
        itemId: "m",
        state: "installed",
        hostId: "h",
      }).errors.join(),
    ).toMatch(/Optique/);
    expect(slotProfileErrors({ providedSlots: { optic: -1 } })).not.toEqual([]);
    expect(slotProfileErrors({ requiredSlots: { optic: 0.5 } })).not.toEqual(
      [],
    );
  });
  it("ne confond pas les capacités de deux hôtes", () => {
    const host = item("h", { providedSlots: { optic: 1 } }),
      other = item("autre", { providedSlots: { optic: 1 } });
    const mounted = item(
      "monté",
      { requiredSlots: { optic: 1 } },
      { equipState: "installed", hostRef: { relisId: other.id } },
    );
    const module = item("m", {
      installable: true,
      requiredSlots: { optic: 1 },
    });
    expect(
      equipmentPlan([host, other, mounted, module], body, {
        itemId: "m",
        state: "installed",
        hostId: "h",
      }).errors,
    ).toEqual([]);
  });
});
