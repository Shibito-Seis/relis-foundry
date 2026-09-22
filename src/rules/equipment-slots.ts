import {
  effectiveBodySlots,
  classificationErrors,
  PIERCING_LOCATIONS,
} from "./equipment-classification";
import type { InventoryItemLike } from "./inventory";

/** Bible 41.137: occupancy is distinct from protective coverage. */
export const BODY_SLOTS: Record<string, string> = {
  underlayer: "Sous-couche corporelle",
  armor: "Armure principale",
  underhelmet: "Sous-casque",
  helmet: "Casque principal",
  arms: "Protections de bras",
  legs: "Jambières",
  shield: "Bouclier porté",
  necklace: "Collier",
  bracelet: "Bracelet",
  ring: "Anneau",
  cape: "Cape",
  belt: "Ceinture",
  gloves: "Paire de gants",
  earLeft: "Boucle gauche",
  earRight: "Boucle droite",
  ...Object.fromEntries(
    Object.entries(PIERCING_LOCATIONS).map(([key, label]) => [
      `piercing_${key}`,
      `Piercing · ${label}`,
    ]),
  ),
};
/** Category restricts available choices; selections belong only to the Item. */
export function allowedBodySlots(type: string): Record<string, string> {
  const keys =
    type === "armor"
      ? ["underlayer", "armor", "underhelmet", "helmet", "arms", "legs"]
      : type === "weapon"
        ? ["shield"]
        : ["equipment", "container"].includes(type)
          ? [
              "necklace",
              "bracelet",
              "ring",
              "cape",
              "belt",
              "gloves",
              "helmet",
              "earLeft",
              "earRight",
              ...Object.keys(PIERCING_LOCATIONS).map(
                (key) => `piercing_${key}`,
              ),
            ]
          : [];
  return Object.fromEntries(keys.map((key) => [key, BODY_SLOTS[key]!]));
}
export const ACCESSORY_CAPACITIES: Record<string, number> = {
  necklace: 1,
  bracelet: 2,
  ring: 10,
  cape: 1,
  belt: 1,
  gloves: 1,
  earLeft: 1,
  earRight: 1,
  ...Object.fromEntries(
    Object.keys(PIERCING_LOCATIONS).map((key) => [`piercing_${key}`, 0]),
  ),
};
export function bodySlotCapacity(
  key: string,
  carrying: Record<string, any> = {},
): number {
  const value =
    carrying.accessorySlots?.[key] ?? ACCESSORY_CAPACITIES[key] ?? 1;
  return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}
