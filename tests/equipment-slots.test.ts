import { describe, expect, it } from "vitest";
import {
  BODY_SLOTS,
  allowedBodySlots,
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
    type: "armor",
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
    expect(Object.keys(allowedBodySlots("armor"))).toHaveLength(6);
    expect(Object.keys(BODY_SLOTS)).toHaveLength(10);
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

describe("types et capacités d’accessoires — retour 0.5.4", () => {
  it("sépare les choix d’armes, d’armures, d’équipements et de ressources", () => {
    expect(Object.keys(allowedBodySlots("weapon"))).toEqual(["shield"]);
    expect(Object.keys(allowedBodySlots("equipment"))).toEqual([
      "necklace",
      "bracelet",
      "ring",
    ]);
    expect(allowedBodySlots("consumable")).toEqual({});
    for (const type of ["weapon", "equipment", "resource"])
      expect(slotProfileErrors({ bodySlots: ["armor"] }, type).join()).toMatch(
        /interdit/,
      );
    for (const type of ["armor", "equipment"])
      expect(slotProfileErrors({ bodySlots: ["shield"] }, type).join()).toMatch(
        /interdit/,
      );
    const weapon = {
      ...item("arme", { bodySlots: ["armor"] }),
      type: "weapon",
    };
    expect(
      equipmentPlan([weapon], body, {
        itemId: weapon.id,
        state: "held-one",
      }).errors.join(),
    ).toMatch(/interdit/);
  });
  it("autorise dix anneaux distincts, refuse le onzième et libère après rangement", () => {
    const rings = Array.from({ length: 11 }, (_, i) => ({
      ...item(`anneau-${i}`, { bodySlots: ["ring"] }),
      type: "equipment",
    }));
    for (const ring of rings.slice(0, 10)) {
      expect(equip(rings, ring.id).errors).toEqual([]);
      Object.assign(ring.system.physical, {
        equipState: "equipped",
        bodyId: body.id,
      });
    }
    expect(equip(rings, rings[10]!.id).errors.join()).toMatch(/Anneau.*10\/10/);
    rings[0]!.system.physical.equipState = "stored";
    expect(equip(rings, rings[10]!.id).errors).toEqual([]);
    expect(
      equipmentPlan(
        rings,
        { ...body, carrying: { accessorySlots: { ring: 0 } } },
        { itemId: rings[10]!.id, state: "equipped" },
      ).errors.join(),
    ).toMatch(/9\/0/);
    expect(
      equipmentPlan(
        rings,
        { ...body, id: "other" },
        { itemId: rings[10]!.id, state: "equipped" },
      ).errors,
    ).toEqual([]);
  });
  it("compte les bracelets et colliers séparément des protections", () => {
    for (const [slot, capacity] of [
      ["bracelet", 2],
      ["necklace", 1],
    ] as const) {
      const items = Array.from({ length: capacity + 1 }, (_, i) => ({
        ...item(
          String(i),
          { bodySlots: [slot] },
          i < capacity ? { equipState: "equipped", bodyId: body.id } : {},
        ),
        type: "equipment",
      }));
      expect(equip(items, String(capacity)).errors.join()).toMatch(/occupé/);
      items.push(item("protection", { bodySlots: ["arms"] }));
      expect(equip(items, "protection").errors).toEqual([]);
    }
  });
  it("un bouclier en main ou porté réserve la place de bouclier", () => {
    const a = {
      ...item(
        "bouclier",
        { bodySlots: ["shield"] },
        { equipState: "readied", hands: 1, bodyId: body.id },
      ),
      type: "weapon",
    };
    const b = { ...item("autre", { bodySlots: ["shield"] }), type: "weapon" };
    expect(equip([a, b], b.id).errors.join()).toMatch(/Bouclier porté.*occupé/);
    a.system.physical.equipState = "stored";
    expect(equip([a, b], b.id).errors).toEqual([]);
  });
});
