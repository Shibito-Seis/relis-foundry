import { referenceIdentity, type InventoryItemLike } from "./inventory";
import {
  installedOn,
  TECHNICAL_SLOTS,
  technicalUsage,
} from "./equipment-slots";

export interface MaterialDiagnostic {
  level: "warning" | "error";
  message: string;
}

export interface MaterialTreeRow<T = unknown> {
  id: string;
  type: string;
  name: string;
  depth: number;
  parentId?: string | null;
  item?: InventoryItemLike;
  value?: T;
}

const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

function referenceMatches(
  reference: Record<string, any> | undefined,
  item: InventoryItemLike,
): boolean {
  const identity = referenceIdentity(reference);
  if (!identity) return false;
  if (identity === `relis:${String(item.system.meta?.relisId ?? "")}`)
    return true;
  if (item.uuid && identity === `uuid:${item.uuid}`) return true;
  return identity.startsWith("uuid:") && identity.split(".").at(-1) === item.id;
}

function boundedPair(
  current: unknown,
  maximum: unknown,
  label: string,
): MaterialDiagnostic[] {
  const now = finite(current);
  const max = finite(maximum);
  if (now === null && max === null) return [];
  if (now === null || max === null)
    return [
      {
        level: "warning",
        message: `${label} incomplet : valeur actuelle et maximum sont requis ensemble.`,
      },
    ];
  return now > max
    ? [
        {
          level: "error",
          message: `${label} invalide : ${now} dépasse le maximum ${max}.`,
        },
      ]
    : [];
}

