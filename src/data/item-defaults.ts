import { CONTENT_VERSION, RULES_VERSION, SCHEMA_VERSION } from "../config";
import { createRelisId } from "../utils/ulid";

export const PHYSICAL_ITEM_TYPES = [
  "weapon",
  "armor",
  "equipment",
  "consumable",
  "ammunition",
  "resource",
  "container",
] as const;

export const LEGALITY_STATES = [
  "free",
  "declared",
  "regulated",
  "reserved",
  "military",
  "sovereign",
  "prohibited",
  "unrecognized",
] as const;

export const EQUIP_STATES = [
  "stored",
  "carried",
  "readied",
  "equipped",
  "installed",
] as const;

export const ITEM_CONDITIONS = [
  "intact",
  "worn",
  "damaged",
  "broken",
  "destroyed",
] as const;

export const UPGRADE_STATES = [
  "current",
  "sourceMissing",
  "updateAvailable",
  "locallyModified",
  "conflict",
  "unknown",
] as const;

export const QUANTITY_UNITS = ["count", "kg", "g", "l", "ml", "m"] as const;

type RecordLike = Record<string, any>;
type IdFactory = () => string;

export function isPhysicalItemType(type: string): boolean {
  return (PHYSICAL_ITEM_TYPES as readonly string[]).includes(type);
}

export function createWorldItemId(
  idFactory: IdFactory = createRelisId,
): string {
  return `WLD-ITM-${idFactory()}`;
}

export function initialReference(overrides: RecordLike = {}): RecordLike {
  return {
    relisId: "",
    uuid: "",
    documentName: "",
    type: "",
    state: "unresolved",
    labelSnapshot: "",
    missingPolicy: "diagnose",
    ...overrides,
  };
}

export function initialItemMeta(
  idFactory: IdFactory = createRelisId,
): RecordLike {
  return {
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
    relisId: createWorldItemId(idFactory),
    sourceRef: initialReference(),
    sourceVersion: "",
    revision: 0,
    status: "draft",
    causeRefs: [],
    tags: [],
  };
}

export function initialItemProvenance(): RecordLike {
  return {
    acquisitionKind: "unknown",
    acquiredFromRef: initialReference(),
    acquiredAt: null,
    lotId: "",
    localRevision: 0,
    manualOverrides: [],
    upgradeState: "unknown",
  };
}

export function initialPhysicalState(): RecordLike {
  return {
    quantity: 1,
    unit: "count",
    massEach: null,
    volumeEach: null,
    bulkEach: null,
    containerRef: initialReference(),
    locationKey: "",
    custodianRef: initialReference(),
    equipState: "stored",
    condition: "intact",
    wear: 0,
    charges: { current: null, maximum: null, unit: "charge" },
    identified: true,
  };
}

function record(value: unknown): RecordLike {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RecordLike)
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function finiteNumber(
  value: unknown,
  fallback: number | null,
  minimum?: number,
  maximum?: number,
): number | null {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum ?? parsed, Math.max(minimum ?? parsed, parsed));
}

function integer(
  value: unknown,
  fallback: number,
  minimum = 0,
  maximum?: number,
): number {
  return Math.trunc(
    finiteNumber(value, fallback, minimum, maximum) ?? fallback,
  );
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value.filter((entry): entry is string => typeof entry === "string"),
    ),
  );
}

function referenceArray(value: unknown): RecordLike[] {
  return Array.isArray(value)
    ? value.map((entry) => normalizeReference(entry))
    : [];
}

export function normalizeReference(value: unknown): RecordLike {
  const source = record(value);
  return initialReference({
    ...source,
    relisId: text(source.relisId),
    uuid: text(source.uuid),
    documentName: text(source.documentName),
    type: text(source.type),
    state: text(source.state, "unresolved") || "unresolved",
    labelSnapshot: text(source.labelSnapshot),
    missingPolicy: text(source.missingPolicy, "diagnose") || "diagnose",
  });
}

export function normalizePhysicalState(value: unknown): RecordLike {
  const source = record(value);
  const charges = record(source.charges);
  const quantity = finiteNumber(source.quantity, 1, 0) ?? 1;
  const unit = (QUANTITY_UNITS as readonly string[]).includes(source.unit)
    ? source.unit
    : "count";
  return {
    ...initialPhysicalState(),
    ...source,
    quantity: unit === "count" ? Math.trunc(quantity) : quantity,
    unit,
    massEach: finiteNumber(source.massEach, null, 0),
    volumeEach: finiteNumber(source.volumeEach, null, 0),
    bulkEach: finiteNumber(source.bulkEach, null, 0),
    containerRef: normalizeReference(source.containerRef),
    locationKey: text(source.locationKey),
    custodianRef: normalizeReference(source.custodianRef),
    equipState: (EQUIP_STATES as readonly string[]).includes(source.equipState)
      ? source.equipState
      : "stored",
    condition: (ITEM_CONDITIONS as readonly string[]).includes(source.condition)
      ? source.condition
      : "intact",
    wear: integer(source.wear, 0, 0, 6),
    charges: {
      ...charges,
      current: finiteNumber(charges.current, null, 0),
      maximum: finiteNumber(charges.maximum, null, 0),
      unit: text(charges.unit, "charge") || "charge",
    },
    identified: source.identified !== false,
  };
}

