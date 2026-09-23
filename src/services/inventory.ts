import { assertProfilePermission } from "../rules/equipment-classification";
import { installedOn, slotProfileErrors } from "../rules/equipment-slots";
import {
  createWorldItemId,
  initialReference,
  isPhysicalItemType,
} from "../data/item-defaults";
import {
  canMergeStacks,
  descendantIds,
  presentInventory,
  validateInventoryMove,
  validateStackSplit,
  type InventoryItemLike,
} from "../rules/inventory";
import { createRelisId } from "../utils/ulid";
import {
  equipmentLinked,
  equipmentBodyId,
  equipmentPlan,
  equipmentFailureMessage,
  equipmentState,
  projectEquipment,
  type EquipmentRequest,
  type EquipmentBody,
} from "../rules/equipment";
import {
  ammunitionCompatibility,
  energyCompatibility,
} from "../rules/personal-material";
import { physicalUnitMass } from "../rules/physical-mass";

type ActorLike = Actor & {
  id?: string;
  flags?: Record<string, any>;
  updateEmbeddedDocuments(
    documentName: string,
    data: Record<string, unknown>[],
    options?: Record<string, unknown>,
  ): Promise<any[]>;
};

interface InventoryJournalEntry {
  operationId: string;
  action:
    | "create"
    | "split"
    | "merge"
    | "move"
    | "transfer-in"
    | "transfer-out"
    | "equip"
    | "load"
    | "unload"
    | "energy"
    | "consume";
  at: number;
  userId: string;
  itemIds: string[];
  quantity: number | null;
  counterpartActorUuid?: string;
  targetContainerId?: string | null;
}

interface PendingTransfer {
  operationId: string;
  state: "pending" | "complete" | "quarantined";
  mode: "full" | "partial";
  sourceActorUuid: string;
  sourceRootId: string;
  sourceItemIds: string[];
  sourceQuantityBefore: number;
  sourceQuantityAfter: number;
  finalAccessibility: string;
}

const activeLocks = new Set<string>();

function ownedItems(actor: ActorLike): Item[] {
  const collection = actor.items?.contents ?? actor.items;
  if (typeof collection?.values === "function")
    return Array.from(collection.values()) as Item[];
  return Array.from(collection ?? []) as Item[];
}

function itemSnapshot(item: Item): InventoryItemLike {
  const source = item.toObject?.(true) ?? {};
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    uuid: item.uuid,
    system: source.system ?? item.system ?? {},
    flags: source.flags ?? (item as any).flags ?? {},
  };
}

function actorSnapshots(actor: ActorLike): InventoryItemLike[] {
  return ownedItems(actor)
    .filter((item) => isPhysicalItemType(item.type))
    .map(itemSnapshot);
}

function operationId(): string {
  return `OP-INV-${createRelisId()}`;
}

function actorLockKey(actor: ActorLike): string {
  return actor.uuid || String(actor.id ?? actor.name);
}

async function withActorLocks<T>(
  actors: ActorLike[],
  callback: () => Promise<T>,
): Promise<T> {
  const keys = Array.from(new Set(actors.map(actorLockKey))).sort();
  if (keys.some((key) => activeLocks.has(key)))
    throw new Error("Une autre opération d’inventaire est déjà en cours.");
  for (const key of keys) activeLocks.add(key);
  try {
    return await callback();
  } finally {
    for (const key of keys) activeLocks.delete(key);
  }
}

function assertActorPermission(actor: ActorLike): void {
  if (!game.user?.isGM && !actor.isOwner)
    throw new Error(
      `Vous ne pouvez pas modifier l’inventaire de ${actor.name}.`,
    );
  if (actor.flags?.relis?.equipmentRecovery)
    throw new Error(
      "Une opération matérielle ou d’équipement doit être récupérée par le MJ avant de poursuivre.",
    );
}

function assertDetachedTree(actor: ActorLike, itemId: string): void {
  const items = actorSnapshots(actor);
  const ids = [itemId, ...descendantIds(items, itemId)];
  if (ids.some((id) => equipmentLinked(items, id)))
    throw new Error(
      "Détachez les installations avant de déplacer ou transférer cet ensemble.",
    );
}

export function previewEquipment(
  actor: ActorLike,
  requests: EquipmentRequest[],
  assisted = false,
) {
  const bodies = Array.from(actor.system.bodies ?? []) as EquipmentBody[];
  const body = bodies.find((entry) => entry.id === actor.system.activeBodyId);
  if (!body) throw new Error("Corps actif introuvable.");
  const snapshots = actorSnapshots(actor);
  return {
    ...projectEquipment(snapshots, body, requests, assisted),
    fingerprint: JSON.stringify({ snapshots, body }),
    body,
  };
}

