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
};
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
  return Array.isArray(profile.bodySlots)
    ? [...new Set<string>(profile.bodySlots)]
    : [];
}
export function legacySlot(profile: Record<string, any>): string {
  return !profile.slotsConfigured ? String(profile.slot ?? "").trim() : "";
}
export function slotProfileErrors(profile: Record<string, any>): string[] {
  const errors: string[] = [];
  if (profile.bodySlots != null && !Array.isArray(profile.bodySlots))
    errors.push("Liste d’emplacements corporels invalide.");
  for (const key of bodySlots(profile))
    if (!Object.hasOwn(BODY_SLOTS, key))
      errors.push(`Emplacement corporel inconnu : ${key}.`);
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
      .map((key) => BODY_SLOTS[key] ?? `Inconnu : ${key}`)
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
