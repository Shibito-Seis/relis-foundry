import { afterEach, describe, expect, it, vi } from "vitest";

/** Exercise real schema initializers and in-place array commits (Foundry 14 contract).
 * This is a field-contract test, not a complete Foundry runtime emulator. */
class Field {
  constructor(public options: Record<string, any> = {}) {}
  initial(): any {
    const value = this.options.initial;
    return typeof value === "function" ? value({}) : value;
  }
}
class Schema extends Field {
  constructor(public fields: Record<string, Field>) {
    super();
  }
  initial(): any {
    return Object.fromEntries(
      Object.entries(this.fields).map(([key, field]) => [key, field.initial()]),
    );
  }
}
class ArrayField extends Field {
  constructor(
    public element: Field,
    options: Record<string, any>,
  ) {
    super(options);
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});
describe("isolation des données entre exemplaires Item", () => {
  it("chaque initialisation fournit ses propres listes, même quand le schéma est partagé", async () => {
    vi.stubGlobal("foundry", {
      abstract: { TypeDataModel: class {} },
      data: {
        fields: {
          StringField: Field,
          NumberField: Field,
          BooleanField: Field,
          HTMLField: Field,
          SchemaField: Schema,
          ArrayField,
        },
      },
    });
    const {
      PhysicalItemData,
      EquipmentData,
      ContainerData,
      WeaponData,
      ArmorData,
      ConsumableData,
      AmmunitionData,
      ResourceData,
    } = await import("../src/data/item-models");
    for (const Model of [
      PhysicalItemData,
      EquipmentData,
      ContainerData,
      WeaponData,
      ArmorData,
      ConsumableData,
      AmmunitionData,
      ResourceData,
    ]) {
      const schema = Model.defineSchema();
      const a = schema.physical.initial(),
        b = schema.physical.initial();
      for (const key of [
        "bodySlots",
        "sizes",
        "natures",
        "hostTypes",
        "interfaceIds",
        "compatibleFamilies",
        "compatibleSizes",
        "compatibleTechnologies",
        "compatibleInterfaces",
      ]) {
        expect(a.equipmentProfile[key]).not.toBe(b.equipmentProfile[key]);
        a.equipmentProfile[key].splice(
          0,
          a.equipmentProfile[key].length,
          "local",
        );
        expect(b.equipmentProfile[key]).toEqual([]);
        expect(schema.physical.initial().equipmentProfile[key]).toEqual([]);
      }
      a.equipmentProfile.providedSlots.optic = 4;
      expect(b.equipmentProfile.providedSlots.optic).toBe(0);
    }
    const expectIndependentArrays = (field: Field, keys: string[]): void => {
      const a = field.initial();
      const b = field.initial();
      for (const key of keys) {
        expect(a[key]).not.toBe(b[key]);
        a[key].push("local");
        expect(b[key]).toEqual([]);
        expect(field.initial()[key]).toEqual([]);
      }
    };
    const weaponSchema = WeaponData.defineSchema();
    expectIndependentArrays(weaponSchema.weaponProfile, [
      "damageTypes",
      "damageSources",
      "modes",
      "signatures",
      "loadSequence",
      "chamberLoad",
    ]);
    expectIndependentArrays(weaponSchema.protectionProfile, [
      "coverage",
      "layers",
      "compatibilities",
      "environmentCoverage",
      "environmentProtections",
      "barrierCompatibilities",
    ]);
    const armorSchema = ArmorData.defineSchema();
    expectIndependentArrays(armorSchema.protectionProfile, [
      "coverage",
      "layers",
      "compatibilities",
      "environmentCoverage",
      "environmentProtections",
      "barrierCompatibilities",
    ]);
    expectIndependentArrays(armorSchema.supplyProfile, [
      "loadSequence",
      "chamberLoad",
    ]);
    const equipmentSchema = EquipmentData.defineSchema();
    expectIndependentArrays(equipmentSchema.supplyProfile, [
      "loadSequence",
      "chamberLoad",
    ]);
    const consumableSchema = ConsumableData.defineSchema();
    expectIndependentArrays(consumableSchema.consumableProfile, [
      "damageTypes",
    ]);
    const ammunitionSchema = AmmunitionData.defineSchema();
    expectIndependentArrays(ammunitionSchema.ammunitionProfile, [
      "feedInterfaces",
      "damageTypes",
      "damageSources",
      "signatureModifiers",
      "specialTraits",
    ]);
    expect(weaponSchema.weaponProfile.initial().loadSequence).not.toBe(
      weaponSchema.weaponProfile.initial().loadSequence,
    );
  });
});