export async function applyEquipment(
  actor: ActorLike,
  requests: EquipmentRequest[],
  fingerprint: string,
  assisted = false,
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    assertActorPermission(actor);
    const preview = previewEquipment(actor, requests, assisted);
    if (preview.fingerprint !== fingerprint)
      throw new Error("L’inventaire ou le corps a changé. Refaire l’aperçu.");
    if (!preview.updates.length)
      throw new Error(equipmentFailureMessage(preview));
    const before = preview.updates.map((update) => {
      const physical = itemById(actor, update._id).system.physical;
      const restored: Record<string, unknown> = { _id: update._id };
      for (const path of Object.keys(update).filter((key) => key !== "_id"))
        restored[path] = JSON.parse(
          JSON.stringify(
            physical[path.slice("system.physical.".length)] ??
              (path.endsWith("Ref")
                ? initialReference()
                : path.endsWith("hands")
                  ? 0
                  : ""),
          ),
        );
      return restored;
    });
    await actor.update({
      "flags.relis.equipmentRecovery": { before, at: Date.now() },
    });
    try {
      await actor.updateEmbeddedDocuments(
        "Item",
        preview.updates,
        inventoryCreateOptions(),
      );
      await actor.update({
        "flags.relis.equipmentRecovery":
          new foundry.data.operators.ForcedDeletion(),
      });
    } catch (error) {
      try {
        await actor.updateEmbeddedDocuments(
          "Item",
          before,
          inventoryCreateOptions(),
        );
        await actor.update({
          "flags.relis.equipmentRecovery":
            new foundry.data.operators.ForcedDeletion(),
        });
      } catch {
        throw new Error(
          "Écriture interrompue : restauration MJ requise, sauvegarde conservée sur l’Actor.",
        );
      }
      throw error;
    }
    await appendJournal(
      actor,
      journalEntry(
        "equip",
        operationId(),
        preview.updates.map((entry) => entry._id),
        null,
      ),
    );
  });
}

export async function recoverEquipment(actor: ActorLike): Promise<void> {
  if (!game.user?.isGM) throw new Error("Récupération réservée au MJ.");
  await withActorLocks([actor], async () => {
    const before = actor.flags?.relis?.equipmentRecovery?.before;
    if (!Array.isArray(before))
      throw new Error("Aucune sauvegarde à restaurer.");
    await actor.updateEmbeddedDocuments(
      "Item",
      before,
      inventoryCreateOptions(),
    );
    await actor.update({
      "flags.relis.equipmentRecovery":
        new foundry.data.operators.ForcedDeletion(),
    });
  });
}

export async function saveEquipmentOutfit(
  actor: ActorLike,
  slot: number,
  name: string,
): Promise<void> {
  assertActorPermission(actor);
  if (!Number.isInteger(slot) || slot < 0 || slot > 4 || !name.trim())
    throw new Error("Ensemble invalide.");
  await withActorLocks([actor], async () => {
    const items = actorSnapshots(actor);
    const bodyId = String(actor.system.activeBodyId);
    const selected = items.filter(
      (item) => equipmentBodyId(items, item) === bodyId,
    );
    const entries = selected
      .filter((item) => !["stored", "ground"].includes(equipmentState(item)))
      .map((item) => ({
        itemId: item.id,
        state: equipmentState(item),
        hostId: items.find((host) => installedOn(item, host))?.id ?? "",
      }));
    const outfits = JSON.parse(
      JSON.stringify(Array.from(actor.system.outfits ?? [])),
    );
    const id = `equipment-${slot + 1}`;
    const index = outfits.findIndex((outfit: any) => outfit.id === id);
    const value = {
      ...(index < 0 ? {} : outfits[index]),
      id,
      sort: slot,
      name: name.trim(),
      bodyIds: [bodyId],
      equipmentEntries: entries,
      itemRefs: entries.map((entry) => {
        const item = items.find((candidate) => candidate.id === entry.itemId)!;
        return {
          ...initialReference(),
          uuid: item.uuid,
          labelSnapshot: item.name,
          documentName: "Item",
          state: "resolved",
        };
      }),
      readiness: "incomplete",
    };
    if (index < 0) outfits.push(value);
    else outfits[index] = value;
    await actor.update({ "system.outfits": outfits });
  });
}

function itemById(actor: ActorLike, itemId: string): Item {
  const item = actor.items?.get?.(itemId) as Item | undefined;
  if (!item || !isPhysicalItemType(item.type))
    throw new Error("Item physique introuvable dans cet inventaire.");
  return item;
}

function containerReference(item: Item): Record<string, unknown> {
  return initialReference({
    relisId: String(item.system.meta?.relisId ?? ""),
    uuid: item.uuid,
    documentName: "Item",
    type: "container",
    state: "resolved",
    labelSnapshot: item.name,
  });
}

function itemReference(item: Item): Record<string, unknown> {
  return initialReference({
    relisId: String(item.system.meta?.relisId ?? ""),
    uuid: item.uuid,
    documentName: "Item",
    type: item.type,
    state: "resolved",
    labelSnapshot: item.name,
  });
}

function referencedOwnedItem(actor: ActorLike, reference: any): Item | null {
  const relisId = String(reference?.relisId ?? "");
  const uuid = String(reference?.uuid ?? "");
  return (
    ownedItems(actor).find(
      (item) =>
        (relisId && String(item.system.meta?.relisId ?? "") === relisId) ||
        (uuid && item.uuid === uuid),
    ) ?? null
  );
}

function transferFlag(item: Item): PendingTransfer | null {
  const value = (item as any).flags?.relis?.inventoryTransfer;
  return value && typeof value === "object" ? (value as PendingTransfer) : null;
}

function assertAvailable(item: Item): void {
  if (transferFlag(item) && transferFlag(item)?.state !== "complete")
    throw new Error(
      "Cet Item appartient à un transfert en attente de récupération MJ.",
    );
}

async function appendJournal(
  actor: ActorLike,
  entry: InventoryJournalEntry,
): Promise<void> {
  const current = Array.from(
    actor.flags?.relis?.inventoryJournal ?? [],
  ) as InventoryJournalEntry[];
  try {
    await actor.update({
      "flags.relis.inventoryJournal": [...current.slice(-99), entry],
    });
  } catch (error) {
    console.warn("RE:LIS | Journal d’inventaire non écrit", error);
  }
}

function journalEntry(
  action: InventoryJournalEntry["action"],
  operation: string,
  itemIds: string[],
  quantity: number | null,
  extra: Partial<InventoryJournalEntry> = {},
): InventoryJournalEntry {
  return {
    operationId: operation,
    action,
    at: Date.now(),
    userId: String(game.user?.id ?? ""),
    itemIds,
    quantity,
    ...extra,
  };
}

