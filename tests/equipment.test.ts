import { describe, expect, it } from "vitest";
import {
  carriedMass,
  equipmentPlan,
  equipmentFailureMessage,
  equipmentState,
  equipmentStates,
  projectEquipment,
} from "../src/rules/equipment";
import { physicalUnitMass } from "../src/rules/physical-mass";
import {
  presentInventory,
  canMergeStacks,
  validateStackSplit,
  type InventoryItemLike,
} from "../src/rules/inventory";
import {
  buildOwnedItemSystem,
  initialPhysicalState,
} from "../src/data/item-defaults";

const body = {
  id: "primary",
  name: "Corps de test",
  size: "medium",
  nature: "biological",
  carrying: { hands: 2, loaded: 10, overloaded: 20 },
};
function item(
  id: string,
  physical: Record<string, any> = {},
  type = "weapon",
): InventoryItemLike {
  return {
    id,
    uuid: `Actor.a.Item.${id}`,
    name: id,
    type,
    system: {
      meta: { relisId: id },
      physical: { ...initialPhysicalState(), massEach: 1, ...physical },
    },
  };
}
function held(id: string, hands = 1) {
  return item(id, { equipState: "readied", hands, bodyId: "primary" });
}

describe("10-E3-P — équipement personnel", () => {
  it("propose les états contextuels et préserve l’ancien état sans inventer les mains", () => {
    expect(equipmentStates(item("a"))).toContain("held-two");
    expect(equipmentStates(item("a", {}, "armor"))).not.toContain("held-two");
    expect(equipmentStates(item("a", {}, "consumable"))).not.toContain(
      "equipped",
    );
    expect(equipmentState(item("old", { equipState: "readied" }))).toBe(
      "readied",
    );
  });
  it("refuse deux mains occupées et permet une libération avant acquisition", () => {
    const items = [held("a"), held("b"), item("c")];
    expect(
      equipmentPlan(items, body, {
        itemId: "c",
        state: "held-one",
      }).errors.join(),
    ).toMatch(/Mains/);
    const projection = projectEquipment(items, body, [
      { itemId: "c", state: "held-two" },
      { itemId: "a", state: "stored" },
      { itemId: "b", state: "stored" },
    ]);
    expect(projection.failed).toBe(false);
    expect(projection.updates).toHaveLength(3);
  });
  it("ne suppose jamais deux mains quand le corps ne les fournit pas", () => {
    expect(
      equipmentPlan(
        [item("a")],
        { ...body, carrying: {} },
        { itemId: "a", state: "held-one" },
      ).errors.join(),
    ).toMatch(/non renseigné/);
    expect(
      equipmentPlan(
        [item("a")],
        { ...body, carrying: { hands: 0 } },
        { itemId: "a", state: "held-one" },
      ).errors.join(),
    ).toMatch(/insuffisantes/);
  });
  it("refuse les piles, pièces brisées, incompatibilités et conflits de slot", () => {
    for (const physical of [
      { quantity: 2 },
      { condition: "broken" },
      { equipmentProfile: { sizes: ["small"] } },
      { equipmentProfile: { natures: ["synthetic"] } },
    ]) {
      expect(
        equipmentPlan([item("a", physical)], body, {
          itemId: "a",
          state: "held-one",
        }).errors.length,
      ).toBeGreaterThan(0);
    }
    const armor = item(
      "armor",
      {
        equipState: "equipped",
        bodyId: body.id,
        equipmentProfile: { slot: "torso" },
      },
      "armor",
    );
    expect(
      equipmentPlan(
        [armor, item("b", { equipmentProfile: { slot: "torso" } }, "armor")],
        body,
        { itemId: "b", state: "equipped" },
      ).errors.join(),
    ).toMatch(/occupé/);
  });
  it("respecte les accès hérités, les corps et les transferts en cours", () => {
    const bag = item("bag", {}, "container");
    bag.system.accessRule = "sealed";
    const inside = item("inside", { containerRef: { relisId: "bag" } });
    expect(
      equipmentPlan([bag, inside], body, {
        itemId: "inside",
        state: "carried",
      }).errors.join(),
    ).toMatch(/indisponible/);
    bag.system.accessRule = "normal";
    bag.system.physical.equipState = "ground";
    expect(
      equipmentPlan([bag, inside], body, {
        itemId: "inside",
        state: "carried",
      }).errors.join(),
    ).toMatch(/conteneur au sol/);
    expect(
      equipmentPlan([item("other", { bodyId: "other" })], body, {
        itemId: "other",
        state: "carried",
      }).errors.join(),
    ).toMatch(/autre corps/);
    const pending = item("pending");
    pending.flags = { relis: { inventoryTransfer: { state: "quarantined" } } };
    expect(
      equipmentPlan([pending], body, {
        itemId: "pending",
        state: "carried",
      }).errors.join(),
    ).toMatch(/indisponible/);
  });
  it("sort du conteneur explicitement et garde l’état distinct de l’emplacement", () => {
    const bag = item("bag", {}, "container");
    const object = item("o", { containerRef: { relisId: "bag" } });
    const plan = equipmentPlan([bag, object], body, {
      itemId: "o",
      state: "held-one",
    });
    expect(plan.errors).toEqual([]);
    expect(plan.patch["system.physical.containerRef"]).toMatchObject({
      relisId: "",
    });
    expect(plan.patch["system.physical.hands"]).toBe(1);
    expect(plan.warnings.join()).toMatch(/sorti de son conteneur/);
    expect(
      equipmentPlan([bag, object], body, { itemId: "o", state: "stored" })
        .patch,
    ).not.toHaveProperty("system.physical.containerRef");
  });
  it("valide l’installation et interdit les cycles mixtes hôte/conteneur", () => {
    const host = item("host", {}, "container");
    const module = item(
      "module",
      {
        equipmentProfile: {
          installable: true,
          hostTypes: ["container"],
          slot: "rail",
        },
      },
      "equipment",
    );
    expect(
      equipmentPlan([host, module], body, {
        itemId: "module",
        state: "installed",
        hostId: "host",
      }).errors,
    ).toEqual([]);
    host.system.physical.containerRef = { relisId: "module" };
    module.type = "container";
    expect(
      equipmentPlan([host, module], body, {
        itemId: "module",
        state: "installed",
        hostId: "host",
      }).errors.join(),
    ).toMatch(/Cycle/);
    host.system.physical.containerRef = {};
    host.system.physical.bodyId = "other";
    expect(
      equipmentPlan([host, module], body, {
        itemId: "module",
        state: "installed",
        hostId: "host",
      }).errors.join(),
    ).toMatch(/autre corps|hors de portée/);
  });
  it("refuse un ensemble strict incomplet et expose les écarts en mode assisté", () => {
    const requests = [
      { itemId: "a", state: "carried" },
      { itemId: "missing", state: "equipped" },
    ];
    expect(projectEquipment([item("a")], body, requests).updates).toEqual([]);
    const assisted = projectEquipment([item("a")], body, requests, true);
    expect(assisted.updates).toHaveLength(1);
    expect(assisted.rows[1]!.errors).toEqual(["Item absent."]);
  });
  it("préserve les temps déclarés sans inventer de coût et ne modifie pas la source d’aperçu", () => {
    const items = [
      item("a", { equipmentProfile: { duration: "2 actions, aide requise" } }),
    ];
    const before = JSON.stringify(items);
    expect(
      projectEquipment(items, body, [{ itemId: "a", state: "held-one" }])
        .rows[0]!.duration,
    ).toBe("2 actions, aide requise");
    expect(JSON.stringify(items)).toBe(before);
  });
  it("interdit les piles actives et réinitialise les attaches lors d’une copie", () => {
    expect(validateStackSplit(held("a"), 0.5).join()).toMatch(/Ranger/);
    expect(canMergeStacks(held("a"), held("b"))).toBe(false);
    const copy = buildOwnedItemSystem(
      held("a").system,
      "",
      "copie",
      "weapon",
      true,
    );
    expect(copy.physical).toMatchObject({
      bodyId: "",
      hands: 0,
      equipState: "stored",
    });
  });
});