export function materialDiagnostics(
  item: InventoryItemLike,
): MaterialDiagnostic[] {
  const errors: MaterialDiagnostic[] = [];
  const weapon = item.system.weaponProfile ?? {};
  const supply = item.system.supplyProfile ?? {};
  const protection = item.system.protectionProfile ?? {};
  const energy = item.system.energyProfile ?? {};
  const durability = item.system.physical?.durability ?? {};

  if (item.type === "weapon") {
    if (
      finite(weapon.handsRequired) !== null &&
      (!Number.isSafeInteger(Number(weapon.handsRequired)) ||
        Number(weapon.handsRequired) > 2)
    )
      errors.push({
        level: "error",
        message: "Le nombre de mains requis doit être un entier de 0 à 2.",
      });
    if (["internal", "detachable", "hybrid"].includes(weapon.feedKind)) {
      if (!String(weapon.chamberId ?? "").trim())
        errors.push({
          level: "error",
          message: "Identifiant de chambre requis pour cette alimentation.",
        });
      if (!String(weapon.pressureClass ?? "").trim())
        errors.push({
          level: "error",
          message: "Classe de pression ou d’énergie requise.",
        });
      if (!(finite(weapon.capacity) ?? 0))
        errors.push({
          level: "error",
          message: "Capacité positive requise pour cette alimentation.",
        });
    }
    if (
      ["detachable", "hybrid"].includes(weapon.feedKind) &&
      !String(weapon.feedInterface ?? "").trim()
    )
      errors.push({
        level: "error",
        message:
          "Interface de chargeur requise pour une alimentation détachable.",
      });
    const loaded = Array.from(weapon.loadSequence ?? []).reduce(
      (sum: number, segment: any) =>
        sum + Math.max(0, Number(segment.quantity)),
      0,
    );
    if (finite(weapon.capacity) !== null && loaded > Number(weapon.capacity))
      errors.push({
        level: "error",
        message: `Séquence interne surchargée : ${loaded}/${weapon.capacity}.`,
      });
    const chamber = Array.from(weapon.chamberLoad ?? []);
    if (
      (!weapon.chamberSeparate && chamber.length) ||
      chamber.length > 1 ||
      chamber.some((segment: any) => Number(segment.quantity) !== 1)
    )
      errors.push({
        level: "error",
        message:
          "Chambre séparée invalide : au plus une munition, uniquement si la source prévoit ce suivi.",
      });
  }
  if (["armor", "equipment"].includes(item.type) && supply.feedKind) {
    if (["internal", "detachable", "hybrid"].includes(supply.feedKind)) {
      if (!String(supply.chamberId ?? "").trim())
        errors.push({
          level: "error",
          message: "Identifiant de chambre requis pour cette alimentation.",
        });
      if (!String(supply.pressureClass ?? "").trim())
        errors.push({
          level: "error",
          message: "Classe de pression ou d’énergie requise.",
        });
      if (!(finite(supply.capacity) ?? 0))
        errors.push({
          level: "error",
          message: "Capacité positive requise pour cette alimentation.",
        });
    }
    if (
      ["detachable", "hybrid"].includes(supply.feedKind) &&
      !String(supply.feedInterface ?? "").trim()
    )
      errors.push({
        level: "error",
        message:
          "Interface de chargeur requise pour une alimentation détachable.",
      });
    const loaded = Array.from(supply.loadSequence ?? []).reduce(
      (sum: number, segment: any) =>
        sum + Math.max(0, Number(segment.quantity)),
      0,
    );
    if (finite(supply.capacity) !== null && loaded > Number(supply.capacity))
      errors.push({
        level: "error",
        message: `Séquence interne surchargée : ${loaded}/${supply.capacity}.`,
      });
    const chamber = Array.from(supply.chamberLoad ?? []);
    if (
      (!supply.chamberSeparate && chamber.length) ||
      chamber.length > 1 ||
      chamber.some((segment: any) => Number(segment.quantity) !== 1)
    )
      errors.push({
        level: "error",
        message:
          "Chambre séparée invalide : au plus une munition, uniquement si la source prévoit ce suivi.",
      });
  }

  if (item.type === "ammunition") {
    const ammo = item.system.ammunitionProfile ?? {};
    if (!String(ammo.chamberId ?? "").trim())
      errors.push({
        level: "warning",
        message:
          "Munition inutilisable tant que son identifiant de chambre manque.",
      });
    if (!String(ammo.pressureClass ?? "").trim())
      errors.push({
        level: "warning",
        message: "Classe de pression ou d’énergie non renseignée.",
      });
  }

  if (item.type === "container" && item.system.containerKind === "magazine") {
    const magazine = item.system.magazineProfile ?? {};
    for (const [key, label] of [
      ["chamberId", "chambre"],
      ["pressureClass", "classe de pression ou d’énergie"],
      ["interfaceId", "interface"],
    ] as const)
      if (!String(magazine[key] ?? "").trim())
        errors.push({
          level: "error",
          message: `Chargeur incomplet : ${label} requise.`,
        });
    if (!(finite(magazine.capacity) ?? 0))
      errors.push({
        level: "error",
        message: "Chargeur incomplet : capacité positive requise.",
      });
  }

  errors.push(
    ...boundedPair(
      durability.structureCurrent,
      durability.structureMaximum,
      "Structure",
    ),
    ...boundedPair(
      protection.barrierCurrent,
      protection.barrierMaximum,
      "Réserve de Barrière",
    ),
    ...boundedPair(energy.current, energy.maximum, "Charge énergétique"),
    ...boundedPair(
      energy.heatCurrent,
      energy.heatMaximum,
      "Chaleur énergétique",
    ),
    ...boundedPair(
      durability.heatCurrent,
      durability.heatMaximum,
      "Chaleur matérielle",
    ),
  );
  if (
    finite(durability.breakingThreshold) !== null &&
    finite(durability.structureMaximum) !== null &&
    Number(durability.breakingThreshold) > Number(durability.structureMaximum)
  )
    errors.push({
      level: "error",
      message: "Le Seuil de brisure dépasse les PV structurels maximaux.",
    });
  if (
    finite(durability.reliability) !== null &&
    (!Number.isSafeInteger(Number(durability.reliability)) ||
      Number(durability.reliability) > 5)
  )
    errors.push({
      level: "error",
      message: "La Fiabilité doit être un entier de 0 à 5.",
    });
  if (
    energy.kind &&
    !String(energy.format ?? "").trim() &&
    energy.kind !== "generator"
  )
    errors.push({
      level: "warning",
      message: "Format énergétique non renseigné : raccordement impossible.",
    });

  if (item.type === "resource" && item.system.currencyProfile?.physicalCash) {
    const currency = item.system.currencyProfile;
    if (!String(currency.currencyId ?? "").trim())
      errors.push({
        level: "error",
        message: "La monnaie physique exige un identifiant de devise.",
      });
    if (!(finite(currency.denomination) ?? 0))
      errors.push({
        level: "error",
        message: "La valeur faciale doit être strictement positive.",
      });
  }
  if (item.type === "consumable") {
    const consumable = item.system.consumableProfile ?? {};
    const usesPerUnit = finite(consumable.usesPerUnit);
    if (
      usesPerUnit !== null &&
      (!Number.isSafeInteger(Number(consumable.usesPerUnit)) ||
        Number(consumable.usesPerUnit) < 1)
    )
      errors.push({
        level: "error",
        message: "Les usages par unité doivent être un entier positif.",
      });
    errors.push(
      ...boundedPair(
        consumable.bufferCurrent,
        consumable.bufferMaximum,
        "Tampon énergétique",
      ),
    );
    if (
      ["grenade", "mine", "charge"].includes(consumable.kind) &&
      !String(consumable.activation ?? "").trim()
    )
      errors.push({
        level: "warning",
        message: "Le mode d’amorçage ou d’activation n’est pas renseigné.",
      });
  }
  return errors;
}

