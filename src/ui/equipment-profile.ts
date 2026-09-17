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
  const patch: Record<string, unknown> = {};
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
      !["family", "slot", "duration", "installable", "ordinaryLiquid"].includes(
        key ?? "",
      )
    )
      continue;
    patch[`system.physical.equipmentProfile.${key}`] =
      control.type === "checkbox"
        ? (control as HTMLInputElement).checked
        : control.value.trim();
  }
  return patch;
}

export function bindEquipmentProfile(
  root: HTMLElement,
  item: {
    isOwner: boolean;
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
      await item.update(equipmentProfileUpdate(section));
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
