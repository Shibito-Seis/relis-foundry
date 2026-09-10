import { describe, expect, it } from "vitest";
import {
  buildOwnedItemSystem,
  createWorldItemId,
  isPhysicalItemType,
  normalizeItemSystem,
  physicalTotals,
} from "../src/data/item-defaults";

const ULID_A = "01J00000000000000000000000";
const ULID_B = "01J00000000000000000000001";

describe("noyau commun des Items 10-E1-P", () => {
  it("attribue un identifiant de monde sans inventer une source", () => {
    const system = normalizeItemSystem({}, false, () => ULID_A);
    expect(system.meta.relisId).toBe(createWorldItemId(() => ULID_A));
    expect(system.meta.sourceRef.relisId).toBe("");
    expect(system.meta.sourceVersion).toBe("");
    expect(system.provenance.upgradeState).toBe("unknown");
    expect(system.traits).toEqual([]);
  });

  it("est idempotent lorsque l’identifiant existe déjà", () => {
    const first = normalizeItemSystem(
      { meta: { relisId: `WLD-ITM-${ULID_A}` } },
      false,
      () => ULID_B,
    );
    const second = normalizeItemSystem(first, false, () => {
      throw new Error("aucun nouvel identifiant attendu");
    });
    expect(second).toEqual(first);
  });

  it("préserve les valeurs physiques 10-C et complète leur état", () => {
    const system = normalizeItemSystem(
      {
        physical: {
          quantity: 3,
          massEach: 1.5,
          bulkEach: 2,
          equipState: "carried",
          condition: "worn",
        },
      },
      true,
      () => ULID_A,
    );
    expect(system.physical).toMatchObject({
      quantity: 3,
      unit: "count",
      massEach: 1.5,
      volumeEach: null,
      bulkEach: 2,
      equipState: "carried",
      condition: "worn",
      wear: 0,
      identified: true,
    });
    expect(physicalTotals(system.physical)).toEqual({
      mass: 4.5,
      volume: null,
      bulk: 6,
    });
  });

  it("sépare qualité, état et usure et borne les registres", () => {
    const system = normalizeItemSystem(
      {
        quality: 9,
        rarity: 12,
        legality: "regulated",
        physical: { condition: "damaged", wear: 8 },
      },
      true,
      () => ULID_A,
    );
    expect(system.quality).toBe(5);
    expect(system.rarity).toBe(6);
    expect(system.legality).toBe("regulated");
    expect(system.physical.condition).toBe("damaged");
    expect(system.physical.wear).toBe(6);
  });

  it("distingue le prix de référence des futurs devis", () => {
    const system = normalizeItemSystem(
      {
        referencePrice: {
          amount: 125,
          unit: "pièce",
          quantityBasis: 2,
          currencyRef: { relisId: "CUR-credit" },
        },
      },
      false,
      () => ULID_A,
    );
    expect(system.referencePrice).toMatchObject({
      amount: 125,
      unit: "pièce",
      quantityBasis: 2,
      currencyRef: { relisId: "CUR-credit" },
    });
    expect(system).not.toHaveProperty("priceQuote");
  });

  it("fabrique des exemplaires indépendants liés à la même source", () => {
    const source = {
      meta: {
        relisId: "UTL-source",
        contentVersion: "4.2.0",
      },
      description: "Instantané jouable",
    };
    const first = buildOwnedItemSystem(
      source,
      "Compendium.relis.items.Item.source",
      "Source",
      "equipment",
      true,
      () => ULID_A,
    );
    const second = buildOwnedItemSystem(
      source,
      "Compendium.relis.items.Item.source",
      "Source",
      "equipment",
      true,
      () => ULID_B,
    );
    expect(first.meta.relisId).not.toBe(second.meta.relisId);
    expect(first.meta.sourceRef.relisId).toBe("UTL-source");
    expect(first.meta.sourceVersion).toBe("4.2.0");
    expect(first.provenance.localRevision).toBe(0);
    expect(source.meta.relisId).toBe("UTL-source");
  });

  it("limite l’état physique aux sept familles personnelles prévues", () => {
    expect(isPhysicalItemType("weapon")).toBe(true);
    expect(isPhysicalItemType("container")).toBe(true);
    expect(isPhysicalItemType("ancestry")).toBe(false);
    expect(isPhysicalItemType("action")).toBe(false);
  });
});
