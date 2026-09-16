import { beforeEach, describe, expect, it } from "vitest";
import {
  canMergeStacks,
  descendantIds,
  presentInventory,
  validateInventoryMove,
  validateStackSplit,
  type InventoryItemLike,
} from "../src/rules/inventory";
import {
  mergeInventoryStacks,
  splitInventoryStack,
  transferInventoryItem,
  applyEquipment,
  previewEquipment,
  recoverEquipment,
  saveEquipmentOutfit,
  moveInventoryItem,
} from "../src/services/inventory";

function reference(relisId = ""): Record<string, unknown> {
  return {
    relisId,
    uuid: "",
    documentName: relisId ? "Item" : "",
    type: relisId ? "container" : "",
    state: relisId ? "resolved" : "unresolved",
    labelSnapshot: "",
    missingPolicy: "diagnose",
  };
}

function inventoryItem(
  id: string,
  type = "equipment",
  overrides: Record<string, any> = {},
): InventoryItemLike {
  const system = {
    meta: {
      relisId: `WLD-ITM-${id}`,
      sourceRef: reference("UTL-source"),
      sourceVersion: "1",
      schemaVersion: "5",
      rulesVersion: "1",
      contentVersion: "1",
      revision: 0,
      status: "draft",
      causeRefs: [],
      tags: [],
    },
    description: "",
    traits: [],
    requirementRefs: [],
    effectRefs: [],
    quality: 2,
    rarity: 1,
    legality: "free",
    provenance: {
      acquisitionKind: "found",
      acquiredFromRef: reference(),
      acquiredAt: 1,
      lotId: "LOT-A",
      localRevision: 0,
      manualOverrides: [],
      upgradeState: "current",
    },
    physical: {
      quantity: 1,
      unit: "count",
      massEach: 1,
      volumeEach: 1,
      bulkEach: 1,
      containerRef: reference(),
      locationKey: "actor-cargo",
      custodianRef: reference(),
      ownershipState: "owned",
      accessibility: "stored",
      maintenanceRefs: [],
      equipState: "stored",
      condition: "intact",
      wear: 0,
      charges: { current: null, maximum: null, unit: "charge" },
      expiresAt: {
        worldTime: null,
        calendarId: "",
        displayOverride: "",
        precision: "exact",
      },
      identified: true,
    },
    ...overrides,
  };
  return {
    id,
    name: overrides.name ?? "Objet",
    type,
    uuid: `Actor.actor.Item.${id}`,
    system,
    flags: {},
  };
}

describe("règles d’inventaire 10-E2-P", () => {
  it("reconstruit les conteneurs frères et additionne leur charge", () => {
    const bag = inventoryItem("bag", "container", {
      name: "Sac",
      capacity: { mass: 10, volume: 10, bulk: 10, units: 10 },
      accessRule: "normal",
    });
    const box = inventoryItem("box", "container", {
      name: "Boîte",
      capacity: { mass: null, volume: null, bulk: null, units: null },
      accessRule: "normal",
      physical: {
        ...inventoryItem("x").system.physical,
        massEach: 0.5,
        containerRef: reference("WLD-ITM-bag"),
      },
    });
    const item = inventoryItem("item", "equipment", {
      name: "Outil",
      physical: {
        ...inventoryItem("x").system.physical,
        quantity: 2,
        massEach: 2,
        containerRef: reference("WLD-ITM-box"),
      },
    });

    const presentation = presentInventory([bag, box, item]);
    expect(presentation.rows.map((row) => [row.item.id, row.depth])).toEqual([
      ["bag", 0],
      ["box", 1],
      ["item", 2],
    ]);
    expect(
      presentation.rows.find((row) => row.item.id === "bag")?.containerUsage,
    ).toMatchObject({ mass: 4.5, units: 3 });
    expect(presentation.totalLoad.mass).toBe(5.5);
    expect(descendantIds([bag, box, item], "bag")).toEqual(["box", "item"]);
  });

  it("refuse une boucle et une capacité dépassée", () => {
    const bag = inventoryItem("bag", "container", {
      name: "Petit sac",
      capacity: { mass: 2, volume: null, bulk: null, units: null },
      accessRule: "normal",
    });
    const heavy = inventoryItem("heavy", "resource", {
      name: "Ferraille",
      physical: {
        ...inventoryItem("x").system.physical,
        quantity: 3,
        massEach: 1,
      },
    });
    expect(validateInventoryMove([bag, heavy], "heavy", "bag")).toMatchObject({
      valid: false,
    });

    const inner = inventoryItem("inner", "container", {
      name: "Boîte",
      physical: {
        ...inventoryItem("x").system.physical,
        containerRef: reference("WLD-ITM-bag"),
      },
    });
    expect(
      validateInventoryMove([bag, inner], "bag", "inner").errors[0],
    ).toMatch(/boucle/u);
  });

  it("fusionne seulement des piles matériellement homogènes", () => {
    const first = inventoryItem("one");
    const second = inventoryItem("two");
    expect(canMergeStacks(first, second)).toBe(true);
    second.system.provenance.lotId = "LOT-B";
    expect(canMergeStacks(first, second)).toBe(false);
    second.system.provenance.lotId = "LOT-A";
    second.system.physical.charges.current = 1;
    expect(canMergeStacks(first, second)).toBe(false);
  });

  it("borne la scission selon l’unité et refuse les conteneurs", () => {
    const stack = inventoryItem("stack");
    stack.system.physical.quantity = 4;
    expect(validateStackSplit(stack, 2)).toEqual([]);
    expect(validateStackSplit(stack, 1.5)[0]).toMatch(/entières/u);
    expect(validateStackSplit(stack, 4)[0]).toMatch(/inférieure/u);
    expect(
      validateStackSplit(inventoryItem("bag", "container"), 0.5)[0],
    ).toMatch(/conteneur/u);
  });

  it("isole les références de conteneur anciennes sans supprimer les Items", () => {
    const orphan = inventoryItem("orphan");
    orphan.system.physical.containerRef = reference("WLD-ITM-absent");
    const presentation = presentInventory([orphan]);
    expect(presentation.rows).toHaveLength(1);
    expect(presentation.rows[0]?.orphaned).toBe(true);
    expect(presentation.diagnostics[0]?.message).toMatch(/absent/u);
  });

  it("diagnostique un conteneur dont la quantité n’est pas unique", () => {
    const container = inventoryItem("bag", "container");
    container.system.physical.quantity = 2;
    expect(presentInventory([container]).diagnostics[0]?.message).toMatch(
      /quantité doit être égale à 1/u,
    );
  });
});

