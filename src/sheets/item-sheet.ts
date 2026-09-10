import {
  EQUIP_STATES,
  ITEM_CONDITIONS,
  LEGALITY_STATES,
  QUANTITY_UNITS,
  isPhysicalItemType,
  physicalTotals,
} from "../data/item-defaults";
import { ATTRIBUTE_LABELS, MASTERY_LABELS, SKILL_DEFINITIONS } from "../config";
import type { RelisActor } from "../documents/actor";

const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

function fieldValue(target: FormControl): string | number | boolean | null {
  if (target.dataset.valueType === "boolean")
    return (target as HTMLInputElement).checked;
  if (target.dataset.valueType === "nullable-number")
    return target.value === "" ? null : Number(target.value);
  return target.dataset.valueType === "number"
    ? Number(target.value)
    : target.value;
}

const LEGALITY_LABELS: Record<string, string> = {
  "": "Non applicable",
  free: "Libre",
  declared: "Déclaré",
  regulated: "Réglementé",
  reserved: "Réservé",
  military: "Militaire",
  sovereign: "Souverain",
  prohibited: "Interdit",
  unrecognized: "Non reconnu",
};

const EQUIP_STATE_LABELS: Record<string, string> = {
  stored: "Rangé",
  carried: "Transporté",
  readied: "Préparé",
  equipped: "Équipé",
  installed: "Installé",
};

const CONDITION_LABELS: Record<string, string> = {
  intact: "Intact",
  worn: "Usé",
  damaged: "Endommagé",
  broken: "Brisé",
  destroyed: "Détruit",
};

function options(
  values: readonly string[],
  labels: Record<string, string>,
): Array<{ value: string; label: string }> {
  return values.map((value) => ({ value, label: labels[value] ?? value }));
}

