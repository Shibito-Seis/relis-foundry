import { assertProfilePermission } from "../rules/equipment-classification";
import { slotProfileErrors } from "../rules/equipment-slots";
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

/** Embedded equipment state changes must use the same previewed service. */
export function protectEquipmentUpdate(
  item: Item,
  change: Record<string, any>,
  options: Record<string, any> = {},
): boolean | void {
  if (isPhysicalItemType(item.type) && !options.relisMigration) {
    const prefix = "system.physical.equipmentProfile";
    const paths = changedPaths(change);
    if (
      paths.some((path) => path === prefix || path.startsWith(prefix + "."))
    ) {
      const before = item.system.physical?.equipmentProfile ?? {};
      const after = JSON.parse(
        JSON.stringify(requestedValue(change, prefix, before)),
      );
      for (const key of [
        "slotCosts",
        "wearForm",
        "bodySlots",
        "functionalCategory",
        "piercingLocation",
        "ornamental",
        "shieldHands",
        "family",
        "sizes",
        "natures",
        "hostTypes",
        "requiredSlots",
        "providedSlots",
        "installable",
        "ordinaryLiquid",
        "duration",
        "slot",
        "slotsConfigured",
      ])
        after[key] = requestedValue(change, `${prefix}.${key}`, after[key]);
      // Include dotted subfields (e.g. a composite's slotCosts.bracelet).
      for (const path of paths.filter((path) =>
        path.startsWith(prefix + "."),
      )) {
        const keys = path.slice(prefix.length + 1).split(".");
        if (
          keys.some((key) =>
            ["__proto__", "prototype", "constructor"].includes(key),
          )
        )
          return false;
        const value = requestedValue(change, path, undefined);
        if (value === undefined) continue;
        let current = after;
        for (const key of keys.slice(0, -1)) current = current[key] ??= {};
        current[keys.at(-1)!] = JSON.parse(JSON.stringify(value));
      }
      try {
        assertProfilePermission(before, after, Boolean(game.user?.isGM));
        const errors = slotProfileErrors(after, item.type);
        if (errors.length) throw new Error(errors.join(" "));
      } catch (error) {
        ui.notifications.warn(
          error instanceof Error ? error.message : "Profil refusé.",
        );
        return false;
      }
    }
  }
  if (
    !item.parent ||
    !isPhysicalItemType(item.type) ||
    options.relisInventoryOperation ||
    options.relisMigration
  )
    return;
  if ((item.parent as any).flags?.relis?.equipmentRecovery) {
    ui.notifications.warn(
      "Restaurer d’abord l’opération matérielle ou d’équipement interrompue.",
    );
    return false;
  }
  const paths = changedPaths(change);
  const protectedPaths = ["equipState", "bodyId", "hands", "hostRef"].map(
    (key) => "system.physical." + key,
  );
  if (
    paths.some((path) =>
      protectedPaths.some((key) => path === key || path.startsWith(key + ".")),
    )
  ) {
    ui.notifications.warn(
      "Changer l’état d’équipement depuis l’inventaire de l’Actor.",
    );
    return false;
  }
  if (
    ["readied", "equipped", "installed"].includes(
      item.system.physical?.equipState,
    )
  ) {
    if (
      paths.some(
        (path) =>
          path === "system.physical.locationKey" ||
          path.startsWith("system.physical.containerRef"),
      )
    ) {
      ui.notifications.warn(
        "Ranger ou détacher l’objet avant de modifier directement son emplacement.",
      );
      return false;
    }
    const quantity = requestedValue(
      change,
      "system.physical.quantity",
      item.system.physical.quantity,
    );
    const unit = requestedValue(
      change,
      "system.physical.unit",
      item.system.physical.unit,
    );
    if (Number(quantity) !== 1 || unit !== "count") {
      ui.notifications.warn(
        "Ranger ou détacher l’objet avant de modifier sa quantité ou son unité.",
      );
      return false;
    }
  }
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
  if (item.parent && !options.relisInventoryOperation) {
    const attached = (Array.from(item.parent.items ?? []) as Item[]).filter(
      (entry) =>
        entry.system.physical?.hostRef?.uuid === item.uuid &&
        Boolean(item.uuid),
    );
    if (attached.length || item.system.physical?.hostRef?.uuid) {
      ui.notifications.warn(
        "Détacher les installations avant de supprimer cet objet.",
      );
      return false;
    }
  }
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
      if (protectEquipmentUpdate(item, change, options) === false) return false;
      constrainPhysicalItemUpdate(item, change);
      trackLocalItemUpdate(item, change, options);
    },
  );
}