function setPath(
  target: Record<string, any>,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current = target;
  for (const part of parts.slice(0, -1)) current = current[part] ??= {};
  const last = String(parts.at(-1));
  if (last.startsWith("-=")) delete current[last.slice(2)];
  else current[last] = value;
}

class MockItem {
  id: string;
  uuid: string;
  parent: MockActor;
  name: string;
  type: string;
  system: Record<string, any>;
  flags: Record<string, any>;

  constructor(actor: MockActor, data: Record<string, any>, id: string) {
    this.id = id;
    this.uuid = `${actor.uuid}.Item.${id}`;
    this.parent = actor;
    this.name = String(data.name ?? "Objet");
    this.type = String(data.type ?? "equipment");
    this.system = JSON.parse(
      JSON.stringify(data.system ?? inventoryItem(id).system),
    );
    this.flags = JSON.parse(JSON.stringify(data.flags ?? {}));
  }

  toObject(): Record<string, any> {
    return {
      _id: this.id,
      name: this.name,
      type: this.type,
      system: JSON.parse(JSON.stringify(this.system)),
      flags: JSON.parse(JSON.stringify(this.flags)),
    };
  }

  async update(change: Record<string, any>): Promise<this> {
    for (const [path, value] of Object.entries(change)) {
      if (path.startsWith("system.")) setPath(this as any, path, value);
      else setPath(this as any, path, value);
    }
    return this;
  }
}

class MockActor {
  id: string;
  uuid: string;
  name: string;
  type = "character";
  isOwner = true;
  flags: Record<string, any> = {};
  system: Record<string, any> = {
    activeBodyId: "primary",
    bodies: [
      {
        id: "primary",
        name: "Corps de test",
        size: "medium",
        nature: "biological",
        carrying: { hands: 2, loaded: 10, overloaded: 20 },
      },
    ],
    outfits: [],
  };
  failEquipmentWrites = 0;
  failAfterFirstEquipmentWrite = false;
  items = new Map<string, MockItem>();
  failDelete = false;
  nextId = 0;

  constructor(id: string) {
    this.id = id;
    this.uuid = `Actor.${id}`;
    this.name = id;
  }

  add(data: InventoryItemLike): MockItem {
    const item = new MockItem(this, data, data.id);
    this.items.set(item.id, item);
    return item;
  }

  async createEmbeddedDocuments(
    _documentName: string,
    data: Record<string, any>[],
  ): Promise<MockItem[]> {
    return data.map((entry) => {
      const item = new MockItem(this, entry, `created-${++this.nextId}`);
      this.items.set(item.id, item);
      return item;
    });
  }

  async updateEmbeddedDocuments(
    _documentName: string,
    changes: Record<string, any>[],
  ): Promise<MockItem[]> {
    if (this.failEquipmentWrites > 0) {
      this.failEquipmentWrites--;
      throw new Error("Écriture interrompue");
    }
    return changes.map((change) => {
      const item = this.items.get(String(change._id));
      if (!item) throw new Error("Item absent");
      for (const [path, value] of Object.entries(change))
        if (path !== "_id") setPath(item as any, path, value);
      if (this.failAfterFirstEquipmentWrite) {
        this.failAfterFirstEquipmentWrite = false;
        throw new Error("Écriture partielle interrompue");
      }
      return item;
    });
  }

