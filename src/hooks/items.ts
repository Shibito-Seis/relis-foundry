import { PACKAGE_VERSION, SCHEMA_VERSION, SYSTEM_ID } from "../config";
import {
  buildOwnedItemSystem,
  initialReference,
  isPhysicalItemType,
  normalizeItemSystemForType,
} from "../data/item-defaults";

function sourceUuid(
  data: Record<string, any>,
  options: Record<string, any>,
): string {
  const candidates = [
    options.sourceUuid,
    options.sourceId,
    data._stats?.compendiumSource,
    data.flags?.core?.sourceId,
  ];
  return String(
    candidates.find((candidate) => typeof candidate === "string") ?? "",
  );
}

export function prepareItemCreation(
  item: Item,
  data: Record<string, any>,
  options: Record<string, any> = {},
): void {
  const physical = isPhysicalItemType(item.type);
  const incomingSystem = data.system ?? {};
  const incomingId = String(incomingSystem.meta?.relisId ?? "");
  const inferredSourceUuid = sourceUuid(data, options);
  const isOwnedCopy = Boolean(item.parent && incomingId);
  const isImportedCopy = Boolean(inferredSourceUuid && incomingId);

  if (options.relisInventoryOperation) {
    item.updateSource({
      system: normalizeItemSystemForType(
        item.system ?? incomingSystem,
        item.type,
      ),
    });
    return;
  }

  if (isOwnedCopy || isImportedCopy) {
    item.updateSource({
      system: buildOwnedItemSystem(
        incomingSystem,
        inferredSourceUuid,
        String(data.name ?? item.name),
        String(data.type ?? item.type),
        physical,
      ),
    });
    return;
  }

  item.updateSource({
    system: normalizeItemSystemForType(
      item.system ?? incomingSystem,
      item.type,
    ),
  });
}

function changedPaths(
  value: unknown,
  prefix = "",
  output: string[] = [],
): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    if (prefix) output.push(prefix);
    return output;
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (key.includes(".")) {
      output.push(prefix ? `${prefix}.${key}` : key);
      continue;
    }
    changedPaths(child, prefix ? `${prefix}.${key}` : key, output);
  }
  return output;
}

function requestedValue(
  change: Record<string, any>,
  path: string,
  fallback: unknown,
): unknown {
  if (Object.hasOwn(change, path)) return change[path];
  let current: any = change;
  for (const part of path.split(".")) {
    if (
      !current ||
      typeof current !== "object" ||
      !Object.hasOwn(current, part)
    )
      return fallback;
    current = current[part];
  }
  return current;
}

function setRequestedValue(
  change: Record<string, any>,
  path: string,
  value: unknown,
): void {
  if (Object.hasOwn(change, path)) {
    change[path] = value;
    return;
  }
  const parts = path.split(".");
  let current: any = change;
  for (const part of parts.slice(0, -1)) {
    if (
      !current ||
      typeof current !== "object" ||
      !Object.hasOwn(current, part)
    ) {
      change[path] = value;
      return;
    }
    current = current[part];
  }
  current[parts.at(-1) as string] = value;
}

export function constrainPhysicalItemUpdate(
  item: Item,
  change: Record<string, any>,
): void {
  if (!isPhysicalItemType(item.type)) return;
  const currentUnit = String(item.system.physical?.unit ?? "count");
  const unit = String(
    requestedValue(change, "system.physical.unit", currentUnit),
  );
  const currentQuantity = Number(item.system.physical?.quantity ?? 1);
  const quantity = Number(
    requestedValue(change, "system.physical.quantity", currentQuantity),
  );
  if (
    unit === "count" &&
    Number.isFinite(quantity) &&
    !Number.isInteger(quantity)
  )
    setRequestedValue(
      change,
      "system.physical.quantity",
      Math.max(0, Math.trunc(quantity)),
    );

  const currentContainer = String(
    item.system.physical?.containerRef?.relisId ??
      item.system.physical?.containerRef?.uuid ??
      "",
  );
  const requestedLocation = requestedValue(
    change,
    "system.physical.locationKey",
    item.system.physical?.locationKey ?? "",
  );
  const changesLocation =
    Object.hasOwn(change, "system.physical.locationKey") ||
    Boolean(change.system?.physical && "locationKey" in change.system.physical);
  if (
    changesLocation &&
    String(requestedLocation ?? "").trim() &&
    currentContainer
  )
    setRequestedValue(
      change,
      "system.physical.containerRef",
      initialReference(),
    );
}

