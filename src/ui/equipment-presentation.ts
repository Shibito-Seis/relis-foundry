import {
  slotCost,
  bodySlots,
  BODY_SLOTS,
  bodySlotCapacity,
  occupiesBodySlot,
  technicalUsage,
  TECHNICAL_SLOTS,
} from "../rules/equipment-slots";
import {
  EQUIPMENT_LABELS,
  equipmentStates,
  equipmentState,
  equipmentPlan,
  equipmentBodyId,
  type EquipmentBody,
} from "../rules/equipment";
import type { InventoryItemLike } from "../rules/inventory";
export const EQUIPMENT_ICONS: Record<string, string> = {
  stored: "fa-box",
  "held-one": "fa-hand",
  "held-two": "fa-hands",
  equipped: "fa-user-shield",
  installed: "fa-screwdriver-wrench",
  ground: "fa-arrow-down",
  readied: "fa-hand",
  carried: "fa-box",
};
export function installationTargets(
  items: InventoryItemLike[],
  body: EquipmentBody,
  item: InventoryItemLike,
) {
  return items
    .filter((host) => host.id !== item.id)
    .map((host) => {
      const plan = equipmentPlan(items, body, {
        itemId: item.id,
        state: "installed",
        hostId: host.id,
      });
      const usage = technicalUsage(items, host, item.id);
      const capacity = Object.entries(
        item.system.physical?.equipmentProfile?.requiredSlots ?? {},
      )
        .filter(([, n]) => Number(n) > 0)
        .map(([key, n]) => {
          const total = Number(
            host.system.physical?.equipmentProfile?.providedSlots?.[key] ?? 0,
          );
          return `${TECHNICAL_SLOTS[key] ?? key} : ${Math.max(0, total - (usage[key] ?? 0))} libre(s) / ${total} ; ${n} nécessaire(s)`;
        })
        .join(" · ");
      return {
        id: host.id,
        name: host.name,
        errors: plan.errors,
        capacity:
          capacity || "Aucun besoin de place déclaré : vérifier la source.",
      };
    });
}
export function equipmentActions(
  items: InventoryItemLike[],
  body: EquipmentBody,
  item: InventoryItemLike,
) {
  return equipmentStates(item).map((state) => {
    const errors =
      state === "installed"
        ? installationTargets(items, body, item).some(
            (host) => !host.errors.length,
          )
          ? []
          : [
              "Aucun support compatible et disponible. Vérifier les besoins de cet objet et les capacités de son support dans leurs fiches.",
            ]
        : equipmentPlan(items, body, { itemId: item.id, state }).errors;
    return {
      state,
      itemId: item.id,
      label: state === "installed" ? "Installer sur…" : EQUIPMENT_LABELS[state],
      icon: EQUIPMENT_ICONS[state],
      reason: errors.join(" "),
      unavailable: errors.length > 0,
      current: equipmentState(item) === state,
    };
  });
}
export function equipmentOverview(
  items: InventoryItemLike[],
  body: EquipmentBody,
) {
  const local = items.filter(
    (item) => (equipmentBodyId(items, item) || body.id) === body.id,
  );
  const handsItems = local.filter(
    (item) =>
      equipmentState(item).startsWith("held-") ||
      (equipmentState(item) === "equipped" &&
        Number(item.system.physical?.hands) > 0),
  );
  const hands = handsItems.reduce(
    (sum, item) => sum + Number(item.system.physical?.hands ?? 0),
    0,
  );
  const entries = [
    {
      key: "hands",
      label: "Mains",
      count: hands,
      capacity: body.carrying?.hands ?? "?",
      items: handsItems,
      over: body.carrying?.hands != null && hands > body.carrying.hands,
    },
  ];
  for (const [key, label] of Object.entries(BODY_SLOTS)) {
    const equipped = local.filter((item) => occupiesBodySlot(item, key));
    if (!equipped.length && !["necklace", "bracelet", "ring"].includes(key))
      continue;
    const capacity = bodySlotCapacity(key, body.carrying);
    const count = equipped.reduce(
      (sum, item) =>
        sum + slotCost(item.system.physical?.equipmentProfile ?? {}, key),
      0,
    );
    entries.push({
      key,
      label,
      count,
      capacity,
      items: equipped,
      over: count > capacity,
    });
  }
  const uncounted = local.filter(
    (item) =>
      equipmentState(item) === "equipped" &&
      !bodySlots(item.system.physical?.equipmentProfile ?? {}).length,
  );
  return {
    entries: entries.map((entry) => ({
      ...entry,
      warningClass: entry.over ? "relis-inventory-warning" : "",
    })),
    uncounted,
  };
}
/** Native disclosures retain keyboard activation; only one state menu stays open. */
export function bindEquipmentMenus(root: HTMLElement) {
  const menus = Array.from(
    root.querySelectorAll<HTMLDetailsElement>("[data-equipment-menu]"),
  );
  for (const menu of menus)
    menu.addEventListener("toggle", () => {
      if (menu.open)
        for (const other of menus) if (other !== menu) other.open = false;
    });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape")
      for (const menu of menus)
        if (menu.open) {
          menu.open = false;
          menu.querySelector("summary")?.focus();
        }
  });
  root.addEventListener("click", (event) => {
    for (const menu of menus)
      if (event.target instanceof Node && !menu.contains(event.target))
        menu.open = false;
  });
}
