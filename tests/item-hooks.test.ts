import { describe, expect, it, vi } from "vitest";
import {
  constrainPhysicalItemUpdate,
  migrateItemCore,
  preventUnsafeContainerDeletion,
  prepareItemCreation,
  protectEquipmentUpdate,
  trackLocalItemUpdate,
} from "../src/hooks/items";

describe("cycle de vie des exemplaires Item", () => {
  it("protège les états équipés hors du service et les suppressions d’hôtes attachés", () => {
    (globalThis as any).ui = { notifications: { warn: vi.fn() } };
    const item = {
      id: "host",
      uuid: "Actor.a.Item.host",
      type: "weapon",
      parent: {
        items: [
          { system: { physical: { hostRef: { uuid: "Actor.a.Item.host" } } } },
        ],
      },
      system: {
        physical: {
          equipState: "readied",
          hands: 2,
          quantity: 1,
          unit: "count",
        },
      },
    } as unknown as Item;
    expect(
      protectEquipmentUpdate(item, {
        "system.physical.equipState": "equipped",
      }),
    ).toBe(false);
    expect(
      protectEquipmentUpdate(
        item,
        { "system.physical.equipState": "stored" },
        { relisInventoryOperation: true },
      ),
    ).toBeUndefined();
    expect(
      protectEquipmentUpdate(item, { "system.physical.quantity": 2 }),
    ).toBe(false);
    expect(preventUnsafeContainerDeletion(item)).toBe(false);
  });
  it("change l’identifiant d’une copie possédée et conserve sa source", () => {
    const updateSource = vi.fn();
    const item = {
      name: "Copie",
      type: "equipment",
      parent: {},
      system: {},
      updateSource,
    } as unknown as Item;
    prepareItemCreation(item, {
      name: "Module source",
      type: "equipment",
      system: {
        meta: { relisId: "UTL-source", contentVersion: "2.0.0" },
        physical: { quantity: 1 },
      },
      _stats: { compendiumSource: "Compendium.relis.items.Item.source" },
    });
    const created = updateSource.mock.calls[0]?.[0]?.system;
    expect(created.meta.relisId).toMatch(/^WLD-ITM-/u);
    expect(created.meta.sourceRef).toMatchObject({
      relisId: "UTL-source",
      uuid: "Compendium.relis.items.Item.source",
      labelSnapshot: "Module source",
    });
    expect(created.meta.sourceVersion).toBe("2.0.0");
  });

  it("trace une modification locale sans toucher au lien source", () => {
    const change: Record<string, any> = {
      "system.physical.condition": "damaged",
    };
    const item = {
      parent: {},
      system: {
        meta: { sourceRef: { relisId: "UTL-source" } },
        provenance: {
          localRevision: 2,
          manualOverrides: ["system.physical.wear"],
        },
      },
    } as unknown as Item;
    trackLocalItemUpdate(item, change);
    expect(change["system.provenance.localRevision"]).toBe(3);
    expect(change["system.provenance.manualOverrides"]).toEqual([
      "system.physical.condition",
      "system.physical.wear",
    ]);
    expect(change["system.provenance.upgradeState"]).toBe("locallyModified");
    expect(change).not.toHaveProperty("system.meta.sourceRef");
  });

  it("ignore les migrations et les sources non embarquées", () => {
    const migrationChange: Record<string, any> = { system: { quality: 2 } };
    const sourceItem = {
      parent: null,
      system: { provenance: { localRevision: 0 } },
    } as unknown as Item;
    trackLocalItemUpdate(sourceItem, migrationChange, { relisMigration: true });
    expect(migrationChange).toEqual({ system: { quality: 2 } });
  });

  it("rend entière une quantité comptée mais conserve les mesures fractionnaires", () => {
    const item = {
      type: "equipment",
      system: { physical: { unit: "count", quantity: 1 } },
    } as unknown as Item;
    const counted: Record<string, any> = {
      "system.physical.quantity": 2.8,
    };
    constrainPhysicalItemUpdate(item, counted);
    expect(counted["system.physical.quantity"]).toBe(2);

    const measured: Record<string, any> = {
      "system.physical.unit": "kg",
      "system.physical.quantity": 2.8,
    };
    constrainPhysicalItemUpdate(item, measured);
    expect(measured["system.physical.quantity"]).toBe(2.8);

    item.system.physical.containerRef = { relisId: "WLD-bag" };
    const relocated: Record<string, any> = {
      "system.physical.locationKey": "actor-cargo",
    };
    constrainPhysicalItemUpdate(item, relocated);
    expect(relocated["system.physical.containerRef"]).toMatchObject({
      relisId: "",
      uuid: "",
    });
  });

  it("refuse la suppression brute d’un conteneur non vide", () => {
    const warn = vi.fn();
    (globalThis as any).ui = { notifications: { warn } };
    const container = {
      id: "bag",
      name: "Sac",
      type: "container",
      uuid: "Actor.a.Item.bag",
      system: { meta: { relisId: "WLD-bag" } },
      parent: { items: [] as any[] },
    } as unknown as Item;
    const content = {
      id: "tool",
      system: { physical: { containerRef: { relisId: "WLD-bag" } } },
    } as unknown as Item;
    (container.parent as Actor).items = [container, content];
    expect(preventUnsafeContainerDeletion(container)).toBe(false);
    expect(warn).toHaveBeenCalledOnce();
    expect(
      preventUnsafeContainerDeletion(container, {
        relisInventoryOperation: true,
      }),
    ).toBeUndefined();
  });

  it("migre une seule fois les Items du monde et les Items embarqués", async () => {
    const setting = {
      packageVersion: "0.2.4",
      state: "idle",
      lastMigrationId: null as string | null,
      errors: [] as string[],
    };
    const makeItem = (type: string, system: Record<string, any>) => ({
      type,
      system,
      toObject: () => ({ system }),
      update: vi.fn(async () => undefined),
    });
    const worldItem = makeItem("ancestry", {
      meta: { relisId: "" },
      description: "conservée",
    });
    const embeddedItem = makeItem("equipment", {
      physical: { quantity: 2, massEach: 3 },
    });
    (globalThis as any).game = {
      user: { isGM: true },
      items: { contents: [worldItem] },
      actors: { contents: [{ items: [embeddedItem] }] },
      settings: {
        get: () => setting,
        set: vi.fn(async (_system: string, _key: string, value: any) => {
          Object.assign(setting, value);
        }),
      },
    };
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await expect(migrateItemCore()).resolves.toBe(2);
    const migratedWorld = (worldItem.update as any).mock.calls[0][0].system;
    const migratedEmbedded = (embeddedItem.update as any).mock.calls[0][0]
      .system;
    expect(migratedWorld.description).toBe("conservée");
    expect(migratedWorld.meta.relisId).toMatch(/^WLD-ITM-/u);
    expect(migratedWorld.meta.sourceRef.relisId).toBe("");
    expect(migratedEmbedded.physical).toMatchObject({
      quantity: 2,
      massEach: 3,
      volumeEach: null,
      wear: 0,
    });
    await expect(migrateItemCore()).resolves.toBe(0);
    expect(worldItem.update).toHaveBeenCalledTimes(1);
    expect(setting.lastMigrationId).toBe("10-E4-P-schema-7");
    log.mockRestore();
  });
});