function cloneItemData(item: Item): Record<string, any> {
  const data = item.toObject(true);
  delete data._id;
  data.system = JSON.parse(JSON.stringify(data.system ?? item.system ?? {}));
  data.flags = JSON.parse(JSON.stringify(data.flags ?? {}));
  return data;
}

function inventoryCreateOptions(): Record<string, unknown> {
  return { relisInventoryOperation: true, relisProvenance: true };
}

export async function createInventoryItem(
  actor: ActorLike,
  name: string,
  type: string,
): Promise<Item> {
  assertActorPermission(actor);
  if (!isPhysicalItemType(type))
    throw new Error(
      "Le type demandé n’appartient pas à l’inventaire physique.",
    );
  const trimmedName = name.trim();
  if (!trimmedName) throw new Error("Le nom de l’Item est obligatoire.");
  return withActorLocks([actor], async () => {
    const operation = operationId();
    const [created] = await actor.createEmbeddedDocuments(
      "Item",
      [{ name: trimmedName, type }],
      inventoryCreateOptions(),
    );
    if (!created) throw new Error("Foundry n’a pas créé l’Item demandé.");
    await appendJournal(
      actor,
      journalEntry("create", operation, [String(created.id)], 1),
    );
    return created as Item;
  });
}

export async function splitInventoryStack(
  actor: ActorLike,
  itemId: string,
  requested: number,
): Promise<Item> {
  assertActorPermission(actor);
  return withActorLocks([actor], async () => {
    const source = itemById(actor, itemId);
    assertDetachedTree(actor, itemId);
    assertAvailable(source);
    const errors = validateStackSplit(itemSnapshot(source), requested);
    if (errors.length) throw new Error(errors.join(" "));
    const before = Number(source.system.physical.quantity);
    const after = before - requested;
    const operation = operationId();
    const data = cloneItemData(source);
    data.system.meta.relisId = createWorldItemId();
    data.system.meta.revision = 0;
    data.system.physical.quantity = requested;
    data.flags.relis ??= {};
    data.flags.relis.inventoryOperation = {
      operationId: operation,
      action: "split",
      state: "complete",
    };

    await source.update(
      { "system.physical.quantity": after },
      inventoryCreateOptions(),
    );
    try {
      const [created] = await actor.createEmbeddedDocuments(
        "Item",
        [data],
        inventoryCreateOptions(),
      );
      if (!created) throw new Error("La nouvelle pile n’a pas été créée.");
      await appendJournal(
        actor,
        journalEntry(
          "split",
          operation,
          [source.id, String(created.id)],
          requested,
        ),
      );
      return created as Item;
    } catch (error) {
      await source.update(
        { "system.physical.quantity": before },
        inventoryCreateOptions(),
      );
      throw error;
    }
  });
}

export async function mergeInventoryStacks(
  actor: ActorLike,
  targetId: string,
  sourceId: string,
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    const target = itemById(actor, targetId);
    const source = itemById(actor, sourceId);
    assertDetachedTree(actor, targetId);
    assertDetachedTree(actor, sourceId);
    assertAvailable(target);
    assertAvailable(source);
    if (!canMergeStacks(itemSnapshot(target), itemSnapshot(source)))
      throw new Error(
        "Ces piles diffèrent par leur source, leur lot, leur état, leurs charges ou leur emplacement.",
      );
    const targetBefore = Number(target.system.physical.quantity);
    const sourceQuantity = Number(source.system.physical.quantity);
    const operation = operationId();
    await target.update(
      { "system.physical.quantity": targetBefore + sourceQuantity },
      inventoryCreateOptions(),
    );
    try {
      await actor.deleteEmbeddedDocuments(
        "Item",
        [source.id],
        inventoryCreateOptions(),
      );
    } catch (error) {
      await target.update(
        { "system.physical.quantity": targetBefore },
        inventoryCreateOptions(),
      );
      throw error;
    }
    await appendJournal(
      actor,
      journalEntry("merge", operation, [target.id, source.id], sourceQuantity),
    );
  });
}

export async function moveInventoryItem(
  actor: ActorLike,
  itemId: string,
  targetContainerId: string | null,
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    const item = itemById(actor, itemId);
    assertDetachedTree(actor, itemId);
    assertAvailable(item);
    const target = targetContainerId
      ? itemById(actor, targetContainerId)
      : null;
    const validation = validateInventoryMove(
      actorSnapshots(actor),
      item.id,
      target?.id ?? null,
    );
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    const accessRule = String(target?.system.accessRule ?? "normal");
    const accessibility = target
      ? accessRule === "quick"
        ? "accessible"
        : ["restricted", "sealed"].includes(accessRule)
          ? "unavailable"
          : "stored"
      : "stored";
    const operation = operationId();
    await item.update(
      {
        "system.physical.containerRef": target
          ? containerReference(target)
          : initialReference(),
        "system.physical.locationKey": target ? "" : "actor-cargo",
        "system.physical.accessibility": accessibility,
        "system.physical.equipState": "stored",
        "system.physical.hands": 0,
        "system.physical.bodyId": target
          ? ""
          : String(actor.system.activeBodyId ?? ""),
      },
      inventoryCreateOptions(),
    );
    await appendJournal(
      actor,
      journalEntry("move", operation, [item.id], null, {
        targetContainerId: target?.id ?? null,
      }),
    );
  });
}

function transferTree(actor: ActorLike, root: Item): Item[] {
  const snapshots = actorSnapshots(actor);
  const ids = new Set([root.id, ...descendantIds(snapshots, root.id)]);
  return ownedItems(actor).filter((item) => ids.has(item.id));
}