describe("10-E3-P — charge en kilogrammes", () => {
  it("compte chaque pièce une seule fois et retire tout un conteneur posé au sol", () => {
    const bag = item("bag", { massEach: 2 }, "container");
    const contents = item("c", {
      quantity: 3,
      massEach: 0.5,
      containerRef: { relisId: "bag" },
    });
    expect(carriedMass([bag, contents], body).mass).toBe(3.5);
    bag.system.physical.equipState = "ground";
    expect(carriedMass([bag, contents], body).mass).toBe(0);
  });
  it("suit l’hôte installé, le corps et les pièces absentes sans boucler", () => {
    const host = item("h", { massEach: 3 });
    const module = item("m", {
      massEach: 2,
      equipState: "installed",
      hostRef: { uuid: host.uuid },
    });
    expect(carriedMass([host, module], body).mass).toBe(5);
    host.system.physical.equipState = "ground";
    expect(carriedMass([host, module], body).mass).toBe(0);
    host.system.physical.equipState = "carried";
    host.system.physical.bodyId = "other";
    expect(carriedMass([host, module], body).mass).toBe(0);
    expect(carriedMass([module], body).missing).toBe(1);
    host.system.physical.bodyId = "";
    host.system.physical.hostRef = { uuid: module.uuid };
    expect(carriedMass([host, module], body).missing).toBe(2);
  });
  it("convertit les unités massiques et les liquides ordinaires, sans convertir tous les volumes", () => {
    expect(physicalUnitMass({ unit: "g" })).toBe(0.001);
    expect(physicalUnitMass({ unit: "l" })).toBeNull();
    const liquid = item(
      "water",
      {
        unit: "ml",
        quantity: 10,
        massEach: null,
        equipmentProfile: { ordinaryLiquid: true },
      },
      "resource",
    );
    expect(carriedMass([liquid], body).mass).toBe(0.01);
    expect(presentInventory([liquid]).totalLoad.mass).toBe(0.01);
    liquid.system.physical.massEach = 0.002;
    expect(carriedMass([liquid], body).mass).toBe(0.02);
  });
  it("conserve les masses connues et ne fabrique pas de pourcentage sans seuil", () => {
    const rows = [
      item("known", { massEach: 18 }),
      item("unknown", { massEach: null }),
    ];
    expect(carriedMass(rows, { id: "primary" })).toMatchObject({
      mass: 18,
      missing: 1,
      defined: false,
      percent: 0,
    });
    expect(carriedMass(rows, body)).toMatchObject({
      mass: 18,
      missing: 1,
      status: "Chargé",
    });
  });
  it("applique les frontières exactes et borne la barre sans cacher la masse réelle", () => {
    expect(carriedMass([item("a", { massEach: 10 })], body).status).toBe(
      "Chargé",
    );
    expect(carriedMass([item("a", { massEach: 20 })], body).status).toBe(
      "Surchargé",
    );
    expect(carriedMass([item("a", { massEach: 21 })], body)).toMatchObject({
      mass: 21,
      percent: 100,
      meterValue: 20,
    });
  });
});