it("réserve les profils composés au MJ même pour les Items monde et les écritures imbriquées", () => {
  (globalThis as any).game = { user: { isGM: false } };
  (globalThis as any).ui = { notifications: { warn: vi.fn() } };
  const item = {
    type: "equipment",
    system: { physical: { equipmentProfile: { wearForm: "ring" } } },
  } as unknown as Item;
  for (const change of [
    {
      "system.physical.equipmentProfile.wearForm": "composite",
      "system.physical.equipmentProfile.bodySlots": ["ring", "necklace"],
    },
    {
      system: {
        physical: {
          equipmentProfile: {
            wearForm: "composite",
            bodySlots: ["ring", "necklace"],
          },
        },
      },
    },
    { "system.physical.equipmentProfile.ornamental": true },
  ])
    expect(protectEquipmentUpdate(item, change)).toBe(false);
  (globalThis as any).game.user.isGM = true;
  expect(
    protectEquipmentUpdate(item, {
      "system.physical.equipmentProfile.wearForm": "composite",
      "system.physical.equipmentProfile.bodySlots": ["ring", "necklace"],
    }),
  ).toBeUndefined();
});

it("protège aussi les sous-champs pointés d’un profil composé", () => {
  (globalThis as any).game = { user: { isGM: false } };
  (globalThis as any).ui = { notifications: { warn: vi.fn() } };
  const item = {
    type: "equipment",
    system: {
      physical: {
        equipmentProfile: {
          wearForm: "composite",
          bodySlots: ["bracelet"],
          slotCosts: { bracelet: 2 },
        },
      },
    },
  } as unknown as Item;
  expect(
    protectEquipmentUpdate(item, {
      "system.physical.equipmentProfile.slotCosts.bracelet": 1,
    }),
  ).toBe(false);
});