export function ammunitionCompatibility(
  ammunition: InventoryItemLike,
  target: InventoryItemLike,
): string[] {
  if (ammunition.type !== "ammunition")
    return ["L’Item choisi n’est pas une munition."];
  const ammo = ammunition.system.ammunitionProfile ?? {};
  const targetProfile =
    target.type === "container" && target.system.containerKind === "magazine"
      ? (target.system.magazineProfile ?? {})
      : (target.system.weaponProfile ?? target.system.supplyProfile ?? {});
  if (!targetProfile.chamberId)
    return ["La cible ne possède aucun identifiant de chambre exploitable."];
  const errors: string[] = [];
  if (!ammo.chamberId || ammo.chamberId !== targetProfile.chamberId)
    errors.push(
      `Chambre incompatible : ${ammo.chamberId || "non renseignée"} / ${targetProfile.chamberId}.`,
    );
  if (
    !ammo.pressureClass ||
    !targetProfile.pressureClass ||
    ammo.pressureClass !== targetProfile.pressureClass
  )
    errors.push(
      `Classe de pression ou d’énergie incompatible : ${ammo.pressureClass || "non renseignée"} / ${targetProfile.pressureClass || "non renseignée"}.`,
    );
  const targetInterface = String(
    targetProfile.interfaceId ?? targetProfile.feedInterface ?? "",
  );
  const interfaces = Array.from(ammo.feedInterfaces ?? [], String);
  if (
    targetInterface &&
    (!interfaces.length || !interfaces.includes(targetInterface))
  )
    errors.push(
      `Interface ${targetInterface} absente des compatibilités de la munition.`,
    );
  return errors;
}

export function magazineCompatibility(
  magazine: InventoryItemLike,
  weapon: InventoryItemLike,
): string[] {
  if (
    magazine.type !== "container" ||
    magazine.system.containerKind !== "magazine"
  )
    return ["L’Item choisi n’est pas un chargeur détachable."];
  if (!["weapon", "armor", "equipment"].includes(weapon.type))
    return ["L’hôte choisi ne reçoit pas ce type de chargeur."];
  const magazineProfile = magazine.system.magazineProfile ?? {};
  const weaponProfile =
    weapon.system.weaponProfile ?? weapon.system.supplyProfile ?? {};
  const errors: string[] = [];
  if (!["detachable", "hybrid"].includes(weaponProfile.feedKind))
    errors.push("L’hôte n’accepte aucun chargeur détachable.");
  for (const [magazineKey, weaponKey, label] of [
    ["chamberId", "chamberId", "chambre"],
    ["pressureClass", "pressureClass", "classe de pression ou d’énergie"],
    ["interfaceId", "feedInterface", "interface"],
  ] as const) {
    const first = String(magazineProfile[magazineKey] ?? "");
    const second = String(weaponProfile[weaponKey] ?? "");
    if (!first || !second || first !== second)
      errors.push(
        `${label} incompatible : ${first || "non renseignée"} / ${second || "non renseignée"}.`,
      );
  }
  return errors;
}

