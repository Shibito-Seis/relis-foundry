import {
  BODY_SLOTS,
  TECHNICAL_SLOTS,
  slotProfileErrors,
} from "../rules/equipment-slots";
import { saveEquipmentProfile } from "../services/inventory";
import { PHYSICAL_ITEM_TYPES } from "../data/item-defaults";

const GROUPS: Record<
  string,
  { title: string; labels: Record<string, string> }
> = {
  sizes: {
    title: "Tailles compatibles",
    labels: {
      tiny: "Très petit",
      small: "Petit",
      medium: "Moyen",
      large: "Grand",
      huge: "Très grand",
      gargantuan: "Gigantesque",
    },
  },
  natures: {
    title: "Natures corporelles compatibles",
    labels: {
      biological: "Biologique",
      synthetic: "Synthétique",
      hybrid: "Hybride",
      energetic: "Énergétique",
      atypical: "Atypique",
    },
  },
  hostTypes: {
    title: "Types d’hôte autorisés pour l’installation",
    labels: Object.fromEntries(PHYSICAL_ITEM_TYPES.map((type) => [type, type])),
  },
  bodySlots: {
    title: "Emplacements corporels occupés simultanément",
    labels: BODY_SLOTS,
  },
};

export function equipmentProfileGroups(
  profile: Record<string, any>,
  localize = (value: string) => value,
) {
  return Object.entries(GROUPS).map(([key, { title, labels }]) => {
    const selected: string[] = Array.isArray(profile[key]) ? profile[key] : [];
    return {
      key,
      title,
      count: selected.length,
      emptyLabel:
        key === "bodySlots"
          ? "Aucun emplacement corporel déclaré."
          : "Aucune restriction déclarée.",
      choices: [...new Set([...Object.keys(labels), ...selected])].map(
        (value) => ({
          value,
          groupKey: key,
          checked: selected.includes(value),
          label:
            key === "hostTypes" && value in labels
              ? localize(`TYPES.Item.${value}`)
              : (labels[value] ?? value),
        }),
      ),
    };
  });
}

/** Read live checkbox state, never serialized attributes or truthy form strings. */
export function equipmentProfileUpdate(
  root: ParentNode,
): Record<string, unknown> {
  const legacyConfirmation = root.querySelectorAll<HTMLInputElement>(
    "[data-legacy-slots-confirm]",
  )[0];
  if (legacyConfirmation && !legacyConfirmation.checked)
    throw new Error(
      "Confirmez le remplacement de l’ancien emplacement après avoir vérifié les choix corporels et techniques.",
    );
  const patch: Record<string, unknown> = {
    "system.physical.equipmentProfile.slotsConfigured": true,
  };
  for (const key of Object.keys(GROUPS)) {
    patch[`system.physical.equipmentProfile.${key}`] = Array.from(
      root.querySelectorAll<HTMLInputElement>(`[data-profile-list="${key}"]`),
    )
      .filter((input) => input.checked)
      .map((input) => input.value);
  }
  for (const control of root.querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >("[data-profile-field]")) {
    const key = control.dataset.profileField;
    if (
      !["family", "duration", "installable", "ordinaryLiquid"].includes(
        key ?? "",
      )
    )
      continue;
    patch[`system.physical.equipmentProfile.${key}`] =
      control.type === "checkbox"
        ? (control as HTMLInputElement).checked
        : control.value.trim();
  }
  for (const field of ["requiredSlots", "providedSlots"]) {
    const controls = root.querySelectorAll<HTMLInputElement>(
      `[data-profile-technical="${field}"]`,
    );
    for (const control of controls) {
      const key = control.dataset.slotKey ?? "";
      const value = control.value.trim() === "" ? 0 : Number(control.value);
      if (
        !Object.hasOwn(TECHNICAL_SLOTS, key) ||
        !Number.isSafeInteger(value) ||
        value < 0
      )
        throw new Error(
          "Les capacités et besoins doivent être des entiers positifs ou nuls.",
        );
      patch[`system.physical.equipmentProfile.${field}.${key}`] = value;
    }
  }
  const errors = slotProfileErrors({
    bodySlots: patch["system.physical.equipmentProfile.bodySlots"],
  });
  if (errors.length) throw new Error(errors.join(" "));
  return patch;
}

export function bindEquipmentProfile(
  root: HTMLElement,
  item: {
    isOwner: boolean;
    id?: string;
    parent?: Actor | null;
    update(data: Record<string, unknown>): Promise<unknown>;
  },
  reportError: (message: string) => void,
): void {
  const section = root.querySelector<HTMLElement>("[data-equipment-profile]");
  const button = section?.querySelector<HTMLButtonElement>(
    "[data-save-equipment-profile]",
  );
  if (!section || !button || !item.isOwner) return;
  const status = section.querySelector<HTMLElement>("[data-profile-status]");
  section.addEventListener("change", () => {
    if (status) status.textContent = "Modifications non enregistrées.";
  });
  button.addEventListener("click", async () => {
    if (!item.isOwner || button.disabled) return;
    button.disabled = true;
    try {
      await saveEquipmentProfile(item, equipmentProfileUpdate(section));
      if (status) status.textContent = "Propriétés enregistrées.";
    } catch (error) {
      reportError(
        error instanceof Error
          ? error.message
          : "Les propriétés n’ont pas pu être enregistrées.",
      );
    } finally {
      button.disabled = !item.isOwner;
    }
  });
}

export function technicalSlotRows(profile: Record<string, any>) {
  return Object.entries(TECHNICAL_SLOTS).map(([key, label]) => ({
    key,
    label,
    required: profile.requiredSlots?.[key] ?? 0,
    provided: profile.providedSlots?.[key] ?? 0,
  }));
}
