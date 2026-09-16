import {
  presentInventory,
  referenceIdentity,
  type InventoryItemLike,
} from "./inventory";
import { initialReference } from "../data/item-defaults";
import { physicalUnitMass } from "./physical-mass";

export const EQUIPMENT_LABELS: Record<string, string> = {
  stored: "Rangé",
  carried: "Porté sur soi",
  readied: "Préparé — mains à préciser",
  "held-one": "Tenu à une main",
  "held-two": "Tenu à deux mains",
  equipped: "Équipé",
  installed: "Installé",
  ground: "Au sol",
};
export interface EquipmentRequest {
  itemId: string;
  state: string;
  hostId?: string;
}
export interface EquipmentBody {
  id: string;
  name?: string;
  size?: string;
  nature?: string;
  carrying?: Record<string, any>;
}

export function equipmentLinked(
  items: InventoryItemLike[],
  itemId: string,
): boolean {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) return false;
  return (
    Boolean(referenceIdentity(item.system.physical?.hostRef)) ||
    items.some(
      (entry) =>
        entry.system.physical?.hostRef?.uuid === item.uuid &&
        Boolean(item.uuid),
    )
  );
}

export function unitMass(item: InventoryItemLike): number | null {
  return physicalUnitMass(item.system.physical ?? {});
}

export function equipmentState(item: InventoryItemLike): string {
  const physical = item.system.physical ?? {};
  return physical.equipState === "readied"
    ? physical.hands === 2
      ? "held-two"
      : physical.hands === 1
        ? "held-one"
        : "readied"
    : (physical.equipState ?? "stored");
}

export function equipmentStates(item: InventoryItemLike): string[] {
  const profile = item.system.physical?.equipmentProfile ?? {};
  const family =
    profile.family ||
    (item.type === "weapon"
      ? "manipulable"
      : ["armor", "equipment", "container"].includes(item.type)
        ? "wearable"
        : "resource");
  const states =
    family === "manipulable"
      ? ["carried", "held-one", "held-two", "ground"]
      : family === "wearable"
        ? ["carried", "equipped", "ground"]
        : ["stored", "carried", "ground"];
  if (profile.installable === true) states.push("installed");
  // An explicit return to storage is always possible; container movement remains separate.
  if (!states.includes("stored")) states.unshift("stored");
  return states;
}

function ancestors(
  items: InventoryItemLike[],
  itemId: string,
): InventoryItemLike[] {
  const rows = presentInventory(items).rows;
  const result: InventoryItemLike[] = [];
  const seen = new Set([itemId]);
  let row = rows.find((entry) => entry.item.id === itemId);
  while (row?.parentId && !seen.has(row.parentId)) {
    seen.add(row.parentId);
    row = rows.find((entry) => entry.item.id === row!.parentId);
    if (row) result.push(row.item);
  }
  return result;
}

function equipmentChain(items: InventoryItemLike[], itemId: string) {
  const rows = presentInventory(items).rows;
  const chain: InventoryItemLike[] = [];
  const seen = new Set<string>();
  let invalid = false;
  let current = items.find((item) => item.id === itemId);
  while (current) {
    if (seen.has(current.id)) {
      invalid = true;
      break;
    }
    seen.add(current.id);
    chain.push(current);
    const row = rows.find((entry) => entry.item.id === current!.id);
    if (row?.orphaned || row?.cyclic) invalid = true;
    const host = current.system.physical?.hostRef;
    if (referenceIdentity(host)) {
      if (row?.parentId) invalid = true;
      current = items.find(
        (entry) =>
          (host.uuid && entry.uuid === host.uuid) ||
          (host.relisId && entry.system.meta?.relisId === host.relisId),
      );
      if (!current) invalid = true;
    } else
      current = row?.parentId
        ? items.find((entry) => entry.id === row.parentId)
        : undefined;
  }
  return { chain, invalid };
}

