import { isPhysicalItemType } from "../data/item-defaults";
import { physicalUnitMass } from "./physical-mass";

export interface InventoryItemLike {
  id: string;
  name: string;
  type: string;
  uuid?: string;
  system: Record<string, any>;
  flags?: Record<string, any>;
}

export interface InventoryLoad {
  mass: number | null;
  volume: number | null;
  bulk: number | null;
  units: number;
}

export interface InventoryDiagnostic {
  level: "warning" | "error";
  itemId: string;
  message: string;
}

export interface InventoryRow {
  item: InventoryItemLike;
  depth: number;
  parentId: string | null;
  orphaned: boolean;
  cyclic: boolean;
  childCount: number;
  subtreeLoad: InventoryLoad;
  containerUsage: InventoryLoad | null;
}

export interface InventoryPresentation {
  rows: InventoryRow[];
  diagnostics: InventoryDiagnostic[];
  totalLoad: InventoryLoad;
}

export interface InventoryMoveValidation {
  valid: boolean;
  errors: string[];
}

const LOAD_KEYS = ["mass", "volume", "bulk"] as const;

function finite(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, child]) => [key, stableValue(child)]),
  );
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function referenceIdentity(reference: unknown): string {
  if (!reference || typeof reference !== "object") return "";
  const value = reference as Record<string, unknown>;
  const relisId = String(value.relisId ?? "").trim();
  if (relisId) return `relis:${relisId}`;
  const uuid = String(value.uuid ?? "").trim();
  if (uuid) return `uuid:${uuid}`;
  return "";
}

function itemIdentityKeys(item: InventoryItemLike): string[] {
  const relisId = String(item.system.meta?.relisId ?? "").trim();
  return [
    relisId ? `relis:${relisId}` : "",
    item.uuid ? `uuid:${item.uuid}` : "",
    `id:${item.id}`,
  ].filter(Boolean);
}

function itemIndex(items: InventoryItemLike[]): Map<string, InventoryItemLike> {
  const index = new Map<string, InventoryItemLike>();
  for (const item of items)
    for (const identity of itemIdentityKeys(item)) index.set(identity, item);
  return index;
}

function referencedItem(
  reference: unknown,
  index: Map<string, InventoryItemLike>,
): InventoryItemLike | null {
  const identity = referenceIdentity(reference);
  if (!identity) return null;
  const exact = index.get(identity);
  if (exact) return exact;
  if (identity.startsWith("uuid:")) {
    const id = identity.slice(5).split(".").at(-1);
    return id ? (index.get(`id:${id}`) ?? null) : null;
  }
  return null;
}

function ownLoad(item: InventoryItemLike): InventoryLoad {
  const physical = item.system.physical ?? {};
  const quantity = Math.max(0, finite(physical.quantity) ?? 0);
  const total = (value: unknown): number | null => {
    const each = finite(value);
    return each === null
      ? null
      : Number((Math.max(0, each) * quantity).toPrecision(12));
  };
  return {
    mass: total(physicalUnitMass(physical)),
    volume: total(physical.volumeEach),
    bulk: total(physical.bulkEach),
    units:
      String(physical.unit ?? "count") === "count"
        ? quantity
        : quantity > 0
          ? 1
          : 0,
  };
}

function addLoads(loads: InventoryLoad[]): InventoryLoad {
  const sumKnown = (key: (typeof LOAD_KEYS)[number]): number | null => {
    if (loads.some((load) => load[key] === null)) return null;
    return Number(
      loads.reduce((sum, load) => sum + Number(load[key]), 0).toPrecision(12),
    );
  };
  return {
    mass: sumKnown("mass"),
    volume: sumKnown("volume"),
    bulk: sumKnown("bulk"),
    units: Number(
      loads.reduce((sum, load) => sum + load.units, 0).toPrecision(12),
    ),
  };
}