function remappedReference(
  oldParent: Item,
  newRelisId: string,
): Record<string, unknown> {
  return initialReference({
    relisId: newRelisId,
    uuid: "",
    documentName: "Item",
    type: "container",
    state: "resolved",
    labelSnapshot: oldParent.name,
  });
}

async function activateTransfer(
  actor: ActorLike,
  items: Item[],
): Promise<void> {
  await actor.updateEmbeddedDocuments(
    "Item",
    items.map((item) => {
      const pending = transferFlag(item);
      return {
        _id: item.id,
        "system.physical.accessibility":
          pending?.finalAccessibility ?? "stored",
        "flags.relis.inventoryTransfer.state": "complete",
      };
    }),
    inventoryCreateOptions(),
  );
}

export async function transferInventoryItem(
  sourceActor: ActorLike,
  destinationActor: ActorLike,
  itemId: string,
  requested?: number,
): Promise<Item[]> {
  assertActorPermission(sourceActor);
  assertActorPermission(destinationActor);
  if (sourceActor.uuid === destinationActor.uuid)
    throw new Error("Choisissez un autre Actor pour un transfert.");

  return withActorLocks([sourceActor, destinationActor], async () => {
    const root = itemById(sourceActor, itemId);
    assertDetachedTree(sourceActor, itemId);
    assertAvailable(root);
    const before = Number(root.system.physical.quantity ?? 0);
    if (root.type === "container" && before !== 1)
      throw new Error(
        "Ce conteneur porte une quantité incohérente. Ramenez-la à 1 avant le transfert.",
      );
    const quantity = requested === undefined ? before : Number(requested);
    const partial = quantity < before;
    if (partial) {
      const errors = validateStackSplit(itemSnapshot(root), quantity);
      if (errors.length) throw new Error(errors.join(" "));
    } else if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > before
    ) {
      throw new Error("La quantité transférée est invalide.");
    }
    if (root.type === "container" && quantity !== before)
      throw new Error("Un conteneur se transfère avec toute son arborescence.");

    const tree = partial ? [root] : transferTree(sourceActor, root);
    const operation = operationId();
    const newRelisIds = new Map(
      tree.map((item) => [item.id, createWorldItemId()]),
    );
    const byRelisId = new Map(
      tree.map((item) => [String(item.system.meta?.relisId ?? ""), item]),
    );
    const sourceItemIds = tree.map((item) => item.id);
    const after = partial ? before - quantity : 0;
    const transferData = tree.map((item) => {
      const data = cloneItemData(item);
      data.system.physical.equipState = "stored";
      data.system.physical.hands = 0;
      data.system.physical.bodyId = "";
      data.system.physical.hostRef = initialReference();
      const originalAccessibility = String(
        item.system.physical?.accessibility ?? "stored",
      );
      data.system.meta.relisId = newRelisIds.get(item.id);
      data.system.meta.revision = 0;
      if (item.id === root.id) {
        data.system.physical.quantity = quantity;
        data.system.physical.containerRef = initialReference();
        data.system.physical.locationKey = "actor-cargo";
      } else {
        const oldParentRelisId = String(
          item.system.physical?.containerRef?.relisId ?? "",
        );
        const oldParent = byRelisId.get(oldParentRelisId);
        if (!oldParent)
          throw new Error(
            `Le parent de ${item.name} ne peut pas être remappé pendant le transfert.`,
          );
        data.system.physical.containerRef = remappedReference(
          oldParent,
          String(newRelisIds.get(oldParent.id)),
        );
      }
      data.system.physical.accessibility = "unavailable";
      data.flags.relis ??= {};
      data.flags.relis.inventoryTransfer = {
        operationId: operation,
        state: "pending",
        mode: partial ? "partial" : "full",
        sourceActorUuid: sourceActor.uuid,
        sourceRootId: root.id,
        sourceItemIds,
        sourceQuantityBefore: before,
        sourceQuantityAfter: after,
        finalAccessibility: originalAccessibility,
      } satisfies PendingTransfer;
      return data;
    });

    const created = (await destinationActor.createEmbeddedDocuments(
      "Item",
      transferData,
      inventoryCreateOptions(),
    )) as Item[];
    if (created.length !== transferData.length) {
      if (created.length)
        await destinationActor.deleteEmbeddedDocuments(
          "Item",
          created.map((item) => item.id),
          inventoryCreateOptions(),
        );
      throw new Error(
        "Le transfert n’a pas créé toute l’arborescence attendue.",
      );
    }

    try {
      if (partial)
        await root.update(
          { "system.physical.quantity": after },
          inventoryCreateOptions(),
        );
      else
        await sourceActor.deleteEmbeddedDocuments(
          "Item",
          sourceItemIds,
          inventoryCreateOptions(),
        );
    } catch (error) {
      await destinationActor.deleteEmbeddedDocuments(
        "Item",
        created.map((item) => item.id),
        inventoryCreateOptions(),
      );
      throw error;
    }

    try {
      await activateTransfer(destinationActor, created);
    } catch (error) {
      console.error(
        `RE:LIS | Transfert ${operation} placé en attente de récupération`,
        error,
      );
      throw new Error(
        "Le transfert est conservé mais reste indisponible. Un MJ le finalisera au prochain chargement.",
        { cause: error },
      );
    }

    await Promise.all([
      appendJournal(
        sourceActor,
        journalEntry("transfer-out", operation, sourceItemIds, quantity, {
          counterpartActorUuid: destinationActor.uuid,
        }),
      ),
      appendJournal(
        destinationActor,
        journalEntry(
          "transfer-in",
          operation,
          created.map((item) => item.id),
          quantity,
          { counterpartActorUuid: sourceActor.uuid },
        ),
      ),
    ]);
    return created;
  });
}

