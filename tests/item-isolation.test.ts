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
    const { PhysicalItemData, EquipmentData, ContainerData } =
      await import("../src/data/item-models");
    for (const Model of [PhysicalItemData, EquipmentData, ContainerData]) {
      const schema = Model.defineSchema();
      const a = schema.physical.initial(),
        b = schema.physical.initial();
      for (const key of ["bodySlots", "sizes", "natures", "hostTypes"]) {
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
  });
});