function parentMap(items: InventoryItemLike[]): {
  parents: Map<string, string | null>;
  orphans: Set<string>;
  diagnostics: InventoryDiagnostic[];
} {
  const index = itemIndex(items);
  const parents = new Map<string, string | null>();
  const orphans = new Set<string>();
  const diagnostics: InventoryDiagnostic[] = [];
  for (const item of items) {
    const reference = item.system.physical?.containerRef;
    const identity = referenceIdentity(reference);
    if (!identity) {
      parents.set(item.id, null);
      continue;
    }
    const parent = referencedItem(reference, index);
    if (!parent || parent.type !== "container") {
      parents.set(item.id, null);
      orphans.add(item.id);
      diagnostics.push({
        level: "error",
        itemId: item.id,
        message: `${item.name} référence un conteneur absent ou invalide.`,
      });
      continue;
    }
    parents.set(item.id, parent.id);
  }
  return { parents, orphans, diagnostics };
}

function childrenMap(
  items: InventoryItemLike[],
  parents: Map<string, string | null>,
): Map<string | null, InventoryItemLike[]> {
  const children = new Map<string | null, InventoryItemLike[]>();
  for (const item of items) {
    const parentId = parents.get(item.id) ?? null;
    const siblings = children.get(parentId) ?? [];
    siblings.push(item);
    children.set(parentId, siblings);
  }
  for (const siblings of children.values())
    siblings.sort((first, second) =>
      first.name.localeCompare(second.name, "fr", { sensitivity: "base" }),
    );
  return children;
}

function cyclicIds(
  items: InventoryItemLike[],
  parents: Map<string, string | null>,
): Set<string> {
  const result = new Set<string>();
  for (const item of items) {
    const path: string[] = [];
    const positions = new Map<string, number>();
    let current: string | null = item.id;
    while (current) {
      const prior = positions.get(current);
      if (prior !== undefined) {
        for (const member of path.slice(prior)) result.add(member);
        break;
      }
      positions.set(current, path.length);
      path.push(current);
      current = parents.get(current) ?? null;
    }
  }
  return result;
}

function subtreeLoadFor(
  itemId: string,
  byId: Map<string, InventoryItemLike>,
  children: Map<string | null, InventoryItemLike[]>,
  cache: Map<string, InventoryLoad>,
  path: Set<string> = new Set(),
): InventoryLoad {
  const cached = cache.get(itemId);
  if (cached) return cached;
  const item = byId.get(itemId);
  if (!item || path.has(itemId))
    return { mass: null, volume: null, bulk: null, units: 0 };
  const nextPath = new Set(path).add(itemId);
  const load = addLoads([
    ownLoad(item),
    ...(children.get(itemId) ?? []).map((child) =>
      subtreeLoadFor(child.id, byId, children, cache, nextPath),
    ),
  ]);
  cache.set(itemId, load);
  return load;
}

function containerUsageFor(
  itemId: string,
  byId: Map<string, InventoryItemLike>,
  children: Map<string | null, InventoryItemLike[]>,
  cache: Map<string, InventoryLoad>,
): InventoryLoad {
  return addLoads(
    (children.get(itemId) ?? []).map((child) =>
      subtreeLoadFor(child.id, byId, children, cache),
    ),
  );
}

function capacityDiagnostics(
  items: InventoryItemLike[],
  children: Map<string | null, InventoryItemLike[]>,
): InventoryDiagnostic[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const cache = new Map<string, InventoryLoad>();
  const diagnostics: InventoryDiagnostic[] = [];
  for (const container of items.filter((item) => item.type === "container")) {
    const capacity = container.system.capacity ?? {};
    const usage = containerUsageFor(container.id, byId, children, cache);
    for (const key of [...LOAD_KEYS, "units"] as const) {
      const maximum = finite(capacity[key]);
      if (maximum === null) continue;
      const used = usage[key];
      if (used === null) {
        diagnostics.push({
          level: "error",
          itemId: container.id,
          message: `${container.name} : capacité ${key} invérifiable, une valeur unitaire manque.`,
        });
      } else if (used > maximum) {
        diagnostics.push({
          level: "error",
          itemId: container.id,
          message: `${container.name} dépasse sa capacité ${key} (${used}/${maximum}).`,
        });
      }
    }
  }
  return diagnostics;
}