export function energyCompatibility(
  source: InventoryItemLike,
  target: InventoryItemLike,
): string[] {
  const from = source.system.energyProfile ?? {};
  const to = target.system.energyProfile ?? {};
  const errors: string[] = [];
  if (source.id === target.id)
    errors.push("Une réserve ne peut pas se recharger elle-même.");
  if (!["battery", "generator", "internal"].includes(from.kind))
    errors.push(
      "La source ne possède aucune réserve énergétique transférable.",
    );
  if (!to.kind) errors.push("La cible ne possède aucun profil énergétique.");
  if (!from.format || !to.format || from.format !== to.format)
    errors.push(
      `Format incompatible : ${from.format || "non renseigné"} / ${to.format || "non renseigné"}.`,
    );
  if (
    to.powerClass &&
    (!from.outputClass || from.outputClass !== to.powerClass)
  )
    errors.push(
      `Classe de puissance incompatible : ${from.outputClass || "sortie non renseignée"} / ${to.powerClass}.`,
    );
  if (!(finite(from.current) ?? 0)) errors.push("La source est vide.");
  if (finite(to.maximum) === null || finite(to.current) === null)
    errors.push("La réserve cible est incomplète.");
  else if (Number(to.current) >= Number(to.maximum))
    errors.push("La réserve cible est déjà pleine.");
  return errors;
}

function isCarriedByBody(
  item: InventoryItemLike,
  items: InventoryItemLike[],
  bodyId: string,
): boolean {
  const visited = new Set<string>();
  let current: InventoryItemLike | undefined = item;
  while (current) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    const physical: Record<string, any> = current.system.physical ?? {};
    if (physical.equipState === "ground") return false;
    if (bodyId && physical.bodyId && physical.bodyId !== bodyId) return false;
    const reference: Record<string, any> | undefined =
      physical.equipState === "installed" && referenceIdentity(physical.hostRef)
        ? physical.hostRef
        : physical.containerRef;
    if (!referenceIdentity(reference)) return true;
    const parent: InventoryItemLike | undefined = items.find((candidate) =>
      referenceMatches(reference, candidate),
    );
    if (!parent) return false;
    current = parent;
  }
  return true;
}

export function cashSummary(items: InventoryItemLike[], bodyId = "") {
  const groups = new Map<
    string,
    { id: string; label: string; amount: number; itemIds: string[] }
  >();
  for (const item of items) {
    const currency = item.system.currencyProfile ?? {};
    if (item.type !== "resource" || currency.physicalCash !== true) continue;
    if (!isCarriedByBody(item, items, bodyId)) continue;
    if (["destroyed", "broken"].includes(item.system.physical?.condition))
      continue;
    const id = String(currency.currencyId ?? "").trim();
    if (!id) continue;
    const amount =
      Math.max(0, Number(item.system.physical?.quantity ?? 0)) *
      Math.max(0, Number(currency.denomination ?? 0));
    const current = groups.get(id) ?? {
      id,
      label: String(currency.currencyLabel ?? id).trim() || id,
      amount: 0,
      itemIds: [],
    };
    current.amount = Number((current.amount + amount).toPrecision(12));
    current.itemIds.push(item.id);
    groups.set(id, current);
  }
  return Array.from(groups.values()).sort((first, second) =>
    first.label.localeCompare(second.label, "fr", { sensitivity: "base" }),
  );
}

/** Reorders presentation rows only. Physical truth remains containerRef/hostRef. */
export function nestInstalledRows<T extends MaterialTreeRow>(
  incoming: T[],
  items: InventoryItemLike[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]));
  const inputRows = new Map(incoming.map((row) => [row.id, row]));
  const parent = new Map<string, string | null>();
  for (const row of incoming) {
    const item = byId.get(row.id);
    const host =
      item && item.system.physical?.equipState === "installed"
        ? items.find((candidate) =>
            referenceMatches(item.system.physical?.hostRef, candidate),
          )
        : null;
    parent.set(row.id, host?.id ?? row.parentId ?? null);
  }
  const children = new Map<string | null, string[]>();
  for (const row of incoming) {
    const parentId = parent.get(row.id) ?? null;
    const list = children.get(parentId) ?? [];
    list.push(row.id);
    children.set(parentId, list);
  }
  for (const list of children.values())
    list.sort((firstId, secondId) => {
      const first = byId.get(firstId)!;
      const second = byId.get(secondId)!;
      const firstOrder = Number(first.system.ammunitionProfile?.loadOrder ?? 0);
      const secondOrder = Number(
        second.system.ammunitionProfile?.loadOrder ?? 0,
      );
      return (
        firstOrder - secondOrder || first.name.localeCompare(second.name, "fr")
      );
    });
  const output: T[] = [];
  const visited = new Set<string>();
  const append = (id: string, depth: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    const row = inputRows.get(id);
    if (!row) return;
    output.push({ ...row, depth, parentId: parent.get(id) ?? null });
    for (const child of children.get(id) ?? []) append(child, depth + 1);
  };
  for (const id of children.get(null) ?? []) append(id, 0);
  for (const row of incoming) append(row.id, 0);
  return output;
}

