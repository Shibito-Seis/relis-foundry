import { describe, it, expect } from "vitest";
import {
  wearForms,
  assertProfilePermission,
  effectiveBodySlots,
} from "../src/rules/equipment-classification";
import { slotProfileErrors } from "../src/rules/equipment-slots";
import { equipmentPlan } from "../src/rules/equipment";
import {
  equipmentActions,
  equipmentOverview,
  installationTargets,
} from "../src/ui/equipment-presentation";
import { initialPhysicalState } from "../src/data/item-defaults";
const body = {
  id: "primary",
  size: "medium",
  nature: "biological",
  carrying: { hands: 2 },
};
function object(
  id: string,
  form: string,
  state = "stored",
  type = "equipment",
  extra: Record<string, any> = {},
) {
  return {
    id,
    uuid: `Actor.local.Item.${id}`,
    name: id,
    type,
    system: {
      meta: { relisId: id },
      physical: {
        ...initialPhysicalState(),
        equipState: state,
        bodyId: body.id,
        equipmentProfile: { wearForm: form, ...extra } as Record<string, any>,
      },
    },
  };
}
const equip = (items: ReturnType<typeof object>[], id: string) =>
  equipmentPlan(items, body, { itemId: id, state: "equipped" });
describe("classification et limites 0.5.6", () => {
  it("une forme remplace les anciennes cases sans propager aux autres objets", () => {
    const p = { wearForm: "bracelet", bodySlots: ["ring", "necklace"] };
    expect(effectiveBodySlots(p)).toEqual(["bracelet"]);
    expect(effectiveBodySlots({ ...p, wearForm: "ring" })).toEqual(["ring"]);
    expect(effectiveBodySlots(p)).toEqual(["bracelet"]);
    expect(
      slotProfileErrors(
        { bodySlots: ["necklace", "bracelet"] },
        "equipment",
      ).join(),
    ).toMatch(/forme unique/);
  });
  it("sépare armures, armes, sous-couche civile et formes des accessoires", () => {
    expect(Object.keys(wearForms("weapon"))).toEqual(["none", "shield"]);
    expect(wearForms("armor")).not.toHaveProperty("shield");
    expect(wearForms("equipment")).not.toHaveProperty("armor");
    for (const key of [
      "eyes",
      "face",
      "ears",
      "clothing",
      "cape",
      "gloves",
      "belt",
      "harness",
      "shoes",
      "back",
      "bag",
      "badge",
      "piercing",
    ])
      expect(wearForms("equipment")).toHaveProperty(key);
    expect(
      slotProfileErrors(
        { wearForm: "clothing", functionalCategory: "underclothing" },
        "equipment",
      ),
    ).toEqual([]);
    expect(
      slotProfileErrors({ wearForm: "armor" }, "weapon").length,
    ).toBeGreaterThan(0);
  });
  it("contrôle chaque quota, le libère et affiche le même compteur", () => {
    for (const [form, n] of [
      ["necklace", 1],
      ["bracelet", 2],
      ["ring", 10],
      ["cape", 1],
      ["belt", 1],
      ["gloves", 1],
      ["earringLeft", 1],
    ] as const) {
      const worn = Array.from({ length: n }, (_, i) =>
        object(`${i}`, form, "equipped"),
      );
      const next = object("next", form);
      const all = [...worn, next];
      expect(equip(all, "next").errors.join()).toMatch(/occupé/);
      const key = effectiveBodySlots(next.system.physical.equipmentProfile)[0];
      expect(
        equipmentOverview(all, body).entries.find((entry) => entry.key === key)
          ?.count,
      ).toBe(n);
      worn[0]!.system.physical.equipState = "stored";
      expect(equip(all, "next").errors).toEqual([]);
      worn[0]!.system.physical.equipState = "equipped";
      worn[0]!.system.physical.bodyId = "other";
      expect(equip(all, "next").errors).toEqual([]);
    }
  });
  it("la coiffe partage le casque et l’esthétique ne réserve pas de place", () => {
    const helmet = object("helmet", "helmet", "equipped", "armor"),
      coif = object("coif", "coif");
    expect(equip([helmet, coif], coif.id).errors.join()).toMatch(/Casque/);
    coif.system.physical.equipmentProfile.ornamental = true;
    expect(equip([helmet, coif], coif.id).errors).toEqual([]);
    expect(effectiveBodySlots({ wearForm: "ring", ornamental: true })).toEqual(
      [],
    );
    expect(
      slotProfileErrors(
        { wearForm: "armor", ornamental: true },
        "armor",
      ).join(),
    ).toMatch(/dispense/);
  });
  it("les piercings utilisent la capacité de leur emplacement, sans formule anatomique inventée", () => {
    const p = object("p", "piercing", "stored", "equipment", {
      piercingLocation: "nose",
    });
    expect(equip([p], p.id).errors.join()).toMatch(/capacité nulle/);
    expect(
      equipmentPlan(
        [p],
        { ...body, carrying: { accessorySlots: { piercing_nose: 1 } } },
        { itemId: p.id, state: "equipped" },
      ).errors,
    ).toEqual([]);
    expect(
      slotProfileErrors({ wearForm: "piercing" }, "equipment").join(),
    ).toMatch(/Choisir/);
  });
  it("un profil composé réserve des quantités explicites et reste réservé au MJ", () => {
    const profile = {
      wearForm: "composite",
      bodySlots: ["bracelet"],
      slotCosts: { bracelet: 2 },
    };
    const pair = object("pair", "composite", "equipped", "equipment", profile),
      next = object("next", "bracelet");
    expect(equip([pair, next], next.id).errors.join()).toMatch(/2\/2/);
    expect(
      equipmentOverview([pair], body).entries.find((e) => e.key === "bracelet")
        ?.count,
    ).toBe(2);
    expect(() => assertProfilePermission({}, profile, false)).toThrow(/MJ/);
    expect(() =>
      assertProfilePermission(
        profile,
        { ...profile, bodySlots: ["necklace"] },
        false,
      ),
    ).toThrow(/MJ/);
    expect(() =>
      assertProfilePermission(profile, structuredClone(profile), false),
    ).not.toThrow();
    expect(() => assertProfilePermission({}, profile, true)).not.toThrow();
    expect(() =>
      assertProfilePermission(
        {},
        { wearForm: "ring", ornamental: true },
        false,
      ),
    ).toThrow(/MJ/);
  });
  it("un bouclier équipé réserve ses mains sans changer d’état", () => {
    const shield = object("s", "shield", "stored", "weapon", {
      shieldHands: 1,
    });
    const plan = equip([shield], shield.id);
    expect(plan.errors).toEqual([]);
    expect(plan.patch["system.physical.equipState"]).toBe("equipped");
    Object.assign(shield.system.physical, { equipState: "equipped", hands: 1 });
    const weapon = object("w", "none", "stored", "weapon");
    expect(
      equipmentPlan([shield, weapon], body, {
        itemId: weapon.id,
        state: "held-two",
      }).errors.join(),
    ).toMatch(/Mains/);
    expect(equipmentOverview([shield], body).entries[0]?.count).toBe(1);
  });
  it("le menu donne les raisons réelles et les hôtes leurs places libres", () => {
    const a = object("a", "ring", "stored", "equipment", { sizes: ["large"] });
    expect(
      equipmentActions([a], body, a).find((e) => e.state === "equipped")
        ?.reason,
    ).toMatch(/Taille/);
    const host = object("host", "none", "stored", "weapon", {
      providedSlots: { optic: 1 },
    });
    const module = object("module", "none", "stored", "equipment", {
      installable: true,
      hostTypes: ["weapon"],
      requiredSlots: { optic: 1 },
    });
    expect(
      installationTargets([host, module], body, module)[0]?.errors,
    ).toEqual([]);
    expect(
      installationTargets([host, module], body, module)[0]?.capacity,
    ).toMatch(/1 libre/);
    host.system.physical.equipmentProfile.providedSlots.optic = 0;
    expect(
      installationTargets([host, module], body, module)[0]?.errors.join(),
    ).toMatch(/Optique/);
    expect(
      equipmentActions([host, module], body, module).find(
        (e) => e.state === "installed",
      )?.unavailable,
    ).toBe(true);
  });
});