export function presentInventory(
  incoming: InventoryItemLike[],
): InventoryPresentation {
  const items = incoming.filter((item) => isPhysicalItemType(item.type));
  const { parents, orphans, diagnostics } = parentMap(items);
  const cycles = cyclicIds(items, parents);
  for (const itemId of cycles) {
    const item = items.find((candidate) => candidate.id === itemId);
    diagnostics.push({
      level: "error",
      itemId,
      message: `${item?.name ?? "Item"} appartient à une boucle de conteneurs.`,
    });
  }
  for (const container of items.filter((item) => item.type === "container")) {
    const quantity = Number(container.system.physical?.quantity ?? 1);
    if (quantity === 1) continue;
    diagnostics.push({
      level: "error",
      itemId: container.id,
      message: `${container.name} est un conteneur unique : sa quantité doit être égale à 1.`,
    });
  }
  const safeParents = new Map(parents);
  for (const itemId of cycles) safeParents.set(itemId, null);
  const children = childrenMap(items, safeParents);
  diagnostics.push(...capacityDiagnostics(items, children));

  const byId = new Map(items.map((item) => [item.id, item]));
  const loadCache = new Map<string, InventoryLoad>();
  const rows: InventoryRow[] = [];
  const visited = new Set<string>();
  const append = (item: InventoryItemLike, depth: number): void => {
    if (visited.has(item.id)) return;
    visited.add(item.id);
    const ownChildren = children.get(item.id) ?? [];
    rows.push({
      item,
      depth,
      parentId: safeParents.get(item.id) ?? null,
      orphaned: orphans.has(item.id),
      cyclic: cycles.has(item.id),
      childCount: ownChildren.length,
      subtreeLoad: subtreeLoadFor(item.id, byId, children, loadCache),
      containerUsage:
        item.type === "container"
          ? containerUsageFor(item.id, byId, children, loadCache)
          : null,
    });
    for (const child of ownChildren) append(child, depth + 1);
  };
  for (const root of children.get(null) ?? []) append(root, 0);
  for (const item of items) append(item, 0);

  return {
    rows,
    diagnostics,
    totalLoad: addLoads(items.map(ownLoad)),
  };
}

export function descendantIds(
  items: InventoryItemLike[],
  itemId: string,
): string[] {
  const { parents } = parentMap(items);
  const children = childrenMap(items, parents);
  const result: string[] = [];
  const visited = new Set<string>([itemId]);
  const visit = (parentId: string): void => {
    for (const child of children.get(parentId) ?? []) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      result.push(child.id);
      visit(child.id);
    }
  };
  visit(itemId);
  return result;
}

function withMovedParent(
  items: InventoryItemLike[],
  itemId: string,
  targetContainerId: string | null,
): InventoryItemLike[] {
  const target = targetContainerId
    ? items.find((item) => item.id === targetContainerId)
    : null;
  return items.map((item) => {
    if (item.id !== itemId) return item;
    const copy = { ...item, system: clone(item.system) };
    copy.system.physical.containerRef = target
      ? {
          relisId: String(target.system.meta?.relisId ?? ""),
          uuid: target.uuid ?? "",
          documentName: "Item",
          type: "container",
          state: "resolved",
          labelSnapshot: target.name,
          missingPolicy: "diagnose",
        }
      : {};
    return copy;
  });
}