export function materialStatus(
  item: InventoryItemLike,
  items: InventoryItemLike[],
): string[] {
  const status: string[] = [];
  const durability = item.system.physical?.durability ?? {};
  const weapon = item.system.weaponProfile ?? {};
  const supply = item.system.supplyProfile ?? {};
  const feed = item.type === "weapon" ? weapon : supply;
  if (
    ["weapon", "armor", "equipment"].includes(item.type) &&
    ["internal", "hybrid"].includes(feed.feedKind)
  ) {
    const loaded = Array.from(feed.loadSequence ?? []).reduce(
      (sum: number, segment: any) => sum + Number(segment.quantity ?? 0),
      0,
    );
    status.push(`Magasin interne : ${loaded}/${feed.capacity ?? "?"}`);
  }
  if (
    ["weapon", "armor", "equipment"].includes(item.type) &&
    feed.chamberSeparate
  ) {
    const chamber = Array.from(feed.chamberLoad ?? []) as any[];
    status.push(
      chamber.length
        ? `Chambre : ${chamber[0]?.ammunitionRef?.labelSnapshot || "munition chargée"}`
        : "Chambre vide",
    );
  }
  if (
    ["weapon", "armor", "equipment"].includes(item.type) &&
    ["detachable", "hybrid"].includes(feed.feedKind)
  ) {
    const magazine = items.find(
      (candidate) =>
        candidate.type === "container" &&
        candidate.system.containerKind === "magazine" &&
        installedOn(candidate, item),
    );
    status.push(magazine ? `Chargeur : ${magazine.name}` : "Chargeur vide");
  }
  const energy = item.system.energyProfile ?? {};
  if (energy.kind)
    status.push(
      `Énergie : ${energy.current ?? "?"}/${energy.maximum ?? "?"} CE`,
    );
  const charges = item.system.physical?.charges ?? {};
  if (charges.current !== null && charges.current !== undefined)
    status.push(`Usages : ${charges.current}/${charges.maximum ?? "?"}`);
  if (
    finite(durability.structureCurrent) !== null ||
    finite(durability.structureMaximum) !== null
  )
    status.push(
      `Structure : ${durability.structureCurrent ?? "?"}/${durability.structureMaximum ?? "?"} PV`,
    );
  if (finite(durability.reliability) !== null)
    status.push(`Fiabilité : ${durability.reliability}/5`);
  if (item.type === "container" && item.system.containerKind === "magazine") {
    const ammunition = items.filter(
      (candidate) =>
        candidate.type === "ammunition" &&
        referenceMatches(candidate.system.physical?.containerRef, item),
    );
    const loaded = ammunition.reduce(
      (sum, candidate) =>
        sum + Number(candidate.system.physical?.quantity ?? 0),
      0,
    );
    status.push(
      `Munitions : ${loaded}/${item.system.magazineProfile?.capacity ?? "?"}`,
    );
  }
  return status;
}

export function hostPortSummary(
  items: InventoryItemLike[],
  host: InventoryItemLike,
) {
  const profile = host.system.physical?.equipmentProfile ?? {};
  const usage = technicalUsage(items, host);
  return Object.entries(profile.providedSlots ?? {})
    .filter(([, value]) => Number(value) > 0)
    .map(([key, value]) => {
      const installed = items.filter(
        (item) =>
          installedOn(item, host) &&
          Number(
            item.system.physical?.equipmentProfile?.requiredSlots?.[key] ?? 0,
          ) > 0,
      );
      return {
        key,
        label: TECHNICAL_SLOTS[key] ?? key,
        capacity: Number(value),
        used: Number(usage[key] ?? 0),
        free: Math.max(0, Number(value) - Number(usage[key] ?? 0)),
        installed,
      };
    });
}