function assertMaterialItem(item: Item): void {
  assertAvailable(item);
  const physical = item.system.physical ?? {};
  if (physical.accessibility === "unavailable")
    throw new Error(`${item.name} est indisponible.`);
  if (["broken", "destroyed"].includes(physical.condition))
    throw new Error(`${item.name} est brisé ou détruit.`);
}

function assertUniqueMaterialItem(item: Item): void {
  if (
    Number(item.system.physical?.quantity) !== 1 ||
    String(item.system.physical?.unit ?? "count") !== "count"
  )
    throw new Error(
      `${item.name} doit être un exemplaire unique : scinder la pile avant cette opération.`,
    );
}

function ammunitionQuantity(item: Item): number {
  const quantity = Number(item.system.physical?.quantity ?? 0);
  if (!Number.isSafeInteger(quantity) || quantity < 0)
    throw new Error(`${item.name} possède une quantité de munitions invalide.`);
  return quantity;
}

function loadSequenceQuantity(sequence: any[]): number {
  return sequence.reduce(
    (sum, segment) => sum + Math.max(0, Number(segment.quantity ?? 0)),
    0,
  );
}

function itemPathValue(item: Item, path: string): unknown {
  const parts = path.split(".");
  let current: any = item;
  for (const part of parts) current = current?.[part];
  return current;
}

async function applyRecoverableMaterialUpdates(
  actor: ActorLike,
  updates: Record<string, unknown>[],
): Promise<void> {
  const before = updates.map((update) => {
    const restored: Record<string, unknown> = { _id: update._id };
    const item = itemById(actor, String(update._id));
    for (const path of Object.keys(update).filter((key) => key !== "_id"))
      restored[path] = JSON.parse(
        JSON.stringify(itemPathValue(item, path) ?? null),
      );
    return restored;
  });
  await actor.update({
    "flags.relis.equipmentRecovery": {
      before,
      at: Date.now(),
      kind: "material",
    },
  });
  try {
    await actor.updateEmbeddedDocuments(
      "Item",
      updates,
      inventoryCreateOptions(),
    );
    await actor.update({
      "flags.relis.equipmentRecovery":
        new foundry.data.operators.ForcedDeletion(),
    });
  } catch (error) {
    try {
      await actor.updateEmbeddedDocuments(
        "Item",
        before,
        inventoryCreateOptions(),
      );
      await actor.update({
        "flags.relis.equipmentRecovery":
          new foundry.data.operators.ForcedDeletion(),
      });
    } catch {
      throw new Error(
        "Écriture matérielle interrompue : restauration MJ requise, sauvegarde conservée sur l’Actor.",
      );
    }
    throw error;
  }
}