export function preventUnsafeContainerDeletion(
  item: Item,
  options: Record<string, any> = {},
): boolean | void {
  if (
    item.type !== "container" ||
    !item.parent ||
    options.relisInventoryOperation
  )
    return;
  const relisId = String(item.system.meta?.relisId ?? "");
  const uuid = String(item.uuid ?? "");
  const contents = (Array.from(item.parent.items ?? []) as Item[]).filter(
    (candidate) => {
      const reference = candidate.system.physical?.containerRef;
      return (
        candidate.id !== item.id &&
        ((relisId && String(reference?.relisId ?? "") === relisId) ||
          (uuid && String(reference?.uuid ?? "") === uuid))
      );
    },
  );
  if (contents.length === 0) return;
  ui.notifications.warn(
    `Suppression refusée : ${item.name} contient encore ${contents.length} ligne(s). Déplacez ou transférez son contenu.`,
  );
  return false;
}

export function trackLocalItemUpdate(
  item: Item,
  change: Record<string, any>,
  options: Record<string, any> = {},
): void {
  if (!item.parent || options.relisMigration || options.relisProvenance) return;
  const paths = changedPaths(change).filter(
    (path) =>
      (path === "name" || path === "img" || path.startsWith("system.")) &&
      !path.startsWith("system.meta.") &&
      !path.startsWith("system.provenance.") &&
      !path.startsWith("system.derived."),
  );
  if (paths.length === 0) return;

  const existing = Array.from(
    item.system.provenance?.manualOverrides ?? [],
    String,
  );
  change["system.provenance.localRevision"] =
    Math.max(
      0,
      Math.trunc(Number(item.system.provenance?.localRevision ?? 0)),
    ) + 1;
  change["system.provenance.manualOverrides"] = Array.from(
    new Set([...existing, ...paths]),
  ).sort();
  if (item.system.meta?.sourceRef?.relisId)
    change["system.provenance.upgradeState"] = "locallyModified";
}

function worldItems(): Item[] {
  const result = new Set<Item>();
  for (const item of Array.from(game.items?.contents ?? game.items ?? []))
    result.add(item as Item);
  for (const actor of Array.from(game.actors?.contents ?? game.actors ?? []))
    for (const item of Array.from((actor as Actor).items ?? []))
      result.add(item as Item);
  return Array.from(result);
}

export async function migrateItemCore(): Promise<number> {
  if (!game.user?.isGM) return 0;
  const migrationId = `10-E2-P-schema-${SCHEMA_VERSION}`;
  const migrationState = game.settings.get(SYSTEM_ID, "migrations.state") ?? {};
  if (migrationState.lastMigrationId === migrationId) return 0;

  const items = worldItems();
  for (const item of items) {
    const source = item.toObject(true).system ?? item.system ?? {};
    await item.update(
      { system: normalizeItemSystemForType(source, item.type) },
      { relisMigration: true },
    );
  }
  await game.settings.set(SYSTEM_ID, "migrations.state", {
    packageVersion: PACKAGE_VERSION,
    state: "completed",
    lastMigrationId: migrationId,
    errors: [],
  });
  console.log(
    `RE:LIS | Migration 10-E2-P : ${items.length} Item(s) contrôlé(s).`,
  );
  return items.length;
}

export function registerItemHooks(): void {
  Hooks.on("preCreateItem", prepareItemCreation);
  Hooks.on("preDeleteItem", preventUnsafeContainerDeletion);
  Hooks.on(
    "preUpdateItem",
    (item: Item, change: Record<string, any>, options: Record<string, any>) => {
      constrainPhysicalItemUpdate(item, change);
      trackLocalItemUpdate(item, change, options);
    },
  );
}