export function normalizeItemSystem(
  value: unknown,
  physical: boolean,
  idFactory: IdFactory = createRelisId,
): RecordLike {
  const source = record(value);
  const meta = record(source.meta);
  const provenance = record(source.provenance);
  const referencePrice = record(source.referencePrice);
  const legality = text(source.legality);
  const normalized: RecordLike = {
    ...source,
    meta: {
      ...meta,
      schemaVersion: SCHEMA_VERSION,
      rulesVersion: text(meta.rulesVersion, RULES_VERSION) || RULES_VERSION,
      contentVersion:
        text(meta.contentVersion, CONTENT_VERSION) || CONTENT_VERSION,
      relisId: text(meta.relisId) || createWorldItemId(idFactory),
      sourceRef: normalizeReference(meta.sourceRef),
      sourceVersion: text(meta.sourceVersion),
      revision: integer(meta.revision, 0),
      status: text(meta.status, "draft") || "draft",
      causeRefs: referenceArray(meta.causeRefs),
      tags: stringArray(meta.tags),
    },
    description: text(source.description),
    traits: stringArray(source.traits),
    requirementRefs: referenceArray(source.requirementRefs),
    effectRefs: referenceArray(source.effectRefs),
    level: finiteNumber(source.level, null, 1, 30),
    quality: finiteNumber(source.quality, null, 0, 5),
    rarity: finiteNumber(source.rarity, null, 0, 6),
    legality: (LEGALITY_STATES as readonly string[]).includes(legality)
      ? legality
      : "",
    referencePrice: {
      ...referencePrice,
      amount: finiteNumber(referencePrice.amount, null, 0),
      currencyRef: normalizeReference(referencePrice.currencyRef),
      unit: text(referencePrice.unit, "count") || "count",
      quantityBasis:
        finiteNumber(referencePrice.quantityBasis, 1, Number.EPSILON) ?? 1,
      sourceRefs: referenceArray(referencePrice.sourceRefs),
    },
    manufacturerRef: normalizeReference(source.manufacturerRef),
    provenance: {
      ...initialItemProvenance(),
      ...provenance,
      acquisitionKind: text(provenance.acquisitionKind, "unknown") || "unknown",
      acquiredFromRef: normalizeReference(provenance.acquiredFromRef),
      acquiredAt: finiteNumber(provenance.acquiredAt, null, 0),
      lotId: text(provenance.lotId),
      localRevision: integer(provenance.localRevision, 0),
      manualOverrides: stringArray(provenance.manualOverrides),
      upgradeState: (UPGRADE_STATES as readonly string[]).includes(
        provenance.upgradeState,
      )
        ? provenance.upgradeState
        : "unknown",
    },
  };
  if (physical) normalized.physical = normalizePhysicalState(source.physical);
  return normalized;
}

export function physicalTotals(value: unknown): RecordLike {
  const physical = normalizePhysicalState(value);
  const quantity = Number(physical.quantity);
  const total = (each: unknown): number | null =>
    each === null || !Number.isFinite(Number(each))
      ? null
      : Number((quantity * Number(each)).toPrecision(12));
  return {
    mass: total(physical.massEach),
    volume: total(physical.volumeEach),
    bulk: total(physical.bulkEach),
  };
}

export function buildOwnedItemSystem(
  value: unknown,
  sourceUuid: string,
  sourceName: string,
  sourceType: string,
  physical: boolean,
  idFactory: IdFactory = createRelisId,
): RecordLike {
  const source = normalizeItemSystem(value, physical, idFactory);
  const sourceId = source.meta.relisId;
  return {
    ...source,
    meta: {
      ...source.meta,
      relisId: createWorldItemId(idFactory),
      sourceRef: initialReference({
        relisId: sourceId,
        uuid: sourceUuid,
        documentName: "Item",
        type: sourceType,
        state: sourceUuid ? "resolved" : "unresolved",
        labelSnapshot: sourceName,
      }),
      sourceVersion: source.meta.contentVersion,
      revision: 0,
    },
    provenance: {
      ...source.provenance,
      localRevision: 0,
      manualOverrides: [],
      upgradeState: "current",
    },
  };
}