  async deleteEmbeddedDocuments(
    _documentName: string,
    ids: string[],
  ): Promise<MockItem[]> {
    if (this.failDelete) throw new Error("suppression simulée refusée");
    const deleted: MockItem[] = [];
    for (const id of ids) {
      const item = this.items.get(id);
      if (item) deleted.push(item);
      this.items.delete(id);
    }
    return deleted;
  }

  async update(change: Record<string, any>): Promise<this> {
    for (const [path, value] of Object.entries(change))
      setPath(this as any, path, value);
    return this;
  }
}

describe("opérations d’équipement avec aperçu et récupération", () => {
  it("compense une écriture partielle sans déplacer ni dupliquer de pièces", async () => {
    const actor = new MockActor("a");
    actor.add(inventoryItem("a", "weapon"));
    actor.add(inventoryItem("b", "weapon"));
    const requests = [
      { itemId: "a", state: "held-one" },
      { itemId: "b", state: "held-one" },
    ];
    actor.failAfterFirstEquipmentWrite = true;
    await expect(
      applyEquipment(
        actor as any,
        requests,
        previewEquipment(actor as any, requests).fingerprint,
      ),
    ).rejects.toThrow(/partielle/);
    expect(actor.items.size).toBe(2);
    expect(
      [...actor.items.values()].map((item) => item.system.physical.equipState),
    ).toEqual(["stored", "stored"]);
    expect(actor.flags.relis.equipmentRecovery).toBeUndefined();
  });
  beforeEach(() => {
    (globalThis as any).game = { user: { id: "owner", isGM: false } };
  });
  it("refuse sans propriété, puis applique une opération sans créer d’Item", async () => {
    const actor = new MockActor("a");
    actor.add(inventoryItem("weapon", "weapon"));
    const request = [{ itemId: "weapon", state: "held-two" }];
    const preview = previewEquipment(actor as any, request);
    actor.isOwner = false;
    await expect(
      applyEquipment(actor as any, request, preview.fingerprint),
    ).rejects.toThrow(/modifier/);
    actor.isOwner = true;
    await applyEquipment(actor as any, request, preview.fingerprint);
    expect(actor.items.size).toBe(1);
    expect(actor.items.get("weapon")!.system.physical).toMatchObject({
      hands: 2,
      bodyId: "primary",
      equipState: "readied",
    });
    expect(actor.flags.relis.equipmentRecovery).toBeUndefined();
    expect(actor.flags.relis.inventoryJournal[0].action).toBe("equip");
  });
  it("refuse un aperçu périmé après modification de la masse ou du corps", async () => {
    const actor = new MockActor("a");
    const item = actor.add(inventoryItem("w", "weapon"));
    const requests = [{ itemId: "w", state: "held-one" }];
    const preview = previewEquipment(actor as any, requests);
    item.system.physical.massEach = 20;
    await expect(
      applyEquipment(actor as any, requests, preview.fingerprint),
    ).rejects.toThrow(/changé/);
    expect(item.system.physical.equipState).toBe("stored");
  });
  it("restaure après échec d’écriture et garde un verrou récupérable si la restauration échoue", async () => {
    const actor = new MockActor("a");
    const item = actor.add(inventoryItem("w", "weapon"));
    const requests = [{ itemId: "w", state: "held-one" }];
    actor.failEquipmentWrites = 1;
    await expect(
      applyEquipment(
        actor as any,
        requests,
        previewEquipment(actor as any, requests).fingerprint,
      ),
    ).rejects.toThrow(/interrompue/);
    expect(item.system.physical.equipState).toBe("stored");
    expect(actor.flags.relis.equipmentRecovery).toBeUndefined();
    actor.failEquipmentWrites = 2;
    await expect(
      applyEquipment(
        actor as any,
        requests,
        previewEquipment(actor as any, requests).fingerprint,
      ),
    ).rejects.toThrow(/MJ requise/);
    expect(actor.flags.relis.equipmentRecovery.before).toHaveLength(1);
    await expect(recoverEquipment(actor as any)).rejects.toThrow(/MJ/);
    (globalThis as any).game.user.isGM = true;
    await recoverEquipment(actor as any);
    expect(actor.flags.relis.equipmentRecovery).toBeUndefined();
  });
  it("enregistre des références et remplace seulement l’emplacement choisi", async () => {
    const actor = new MockActor("a");
    const item = actor.add(inventoryItem("w", "weapon"));
    item.system.physical = {
      ...item.system.physical,
      equipState: "readied",
      hands: 1,
      bodyId: "primary",
    };
    actor.system.outfits = [
      { id: "existing", name: "Historique", itemRefs: [] },
    ];
    await saveEquipmentOutfit(actor as any, 0, "Test local");
    await saveEquipmentOutfit(actor as any, 0, "Test remplacé");
    expect(actor.items.size).toBe(1);
    expect(actor.system.outfits).toHaveLength(2);
    expect(actor.system.outfits[0].name).toBe("Historique");
    expect(actor.system.outfits[1].itemRefs[0].uuid).toBe(item.uuid);
    expect(actor.system.outfits[1].equipmentEntries[0]).toMatchObject({
      itemId: "w",
      state: "held-one",
    });
  });
  it("interdit de déplacer/transférer un hôte attaché et remet à zéro les attaches à réception", async () => {
    const actor = new MockActor("a"),
      target = new MockActor("b");
    const host = actor.add(inventoryItem("h", "weapon"));
    const module = actor.add(inventoryItem("m"));
    module.system.physical.hostRef = { uuid: host.uuid };
    await expect(moveInventoryItem(actor as any, "h", null)).rejects.toThrow(
      /Détachez/,
    );
    await expect(
      transferInventoryItem(actor as any, target as any, "h"),
    ).rejects.toThrow(/Détachez/);
    module.system.physical.hostRef = {};
    host.system.physical.equipState = "readied";
    host.system.physical.hands = 2;
    host.system.physical.bodyId = "primary";
    const received = await transferInventoryItem(
      actor as any,
      target as any,
      "h",
    );
    expect(received[0]!.system.physical).toMatchObject({
      equipState: "stored",
      hands: 0,
      bodyId: "",
    });
  });
});