export class RelisItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["relis", "item-sheet"],
    position: { width: 760, height: 760 },
    window: { resizable: true },
  };

  static PARTS = {
    main: { template: "systems/relis/templates/items/item.hbs" },
  };

  declare item: Item;

  async _prepareContext(optionsValue: any): Promise<Record<string, any>> {
    const context = await super._prepareContext(optionsValue);
    const system = this.item.system;
    const hasPhysical = isPhysicalItemType(this.item.type);
    const sourceRef = system.meta?.sourceRef ?? {};
    const hasSourceRef = Boolean(sourceRef.relisId || sourceRef.uuid);
    let sourceDocument: Item | null = null;
    if (sourceRef.uuid) {
      try {
        sourceDocument = (await foundry.utils.fromUuid(
          String(sourceRef.uuid),
        )) as Item | null;
      } catch {
        sourceDocument = null;
      }
    }
    if (!sourceDocument && sourceRef.relisId) {
      const candidates = [
        ...Array.from(game.items?.contents ?? game.items ?? []),
        ...Array.from(game.actors?.contents ?? game.actors ?? []).flatMap(
          (actor: any) => Array.from(actor.items ?? []),
        ),
      ] as Item[];
      sourceDocument =
        candidates.find(
          (candidate) =>
            candidate.system.meta?.relisId === String(sourceRef.relisId),
        ) ?? null;
    }
    const sourceMissing = hasSourceRef && !sourceDocument;
    const updateAvailable = Boolean(
      sourceDocument &&
      system.meta.sourceVersion &&
      sourceDocument.system.meta?.contentVersion &&
      system.meta.sourceVersion !== sourceDocument.system.meta.contentVersion,
    );
    const manualOverrides = Array.from(
      system.provenance?.manualOverrides ?? [],
      String,
    );
    const badges = [
      {
        label: this.item.parent ? "Exemplaire" : "Source",
        className: this.item.parent ? "" : "relis-state-chip--source",
      },
    ];
    if (manualOverrides.length > 0)
      badges.push({ label: "Modifié", className: "relis-state-chip--warning" });
    if (sourceMissing)
      badges.push({
        label: "Source absente",
        className: "relis-state-chip--danger",
      });
    else if (updateAvailable)
      badges.push({
        label: "Mise à jour disponible",
        className: "relis-state-chip--warning",
      });

    const diagnostics: Array<{
      level: string;
      icon: string;
      message: string;
    }> = [];
    if (!system.meta?.relisId)
      diagnostics.push({
        level: "error",
        icon: "fa-circle-exclamation",
        message: "Identifiant RE:LIS absent.",
      });
    if (sourceMissing)
      diagnostics.push({
        level: "warning",
        icon: "fa-link-slash",
        message:
          "La source n’est plus résoluble. Cet exemplaire demeure autonome et jouable.",
      });
    if (updateAvailable)
      diagnostics.push({
        level: "info",
        icon: "fa-arrow-up-right-dots",
        message:
          "Une version plus récente de la source existe. Aucune mise à jour automatique n’est appliquée.",
      });
    if (hasPhysical && system.physical?.unit === "count") {
      const quantity = Number(system.physical.quantity);
      if (!Number.isInteger(quantity))
        diagnostics.push({
          level: "error",
          icon: "fa-circle-exclamation",
          message: "Une quantité en unités doit être entière.",
        });
    }

    return {
      ...context,
      item: this.item,
      itemTypeLabel: game.i18n.localize(`TYPES.Item.${this.item.type}`),
      system,
      editable: this.item.isOwner,
      isAction: this.item.type === "action",
      hasPhysical,
      hasSourceRef,
      itemRole: this.item.parent
        ? hasSourceRef
          ? "Exemplaire lié à une source"
          : "Exemplaire autonome"
        : "Source ou modèle de monde",
      badges,
      diagnostics,
      manualOverrides,
      traitsText: Array.from(system.traits ?? []).join(", "),
      requirementCount: Number(system.requirementRefs?.length ?? 0),
      effectRefCount: Number(system.effectRefs?.length ?? 0),
      physicalTotals: hasPhysical ? physicalTotals(system.physical) : null,
      qualityOptions: [
        { value: "", label: "Non applicable" },
        ...Array.from({ length: 6 }, (_, value) => ({
          value,
          label: `Q-${value}`,
        })),
      ],
      rarityOptions: [
        { value: "", label: "Non applicable" },
        ...Array.from({ length: 7 }, (_, value) => ({
          value,
          label: `RAR-M ${value}`,
        })),
      ],
      legalityOptions: options(["", ...LEGALITY_STATES], LEGALITY_LABELS),
      quantityUnitOptions: options(QUANTITY_UNITS, {}),
      equipStateOptions: options(EQUIP_STATES, EQUIP_STATE_LABELS),
      conditionOptions: options(ITEM_CONDITIONS, CONDITION_LABELS),
      attributes: Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
        key,
        label,
      })),
      skills: Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => ({
        key,
        label: definition[0],
      })),
      masteryRanks: Object.entries(MASTERY_LABELS).map(([key, label]) => ({
        key,
        label,
      })),
    };
  }

  async _onRender(context: any, optionsValue: any): Promise<void> {
    await super._onRender(context, optionsValue);
    const root = this.element as HTMLElement;
    if (!this.item.isOwner) {
      for (const control of root.querySelectorAll<
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | HTMLButtonElement
      >("input, select, textarea, button")) {
        control.disabled = true;
      }
    }
    for (const element of root.querySelectorAll<FormControl>(
      "[data-document-field]",
    )) {
      element.addEventListener("change", () => {
        if (!this.item.isOwner) return;
        const path = element.dataset.documentField;
        if (!path) return;
        void this.item.update({ [path]: fieldValue(element) });
      });
    }
    for (const element of root.querySelectorAll<HTMLTextAreaElement>(
      "[data-array-field]",
    )) {
      element.addEventListener("change", () => {
        if (!this.item.isOwner) return;
        const path = element.dataset.arrayField;
        if (!path) return;
        const values = Array.from(
          new Set(
            element.value
              .split(/[\n,]/u)
              .map((value) => value.trim())
              .filter(Boolean),
          ),
        );
        void this.item.update({ [path]: values });
      });
    }
    root
      .querySelector<HTMLButtonElement>("[data-action='test-item']")
      ?.addEventListener("click", () => {
        const actor = this.item.parent as RelisActor | null;
        if (!actor) {
          ui.notifications.warn(
            game.i18n.localize("RELIS.Error.ActorRequired"),
          );
          return;
        }
        void actor.rollAction(this.item);
      });
  }
}
