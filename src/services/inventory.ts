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
    "create" | "split" | "merge" | "move" | "transfer-in" | "transfer-out";
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

function transferFlag(item: Item): PendingTransfer | null {
  const value = (item as any).flags?.relis?.inventoryTransfer;
  return value && typeof value === "object" ? (value as PendingTransfer) : null;
}

function assertAvailable(item: Item): void {
  if (transferFlag(item)?.state === "pending")
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