describe("opérations documentaires compensées 10-E2-P", () => {
  beforeEach(() => {
    (globalThis as any).game = {
      user: { id: "gm", isGM: true },
      actors: { contents: [] },
    };
  });

  it("scinde puis fusionne sans changer le total", async () => {
    const actor = new MockActor("source");
    const sourceData = inventoryItem("stack");
    sourceData.system.physical.quantity = 5;
    actor.add(sourceData);

    const created = await splitInventoryStack(
      actor as unknown as Actor,
      "stack",
      2,
    );
    expect(actor.items.get("stack")?.system.physical.quantity).toBe(3);
    expect(created.system.physical.quantity).toBe(2);
    await mergeInventoryStacks(actor as unknown as Actor, "stack", created.id);
    expect(actor.items.get("stack")?.system.physical.quantity).toBe(5);
    expect(actor.items.has(created.id)).toBe(false);
  });

  it("transfère un conteneur et remappe ses contenus", async () => {
    const source = new MockActor("source");
    const destination = new MockActor("destination");
    const bag = inventoryItem("bag", "container", {
      name: "Sac",
      capacity: { mass: 20, volume: 20, bulk: 20, units: 20 },
      accessRule: "normal",
    });
    const tool = inventoryItem("tool", "equipment", {
      name: "Outil",
      physical: {
        ...inventoryItem("x").system.physical,
        containerRef: reference("WLD-ITM-bag"),
      },
    });
    source.add(bag);
    source.add(tool);

    const created = await transferInventoryItem(
      source as unknown as Actor,
      destination as unknown as Actor,
      "bag",
      1,
    );
    expect(source.items.size).toBe(0);
    expect(created).toHaveLength(2);
    const newBag = created.find((item) => item.type === "container");
    const newTool = created.find((item) => item.type === "equipment");
    expect(newTool?.system.physical.containerRef.relisId).toBe(
      newBag?.system.meta.relisId,
    );
    expect(newTool?.flags?.relis.inventoryTransfer.state).toBe("complete");
  });

  it("refuse de transférer un conteneur dont la quantité est incohérente", async () => {
    const source = new MockActor("source");
    const destination = new MockActor("destination");
    const container = inventoryItem("bag", "container");
    container.system.physical.quantity = 2;
    source.add(container);

    await expect(
      transferInventoryItem(
        source as unknown as Actor,
        destination as unknown as Actor,
        "bag",
      ),
    ).rejects.toThrow(/quantité incohérente/u);
    expect(source.items.has("bag")).toBe(true);
    expect(destination.items.size).toBe(0);
  });

  it("retire les copies préparatoires si la source ne peut être supprimée", async () => {
    const source = new MockActor("source");
    const destination = new MockActor("destination");
    source.add(inventoryItem("item"));
    source.failDelete = true;

    await expect(
      transferInventoryItem(
        source as unknown as Actor,
        destination as unknown as Actor,
        "item",
        1,
      ),
    ).rejects.toThrow(/suppression simulée/u);
    expect(source.items.has("item")).toBe(true);
    expect(destination.items.size).toBe(0);
  });
});