export function validateInventoryMove(
  incoming: InventoryItemLike[],
  itemId: string,
  targetContainerId: string | null,
): InventoryMoveValidation {
  const items = incoming.filter((item) => isPhysicalItemType(item.type));
  const item = items.find((candidate) => candidate.id === itemId);
  if (!item) return { valid: false, errors: ["Item physique introuvable."] };
  if (targetContainerId) {
    const target = items.find(
      (candidate) => candidate.id === targetContainerId,
    );
    if (!target || target.type !== "container")
      return { valid: false, errors: ["Conteneur de destination invalide."] };
    if (target.id === item.id)
      return {
        valid: false,
        errors: ["Un conteneur ne peut pas se contenir lui-même."],
      };
    if (descendantIds(items, item.id).includes(target.id))
      return {
        valid: false,
        errors: ["Déplacement refusé : il créerait une boucle de conteneurs."],
      };
  }
  const moved = withMovedParent(items, itemId, targetContainerId);
  const existingErrors = new Set(
    presentInventory(items)
      .diagnostics.filter((diagnostic) => diagnostic.level === "error")
      .map((diagnostic) => diagnostic.message),
  );
  const presentation = presentInventory(moved);
  const errors = presentation.diagnostics
    .filter(
      (diagnostic) =>
        diagnostic.level === "error" && !existingErrors.has(diagnostic.message),
    )
    .map((diagnostic) => diagnostic.message);
  return { valid: errors.length === 0, errors };
}

function stackPayload(item: InventoryItemLike): Record<string, unknown> {
  const system = clone(item.system ?? {});
  delete system.derived;
  if (system.meta) {
    delete system.meta.relisId;
    delete system.meta.revision;
  }
  if (system.provenance) {
    delete system.provenance.localRevision;
    delete system.provenance.manualOverrides;
    delete system.provenance.upgradeState;
  }
  if (system.physical) {
    delete system.physical.quantity;
    system.physical.containerRef = referenceIdentity(
      system.physical.containerRef,
    );
    system.physical.custodianRef = referenceIdentity(
      system.physical.custodianRef,
    );
  }
  return {
    name: item.name,
    type: item.type,
    system: stableValue(system),
  };
}

export function canMergeStacks(
  first: InventoryItemLike,
  second: InventoryItemLike,
): boolean {
  if (first.id === second.id) return false;
  if (
    [first, second].some((item) =>
      ["readied", "equipped", "installed"].includes(
        item.system.physical?.equipState,
      ),
    )
  )
    return false;
  if (!isPhysicalItemType(first.type) || !isPhysicalItemType(second.type))
    return false;
  if (first.type === "container" || second.type === "container") return false;
  if (
    String(first.system.physical?.serialNumber ?? "").trim() ||
    String(second.system.physical?.serialNumber ?? "").trim()
  )
    return false;
  return (
    JSON.stringify(stackPayload(first)) === JSON.stringify(stackPayload(second))
  );
}

export function validateStackSplit(
  item: InventoryItemLike,
  requested: number,
): string[] {
  if (!isPhysicalItemType(item.type)) return ["L’Item n’est pas physique."];
  if (
    ["readied", "equipped", "installed"].includes(
      item.system.physical?.equipState,
    )
  )
    return ["Ranger ou détacher l’objet avant de scinder."];
  if (item.type === "container")
    return ["Un conteneur et son contenu ne peuvent pas être fractionnés."];
  if (String(item.system.physical?.serialNumber ?? "").trim())
    return ["Un objet sérialisé ne peut pas être fractionné."];
  const quantity = Number(item.system.physical?.quantity ?? 0);
  if (!Number.isFinite(requested) || requested <= 0)
    return ["La quantité à scinder doit être strictement positive."];
  if (requested >= quantity)
    return ["La quantité à scinder doit être inférieure à la pile source."];
  if (
    String(item.system.physical?.unit ?? "count") === "count" &&
    !Number.isInteger(requested)
  )
    return ["Une pile comptée se scinde en unités entières."];
  return [];
}

export function inventoryContainerTargets(
  items: InventoryItemLike[],
  itemId: string,
): InventoryItemLike[] {
  const forbidden = new Set([itemId, ...descendantIds(items, itemId)]);
  return items.filter(
    (item) => item.type === "container" && !forbidden.has(item.id),
  );
}