export async function loadAmmunition(
  actor: ActorLike,
  targetId: string,
  ammunitionId: string,
  requested: number,
  location: "magazine" | "chamber" = "magazine",
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    assertActorPermission(actor);
    const target = itemById(actor, targetId);
    const ammunition = itemById(actor, ammunitionId);
    assertMaterialItem(target);
    assertMaterialItem(ammunition);
    assertUniqueMaterialItem(target);
    if (ammunition.type !== "ammunition")
      throw new Error("L’Item choisi n’est pas une munition.");
    const quantity = ammunitionQuantity(ammunition);
    if (
      !Number.isSafeInteger(requested) ||
      requested <= 0 ||
      requested > quantity
    )
      throw new Error("Quantité de chargement invalide.");
    const compatibility = ammunitionCompatibility(
      itemSnapshot(ammunition),
      itemSnapshot(target),
    );
    if (compatibility.length) throw new Error(compatibility.join(" "));

    const operation = operationId();
    if (["weapon", "armor", "equipment"].includes(target.type)) {
      const profileKey =
        target.type === "weapon" ? "weaponProfile" : "supplyProfile";
      const profile = target.system[profileKey] ?? {};
      if (!["internal", "hybrid"].includes(profile.feedKind))
        throw new Error("Cet objet ne possède pas de magasin interne.");
      const sequenceKey =
        location === "chamber" ? "chamberLoad" : "loadSequence";
      const sequence = JSON.parse(
        JSON.stringify(Array.from(profile[sequenceKey] ?? [])),
      );
      if (location === "chamber") {
        if (!profile.chamberSeparate)
          throw new Error("Cet objet ne suit pas une chambre séparée.");
        if (requested !== 1 || sequence.length)
          throw new Error(
            "La chambre accepte exactement une munition et doit être vide.",
          );
      } else {
        const capacity = Number(profile.capacity ?? 0);
        if (!Number.isSafeInteger(capacity) || capacity <= 0)
          throw new Error("Capacité interne invalide.");
        if (loadSequenceQuantity(sequence) + requested > capacity)
          throw new Error(
            `Chargement refusé : ${loadSequenceQuantity(sequence)} déjà chargé(s), ${capacity} place(s).`,
          );
      }
      const ammoProfile = ammunition.system.ammunitionProfile ?? {};
      const lotId = String(ammunition.system.provenance?.lotId ?? "");
      const last = sequence.at(-1);
      const sameLast =
        last &&
        String(last.ammunitionRef?.relisId ?? "") ===
          String(ammunition.system.meta?.relisId ?? "") &&
        String(last.lotId ?? "") === lotId;
      if (sameLast) {
        last.quantity += requested;
        if (last.massEach == null)
          last.massEach = physicalUnitMass(ammunition.system.physical ?? {});
      } else
        sequence.push({
          ammunitionRef: itemReference(ammunition),
          quantity: requested,
          massEach: physicalUnitMass(ammunition.system.physical ?? {}),
          lotId,
          variantId: String(ammunition.system.meta?.sourceRef?.relisId ?? ""),
          profile: {
            family: String(ammoProfile.family ?? ""),
            chamberId: String(ammoProfile.chamberId ?? ""),
            pressureClass: String(ammoProfile.pressureClass ?? ""),
            feedInterfaces: Array.from(ammoProfile.feedInterfaces ?? []),
            impactModifier: String(ammoProfile.impactModifier ?? ""),
            damageTypes: Array.from(ammoProfile.damageTypes ?? []),
            damageSources: Array.from(ammoProfile.damageSources ?? []),
            penetrationModifier: ammoProfile.penetrationModifier ?? null,
            rangeModifier: String(ammoProfile.rangeModifier ?? ""),
            signatureModifiers: Array.from(
              ammoProfile.signatureModifiers ?? [],
            ),
            effectSummary: String(ammoProfile.effectSummary ?? ""),
            specialTraits: Array.from(ammoProfile.specialTraits ?? []),
            recoverable: ammoProfile.recoverable === true,
          },
        });
      await applyRecoverableMaterialUpdates(actor, [
        {
          _id: ammunition.id,
          "system.physical.quantity": quantity - requested,
        },
        {
          _id: target.id,
          [`system.${profileKey}.${sequenceKey}`]: sequence,
        },
      ]);
    } else if (
      target.type === "container" &&
      target.system.containerKind === "magazine"
    ) {
      if (
        ammunition.system.physical?.containerRef?.uuid ||
        ammunition.system.physical?.containerRef?.relisId
      )
        throw new Error(
          "Sortir d’abord la pile de munitions de son conteneur avant de charger ce chargeur.",
        );
      const snapshots = actorSnapshots(actor);
      const children = snapshots.filter(
        (item) =>
          item.type === "ammunition" &&
          ((item.system.physical?.containerRef?.uuid &&
            item.system.physical.containerRef.uuid === target.uuid) ||
            (item.system.physical?.containerRef?.relisId &&
              item.system.physical.containerRef.relisId ===
                target.system.meta?.relisId)),
      );
      const loaded = children.reduce(
        (sum, item) => sum + Number(item.system.physical?.quantity ?? 0),
        0,
      );
      const capacity = Number(target.system.magazineProfile?.capacity ?? 0);
      if (!Number.isSafeInteger(capacity) || capacity <= 0)
        throw new Error("Capacité du chargeur invalide.");
      if (loaded + requested > capacity)
        throw new Error(
          `Chargeur plein : ${loaded} munition(s), ${capacity} place(s).`,
        );
      const data = cloneItemData(ammunition);
      data.system.meta.relisId = createWorldItemId();
      data.system.meta.revision = 0;
      data.system.physical.quantity = requested;
      data.system.physical.containerRef = containerReference(target);
      data.system.physical.hostRef = initialReference();
      data.system.physical.equipState = "stored";
      data.system.physical.locationKey = "container";
      data.system.ammunitionProfile.loadOrder =
        Math.max(
          0,
          ...children.map((item) =>
            Number(item.system.ammunitionProfile?.loadOrder ?? 0),
          ),
        ) + 1;
      const [created] = await actor.createEmbeddedDocuments(
        "Item",
        [data],
        inventoryCreateOptions(),
      );
      if (!created)
        throw new Error("La séquence de chargeur n’a pas été créée.");
      try {
        await ammunition.update(
          { "system.physical.quantity": quantity - requested },
          inventoryCreateOptions(),
        );
      } catch (error) {
        await actor.deleteEmbeddedDocuments(
          "Item",
          [created.id],
          inventoryCreateOptions(),
        );
        throw error;
      }
    } else throw new Error("La cible ne peut pas recevoir de munitions.");

    await appendJournal(
      actor,
      journalEntry("load", operation, [target.id, ammunition.id], requested),
    );
  });
}