export function equipmentPlan(
  items: InventoryItemLike[],
  body: EquipmentBody,
  request: EquipmentRequest,
) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const item = items.find((entry) => entry.id === request.itemId);
  if (!item)
    return {
      errors: ["Item absent."],
      warnings,
      patch: {},
      duration: "Non renseignée",
    };
  const physical = item.system.physical ?? {};
  const profile = physical.equipmentProfile ?? {};
  const state = request.state;
  if (!body.id) errors.push("Corps actif introuvable.");
  const lineage = equipmentChain(items, item.id);
  const chain = lineage.chain;
  if (lineage.invalid)
    errors.push("Chaîne de conteneurs ou d’installation invalide.");
  const rows = presentInventory(items).rows;
  if (!equipmentStates(item).includes(state))
    errors.push("État incompatible avec cet objet.");
  if (
    rows.some(
      (row) =>
        chain.some((entry) => entry.id === row.item.id) &&
        (row.cyclic || row.orphaned),
    )
  )
    errors.push("Localisation invalide : corriger les diagnostics.");
  if (
    chain.some(
      (entry) =>
        entry.system.physical?.accessibility === "unavailable" ||
        (["restricted", "sealed"].includes(entry.system.accessRule) &&
          entry.id !== item.id) ||
        (entry.flags?.relis?.inventoryTransfer?.state ?? "complete") !==
          "complete",
    )
  )
    errors.push("Objet ou contenant indisponible.");
  if (
    chain.some(
      (entry) =>
        entry.system.physical?.bodyId &&
        entry.system.physical.bodyId !== body.id,
    )
  )
    errors.push(
      "Objet associé à un autre corps : aucun déplacement automatique.",
    );
  if (
    chain
      .slice(1)
      .some((entry) => entry.system.physical?.equipState === "ground") &&
    state !== "ground"
  )
    errors.push("Reprendre d’abord le conteneur au sol ou l’hôte posé au sol.");
  if (
    !(Number(physical.quantity) > 0) ||
    !Number.isFinite(Number(physical.quantity))
  )
    errors.push("Quantité invalide.");
  if (physical.unit === "count" && !Number.isInteger(Number(physical.quantity)))
    errors.push("Quantité comptée non entière.");
  const active = ["held-one", "held-two", "equipped", "installed"].includes(
    state,
  );
  if (active && (Number(physical.quantity) !== 1 || physical.unit !== "count"))
    errors.push("Scinder une unité avant de la tenir, équiper ou installer.");
  if (active && ["broken", "destroyed"].includes(physical.condition))
    errors.push("Objet brisé ou détruit.");
  if (active && profile.sizes?.length && !profile.sizes.includes(body.size))
    errors.push("Taille incompatible avec le corps actif.");
  if (
    active &&
    profile.natures?.length &&
    !profile.natures.includes(body.nature)
  )
    errors.push("Nature corporelle incompatible.");
  const hands = state === "held-two" ? 2 : state === "held-one" ? 1 : 0;
  const others = items.filter(
    (entry) =>
      entry.id !== item.id &&
      (entry.system.physical?.bodyId || body.id) === body.id,
  );
  const usedHands = others.reduce(
    (sum, entry) =>
      sum +
      (equipmentState(entry) === "held-two"
        ? 2
        : equipmentState(entry) === "held-one"
          ? 1
          : 0),
    0,
  );
  if (hands && others.some((entry) => equipmentState(entry) === "readied"))
    errors.push("Préciser d’abord les mains des objets anciennement préparés.");
  if (
    hands &&
    (body.carrying?.hands == null ||
      !Number.isInteger(Number(body.carrying.hands)) ||
      Number(body.carrying.hands) < 0)
  )
    errors.push("Nombre de mains utilisables non renseigné pour ce corps.");
  else if (hands && usedHands + hands > Number(body.carrying?.hands))
    errors.push("Mains utilisables insuffisantes.");
  if (
    state === "equipped" &&
    profile.slot &&
    others.some(
      (entry) =>
        equipmentState(entry) === "equipped" &&
        entry.system.physical?.equipmentProfile?.slot === profile.slot,
    )
  )
    errors.push("Emplacement d’équipement déjà occupé.");
  const host = items.find((entry) => entry.id === request.hostId);
  if (state === "installed") {
    if (!host || host.id === item.id)
      errors.push("Hôte d’installation invalide.");
    else {
      if (
        Number(host.system.physical?.quantity) !== 1 ||
        host.system.physical?.unit !== "count"
      )
        errors.push("L’hôte doit être un exemplaire unique compté.");
      const hostLineage = equipmentChain(items, host.id);
      if (
        hostLineage.invalid ||
        hostLineage.chain.some((entry) => entry.id === item.id)
      )
        errors.push("Cycle ou chaîne d’installation invalide.");
      const hostChain = hostLineage.chain;
      if (hostChain.some((entry) => ancestors(items, entry.id).length > 0))
        errors.push("Sortir l’hôte de son conteneur avant l’installation.");
      if (
        hostChain.some(
          (entry) =>
            entry.system.physical?.equipState === "ground" ||
            (entry.system.physical?.bodyId &&
              entry.system.physical.bodyId !== body.id) ||
            entry.system.physical?.accessibility === "unavailable" ||
            (entry.id !== host.id &&
              ["restricted", "sealed"].includes(entry.system.accessRule)),
        )
      )
        errors.push("Hôte hors de portée du corps actif.");
      if (
        host.system.physical?.accessibility === "unavailable" ||
        (host.flags?.relis?.inventoryTransfer?.state ?? "complete") !==
          "complete"
      )
        errors.push("Hôte indisponible.");
      if (
        host.system.physical?.bodyId &&
        host.system.physical.bodyId !== body.id
      )
        errors.push("Hôte sur un autre corps.");
      if (profile.hostTypes?.length && !profile.hostTypes.includes(host.type))
        errors.push("Type d’hôte incompatible.");
      if (
        profile.slot &&
        others.some(
          (entry) =>
            entry.system.physical?.hostRef?.uuid === host.uuid &&
            entry.system.physical?.equipmentProfile?.slot === profile.slot,
        )
      )
        errors.push("Slot d’installation occupé.");
    }
  }
  if (active && !profile.sizes?.length && !profile.natures?.length)
    warnings.push(
      "Aucune restriction corporelle déclarée : compatibilité à vérifier selon la source.",
    );
  if (equipmentState(item) === "installed" && state === "stored")
    warnings.push(
      "L’objet sera détaché de son hôte et rangé dans l’inventaire principal.",
    );
  if (active && !profile.duration)
    warnings.push(
      "Temps et aide nécessaires à arbitrer selon la règle ou le MJ.",
    );
  const patch: Record<string, unknown> = {
    "system.physical.equipState": hands ? "readied" : state,
    "system.physical.hands": hands,
    "system.physical.bodyId":
      state === "ground" || state === "installed" ? "" : body.id,
    "system.physical.hostRef":
      state === "installed" && host
        ? {
            ...initialReference(),
            uuid: host.uuid,
            documentName: "Item",
            state: "resolved",
            labelSnapshot: host.name,
          }
        : initialReference(),
  };
  if (state !== "stored") {
    patch["system.physical.containerRef"] = initialReference();
    patch["system.physical.locationKey"] =
      state === "ground" ? "ground" : "body";
  }
  if (state === "stored" && !referenceIdentity(physical.containerRef))
    patch["system.physical.locationKey"] = "actor-cargo";
  if (state !== "stored" && ancestors(items, item.id).length)
    warnings.push(
      "L’objet sera sorti de son conteneur ; aucun autre objet ne sera déplacé.",
    );
  return {
    errors,
    warnings,
    patch,
    duration: String(profile.duration || "Non renseignée"),
  };
}