describe("retours de recette 0.5.3", () => {
  it("ne propose plus Porté sur soi et conserve les anciens exemplaires et ensembles", () => {
    for (const type of [
      "weapon",
      "armor",
      "equipment",
      "consumable",
      "resource",
      "container",
      "ammunition",
    ]) {
      const object = item("legacy", { equipState: "carried" }, type);
      expect(equipmentStates(object)).not.toContain("carried");
      expect(equipmentStates(object)[0]).toBe("stored");
      expect(equipmentState(object)).toBe("stored");
      expect(object.system.physical.equipState).toBe("carried");
      const plan = equipmentPlan([object], body, {
        itemId: object.id,
        state: "carried",
      });
      expect(plan.errors).toEqual([]);
      expect(plan.patch["system.physical.equipState"]).toBe("stored");
    }
  });
  it("explique un manque de mains et une taille incompatible avec le nom de chaque objet", () => {
    const projection = projectEquipment(
      [
        held("arme déjà tenue"),
        item("arme à deux mains"),
        item(
          "armure trop grande",
          { equipmentProfile: { sizes: ["large"] } },
          "armor",
        ),
      ],
      body,
      [
        { itemId: "arme à deux mains", state: "held-two" },
        { itemId: "armure trop grande", state: "equipped" },
      ],
    );
    const message = equipmentFailureMessage(projection);
    expect(message).toMatch(/Équipement refusé/);
    expect(message).toMatch(/arme à deux mains.*Mains/);
    expect(message).toMatch(/armure trop grande.*taille/i);
    expect(projection.updates).toEqual([]);
  });
});