export async function unloadAmmunition(
  actor: ActorLike,
  targetId: string,
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    assertActorPermission(actor);
    const target = itemById(actor, targetId);
    assertMaterialItem(target);
    assertUniqueMaterialItem(target);
    const operation = operationId();
    let unloaded = 0;
    if (["weapon", "armor", "equipment"].includes(target.type)) {
      const profileKey =
        target.type === "weapon" ? "weaponProfile" : "supplyProfile";
      const sequence = [
        ...Array.from(target.system[profileKey]?.chamberLoad ?? []),
        ...Array.from(target.system[profileKey]?.loadSequence ?? []),
      ] as any[];
      if (!sequence.length) throw new Error("Le magasin interne est vide.");
      const updates = new Map<string, { item: Item; quantity: number }>();
      const creations: Record<string, any>[] = [];
      for (const segment of sequence) {
        const quantity = Number(segment.quantity ?? 0);
        if (!Number.isSafeInteger(quantity) || quantity <= 0)
          throw new Error("Séquence interne invalide : quantité non positive.");
        unloaded += quantity;
        const source = referencedOwnedItem(actor, segment.ammunitionRef);
        if (source && source.type === "ammunition") {
          const current =
            updates.get(source.id)?.quantity ?? ammunitionQuantity(source);
          updates.set(source.id, {
            item: source,
            quantity: current + quantity,
          });
        } else {
          creations.push({
            name: String(
              segment.ammunitionRef?.labelSnapshot || "Munitions déchargées",
            ),
            type: "ammunition",
            system: {
              physical: {
                quantity,
                unit: "count",
                massEach: segment.massEach ?? null,
                locationKey: "actor-cargo",
              },
              provenance: { lotId: String(segment.lotId ?? "") },
              ammunitionProfile: {
                ...(segment.profile ?? {}),
                loadOrder: 0,
              },
            },
          });
        }
      }
      const created = creations.length
        ? await actor.createEmbeddedDocuments(
            "Item",
            creations,
            inventoryCreateOptions(),
          )
        : [];
      try {
        await applyRecoverableMaterialUpdates(actor, [
          ...Array.from(updates.values()).map(({ item, quantity }) => ({
            _id: item.id,
            "system.physical.quantity": quantity,
          })),
          {
            _id: target.id,
            [`system.${profileKey}.loadSequence`]: [],
            [`system.${profileKey}.chamberLoad`]: [],
          },
        ]);
      } catch (error) {
        if (created.length)
          await actor.deleteEmbeddedDocuments(
            "Item",
            created.map((item: Item) => item.id),
            inventoryCreateOptions(),
          );
        throw error;
      }
    } else if (
      target.type === "container" &&
      target.system.containerKind === "magazine"
    ) {
      const children = ownedItems(actor).filter(
        (item) =>
          item.type === "ammunition" &&
          ((item.system.physical?.containerRef?.uuid &&
            item.system.physical.containerRef.uuid === target.uuid) ||
            (item.system.physical?.containerRef?.relisId &&
              item.system.physical.containerRef.relisId ===
                target.system.meta?.relisId)),
      );
      if (!children.length) throw new Error("Le chargeur est vide.");
      unloaded = children.reduce(
        (sum, item) => sum + ammunitionQuantity(item),
        0,
      );
      await applyRecoverableMaterialUpdates(
        actor,
        children.map((item) => ({
          _id: item.id,
          "system.physical.containerRef": initialReference(),
          "system.physical.locationKey": "actor-cargo",
          "system.ammunitionProfile.loadOrder": 0,
        })),
      );
    } else throw new Error("La cible ne possède aucune munition à décharger.");
    await appendJournal(
      actor,
      journalEntry("unload", operation, [target.id], unloaded),
    );
  });
}

export async function transferItemEnergy(
  actor: ActorLike,
  sourceId: string,
  targetId: string,
  requested: number,
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    assertActorPermission(actor);
    const source = itemById(actor, sourceId);
    const target = itemById(actor, targetId);
    if (source.id === target.id)
      throw new Error("Une réserve ne peut pas se recharger elle-même.");
    assertMaterialItem(source);
    assertMaterialItem(target);
    assertUniqueMaterialItem(source);
    assertUniqueMaterialItem(target);
    const errors = energyCompatibility(
      itemSnapshot(source),
      itemSnapshot(target),
    );
    if (errors.length) throw new Error(errors.join(" "));
    const available = Number(source.system.energyProfile.current);
    const current = Number(target.system.energyProfile.current);
    const maximum = Number(target.system.energyProfile.maximum);
    const output = Number(source.system.energyProfile.output ?? requested);
    if (
      !Number.isFinite(requested) ||
      requested <= 0 ||
      requested > available ||
      requested > maximum - current ||
      (Number.isFinite(output) && requested > output)
    )
      throw new Error(
        "Quantité de CE incompatible avec les réserves ou la sortie.",
      );
    await applyRecoverableMaterialUpdates(actor, [
      {
        _id: source.id,
        "system.energyProfile.current": available - requested,
      },
      { _id: target.id, "system.energyProfile.current": current + requested },
    ]);
    await appendJournal(
      actor,
      journalEntry("energy", operationId(), [source.id, target.id], requested),
    );
  });
}

export async function consumeInventoryItem(
  actor: ActorLike,
  itemId: string,
): Promise<void> {
  assertActorPermission(actor);
  await withActorLocks([actor], async () => {
    assertActorPermission(actor);
    const item = itemById(actor, itemId);
    assertMaterialItem(item);
    if (item.type !== "consumable")
      throw new Error("L’Item choisi n’est pas un consommable.");
    const charges = item.system.physical?.charges ?? {};
    const current = Number(charges.current);
    const updates: Record<string, unknown> = { _id: item.id };
    if (charges.current !== null && charges.current !== undefined) {
      assertUniqueMaterialItem(item);
      if (!Number.isFinite(current) || current <= 0)
        throw new Error("Ce consommable ne possède plus de charge.");
      updates["system.physical.charges.current"] = current - 1;
    } else {
      const quantity = Number(item.system.physical?.quantity ?? 0);
      if (!Number.isSafeInteger(quantity) || quantity <= 0)
        throw new Error("Ce consommable ne possède plus d’unité.");
      const usesPerUnit = Number(
        item.system.consumableProfile?.usesPerUnit ?? 1,
      );
      if (Number.isSafeInteger(usesPerUnit) && usesPerUnit > 1) {
        assertUniqueMaterialItem(item);
        updates["system.physical.charges.current"] = usesPerUnit - 1;
        updates["system.physical.charges.maximum"] = usesPerUnit;
      } else updates["system.physical.quantity"] = quantity - 1;
    }
    await actor.updateEmbeddedDocuments(
      "Item",
      [updates],
      inventoryCreateOptions(),
    );
    await appendJournal(
      actor,
      journalEntry("consume", operationId(), [item.id], 1),
    );
  });
}

async function sourceActorForPending(
  pending: PendingTransfer,
): Promise<ActorLike | null> {
  try {
    return (await foundry.utils.fromUuid(
      pending.sourceActorUuid,
    )) as ActorLike | null;
  } catch {
    return null;
  }
}