/** Equipped accessories and held shields reserve their slots; storage does not. */
export function occupiesBodySlot(
  item: InventoryItemLike,
  key: string,
): boolean {
  const p = item.system.physical ?? {};
  return (
    bodySlots(p.equipmentProfile ?? {}).includes(key) &&
    (p.equipState === "equipped" ||
      (key === "shield" && p.equipState === "readied"))
  );
}
/** Bible 41.53: a host provides quantities, a module requires quantities. */
export const TECHNICAL_SLOTS: Record<string, string> = {
  muzzle: "Bouche",
  barrel: "Canon",
  optic: "Optique",
  underbarrel: "Sous-canon",
  stock: "Crosse ou poignée",
  internal: "Interne",
  power: "Alimentation",
  utility: "Utilitaire",
  plates: "Plaques",
  mobility: "Mobilité",
  sensors: "Capteurs",
  environment: "Environnement",
  interface: "Interface",
  edge: "Bord",
  projector: "Projecteur",
};
export function bodySlots(profile: Record<string, any>): string[] {
  return effectiveBodySlots(profile);
}
export function legacySlot(profile: Record<string, any>): string {
  return !profile.slotsConfigured ? String(profile.slot ?? "").trim() : "";
}
export function slotProfileErrors(
  profile: Record<string, any>,
  type?: string,
): string[] {
  const errors: string[] = classificationErrors(profile, type);
  if (profile.bodySlots != null && !Array.isArray(profile.bodySlots))
    errors.push("Liste d’emplacements corporels invalide.");
  for (const key of bodySlots(profile)) {
    if (!Object.hasOwn(BODY_SLOTS, key))
      errors.push(`Emplacement corporel inconnu : ${key}.`);
    else if (type !== undefined && !Object.hasOwn(allowedBodySlots(type), key))
      errors.push(
        `${BODY_SLOTS[key]} : emplacement interdit pour ce type d’objet (${type}). Reconfigurer cette fiche Item.`,
      );
  }
  for (const [key, value] of Object.entries(profile.slotCosts ?? {}))
    if (
      !Object.hasOwn(BODY_SLOTS, key) ||
      !Number.isSafeInteger(value) ||
      Number(value) < 1
    )
      errors.push("Quantité d’occupation corporelle invalide.");
  for (const field of ["requiredSlots", "providedSlots"]) {
    for (const [key, value] of Object.entries(profile[field] ?? {})) {
      if (
        !Object.hasOwn(TECHNICAL_SLOTS, key) ||
        !Number.isSafeInteger(value) ||
        Number(value) < 0
      )
        errors.push(
          `Emplacement technique invalide : ${key} (entier positif ou nul requis).`,
        );
    }
  }
  return errors;
}
export function installedOn(
  item: InventoryItemLike,
  host: InventoryItemLike,
): boolean {
  const ref = item.system.physical?.hostRef;
  return (
    item.system.physical?.equipState === "installed" &&
    Boolean(
      (ref?.uuid && host.uuid && ref.uuid === host.uuid) ||
      (ref?.relisId &&
        host.system.meta?.relisId &&
        ref.relisId === host.system.meta.relisId),
    )
  );
}
export function technicalUsage(
  items: InventoryItemLike[],
  host: InventoryItemLike,
  excludeId = "",
) {
  const used: Record<string, number> = {};
  for (const item of items) {
    if (item.id === excludeId || !installedOn(item, host)) continue;
    for (const [key, value] of Object.entries(
      item.system.physical?.equipmentProfile?.requiredSlots ?? {},
    ))
      used[key] = (used[key] ?? 0) + Number(value);
  }
  return used;
}
export function installationSlotErrors(
  items: InventoryItemLike[],
  item: InventoryItemLike,
  host: InventoryItemLike,
): string[] {
  const p = item.system.physical?.equipmentProfile ?? {},
    h = host.system.physical?.equipmentProfile ?? {};
  const errors = slotProfileErrors(h);
  if (legacySlot(p))
    errors.push(
      "Ancien emplacement d’installation à reconfigurer dans la fiche Item.",
    );
  if (
    items.some(
      (entry) =>
        entry.id !== item.id &&
        installedOn(entry, host) &&
        legacySlot(entry.system.physical?.equipmentProfile ?? {}),
    )
  )
    errors.push(
      "Reconfigurer les anciens emplacements des modules déjà installés sur cet hôte.",
    );
  const used = technicalUsage(items, host, item.id);
  for (const key of Object.keys(TECHNICAL_SLOTS)) {
    const required = Number(p.requiredSlots?.[key] ?? 0);
    const occupied = used[key] ?? 0,
      capacity = Number(h.providedSlots?.[key] ?? 0);
    if (!Number.isFinite(occupied) || occupied + required > capacity)
      errors.push(
        `${TECHNICAL_SLOTS[key]} sur ${host.name} : ${required} requis, ${occupied} occupé(s), ${capacity} disponible(s) au total.`,
      );
  }
  return errors;
}
export function slotSummary(profile: Record<string, any>): string {
  if (legacySlot(profile))
    return `Ancien emplacement à reconfigurer : ${legacySlot(profile)}`;
  return (
    bodySlots(profile)
      .map(
        (key) =>
          `${BODY_SLOTS[key] ?? `Inconnu : ${key}`}${slotCost(profile, key) > 1 ? ` × ${slotCost(profile, key)}` : ""}`,
      )
      .join(" + ") || "Aucun emplacement corporel déclaré"
  );
}
export function technicalSummary(
  profile: Record<string, any>,
  field: string,
): string {
  return (
    Object.entries(profile[field] ?? {})
      .filter(([, n]) => Number(n) > 0)
      .map(([key, n]) => `${TECHNICAL_SLOTS[key] ?? key} × ${n}`)
      .join(" ; ") || "Aucun"
  );
}

export function slotCost(profile: Record<string, any>, key: string): number {
  return profile.wearForm === "composite"
    ? Number(profile.slotCosts?.[key] ?? 1)
    : 1;
}