export function carriedMass(items: InventoryItemLike[], body: EquipmentBody) {
  let mass = 0;
  let missing = 0;
  for (const item of items) {
    const { chain, invalid } = equipmentChain(items, item.id);
    if (
      chain.some(
        (entry) =>
          entry.system.physical?.equipState === "ground" ||
          (entry.system.physical?.bodyId &&
            entry.system.physical.bodyId !== body.id),
      )
    )
      continue;
    if (invalid) {
      missing++;
      continue;
    }
    const p = item.system.physical ?? {};
    const quantity = Number(p.quantity);
    const each = unitMass(item);
    if (
      each == null ||
      !Number.isFinite(Number(each)) ||
      Number(each) < 0 ||
      !Number.isFinite(quantity) ||
      quantity < 0
    )
      missing++;
    else mass += Number(each) * quantity;
  }
  mass = Math.round(mass * 1e6) / 1e6;
  const loaded = Number(body.carrying?.loaded);
  const overloaded = Number(body.carrying?.overloaded);
  const defined =
    Number.isFinite(loaded) &&
    loaded > 0 &&
    Number.isFinite(overloaded) &&
    overloaded > loaded;
  const status = !defined
    ? "Seuils non renseignés"
    : mass >= overloaded
      ? "Surchargé"
      : mass >= loaded
        ? "Chargé"
        : missing
          ? "Charge incomplète"
          : "Charge normale";
  return {
    mass,
    missing,
    defined,
    loaded,
    overloaded,
    status,
    meterValue: defined ? Math.min(mass, overloaded) : 0,
    percent: defined ? Math.min(100, (mass / overloaded) * 100) : 0,
    marker: defined ? (loaded / overloaded) * 100 : 0,
  };
}

export function projectEquipment(
  items: InventoryItemLike[],
  body: EquipmentBody,
  requests: EquipmentRequest[],
  assisted = false,
) {
  const projected: InventoryItemLike[] = JSON.parse(JSON.stringify(items));
  const rows: {
    request: EquipmentRequest;
    name: string;
    errors: string[];
    warnings: string[];
    duration: string;
    patch: Record<string, unknown>;
  }[] = [];
  const duplicate = new Set<string>();
  // Releases precede acquisitions, preserving the original identity of every Item.
  const ordered = [...requests].sort(
    (a, b) =>
      Number(
        ["equipped", "held-one", "held-two", "installed"].includes(a.state),
      ) -
      Number(
        ["equipped", "held-one", "held-two", "installed"].includes(b.state),
      ),
  );
  for (const request of ordered) {
    const plan = equipmentPlan(projected, body, request);
    if (duplicate.has(request.itemId))
      plan.errors.push("Item répété dans l’ensemble.");
    duplicate.add(request.itemId);
    rows.push({
      request,
      name:
        items.find((item) => item.id === request.itemId)?.name ?? "Item absent",
      ...plan,
    });
    if (!plan.errors.length) {
      const item = projected.find((entry) => entry.id === request.itemId)!;
      for (const [path, value] of Object.entries(plan.patch))
        item.system.physical[path.slice("system.physical.".length)] = value;
    }
  }
  const failed = rows.some((row) => row.errors.length);
  return {
    rows,
    updates:
      failed && !assisted
        ? []
        : rows
            .filter((row) => !row.errors.length)
            .map((row) => ({ _id: row.request.itemId, ...row.patch })),
    mass: carriedMass(failed && !assisted ? items : projected, body),
    failed,
  };
}