export async function recoverPendingInventoryTransfers(): Promise<number> {
  if (!game.user?.isGM) return 0;
  let recovered = 0;
  for (const actor of Array.from(
    game.actors?.contents ?? game.actors ?? [],
  ) as ActorLike[]) {
    const groups = new Map<string, Item[]>();
    for (const item of ownedItems(actor)) {
      const pending = transferFlag(item);
      if (!pending || pending.state !== "pending") continue;
      const entries = groups.get(pending.operationId) ?? [];
      entries.push(item);
      groups.set(pending.operationId, entries);
    }
    for (const items of groups.values()) {
      const pending = transferFlag(items[0] as Item);
      if (!pending) continue;
      const sourceActor = await sourceActorForPending(pending);
      const sourceRoot = sourceActor?.items?.get?.(pending.sourceRootId) as
        Item | undefined;
      const shouldActivate =
        pending.mode === "full"
          ? Boolean(
              sourceActor &&
              pending.sourceItemIds.every(
                (id) => !sourceActor.items?.get?.(id),
              ),
            )
          : Number(sourceRoot?.system.physical?.quantity) ===
            pending.sourceQuantityAfter;
      const shouldRemove =
        pending.mode === "full"
          ? Boolean(
              sourceActor &&
              pending.sourceItemIds.every((id) => sourceActor.items?.get?.(id)),
            )
          : Number(sourceRoot?.system.physical?.quantity) ===
            pending.sourceQuantityBefore;

      if (shouldActivate) {
        await activateTransfer(actor, items);
        recovered += items.length;
      } else if (shouldRemove) {
        await actor.deleteEmbeddedDocuments(
          "Item",
          items.map((item) => item.id),
          inventoryCreateOptions(),
        );
        recovered += items.length;
      } else {
        await actor.updateEmbeddedDocuments(
          "Item",
          items.map((item) => ({
            _id: item.id,
            "flags.relis.inventoryTransfer.state": "quarantined",
          })),
          inventoryCreateOptions(),
        );
        console.error(
          `RE:LIS | Transfert ${pending.operationId} mis en quarantaine : état source ambigu.`,
        );
      }
    }
  }
  return recovered;
}

export function inventoryDiagnostics(actor: ActorLike): string[] {
  return presentInventory(actorSnapshots(actor)).diagnostics.map(
    (diagnostic) => diagnostic.message,
  );
}

/** Profile edits share the inventory lock and cannot silently invalidate equipment. */
export async function saveEquipmentProfile(
  item: {
    id?: string;
    type?: string;
    system?: Record<string, any>;
    isOwner: boolean;
    parent?: Actor | null;
    update(data: Record<string, unknown>): Promise<unknown>;
  },
  patch: Record<string, unknown>,
): Promise<void> {
  if (!item.isOwner) throw new Error("Vous ne pouvez pas modifier cet objet.");
  const updatedProfile = (source: Record<string, any>, type?: string) => {
    const profile = JSON.parse(JSON.stringify(source ?? {}));
    for (const [path, value] of Object.entries(patch)) {
      const prefix = "system.physical.equipmentProfile.";
      if (!path.startsWith(prefix))
        throw new Error("Champ hors du profil d’équipement.");
      const keys = path.slice(prefix.length).split(".");
      if (
        keys.some((key) =>
          ["__proto__", "constructor", "prototype"].includes(key),
        )
      )
        throw new Error("Champ invalide.");
      let current = profile;
      for (const key of keys.slice(0, -1)) current = current[key] ??= {};
      current[keys.at(-1)!] = JSON.parse(JSON.stringify(value));
    }
    assertProfilePermission(source ?? {}, profile, Boolean(game.user?.isGM));
    const errors = slotProfileErrors(profile, type);
    if (errors.length) throw new Error(errors.join(" "));
    return profile;
  };
  const actor = item.parent as ActorLike | undefined;
  if (!actor) {
    updatedProfile(item.system?.physical?.equipmentProfile ?? {}, item.type);
    await item.update(patch);
    return;
  }
  await withActorLocks([actor], async () => {
    assertActorPermission(actor);
    if (!item.isOwner)
      throw new Error("Vous ne pouvez pas modifier cet objet.");
    const before = actorSnapshots(actor);
    const after: InventoryItemLike[] = JSON.parse(JSON.stringify(before));
    const target = after.find((entry) => entry.id === item.id);
    if (!target) throw new Error("Objet absent de l’inventaire.");
    target.system.physical.equipmentProfile = updatedProfile(
      target.system.physical.equipmentProfile,
      target.type,
    );
    const bodies = Array.from(actor.system.bodies ?? []) as EquipmentBody[];
    const inspect = (items: InventoryItemLike[]) =>
      items.flatMap((entry) => {
        const p = entry.system.physical ?? {};
        if (!["readied", "equipped", "installed"].includes(p.equipState))
          return [];
        const body = bodies.find(
          (candidate) =>
            candidate.id ===
            (equipmentBodyId(items, entry) || actor.system.activeBodyId),
        );
        if (!body) return [`${entry.id} : corps absent.`];
        const host = items.find(
          (candidate) =>
            (p.hostRef?.uuid && p.hostRef.uuid === candidate.uuid) ||
            (p.hostRef?.relisId &&
              p.hostRef.relisId === candidate.system.meta?.relisId),
        );
        return equipmentPlan(items, body, {
          itemId: entry.id,
          state: equipmentState(entry),
          hostId: host?.id ?? "",
        }).errors.map((message) => `${entry.name} : ${message}`);
      });
    const oldErrors = new Set(inspect(before));
    const introduced = inspect(after).filter(
      (message) => !oldErrors.has(message),
    );
    if (introduced.length)
      throw new Error(
        `Profil refusé — ${introduced.join(" · ")} Ranger ou détacher les objets concernés avant de reconfigurer.`,
      );
    await item.update(patch);
  });
}
