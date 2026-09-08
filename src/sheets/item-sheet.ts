import { ATTRIBUTE_LABELS, MASTERY_LABELS, SKILL_DEFINITIONS } from "../config";
import type { RelisActor } from "../documents/actor";

const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

function fieldValue(
  target: HTMLInputElement | HTMLSelectElement,
): string | number {
  return target.dataset.valueType === "number"
    ? Number(target.value)
    : target.value;
}

export class RelisItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["relis", "item-sheet"],
    position: { width: 560, height: 600 },
    window: { resizable: true },
  };

  static PARTS = {
    main: { template: "systems/relis/templates/items/item.hbs" },
  };

  declare item: Item;

  async _prepareContext(options: any): Promise<Record<string, any>> {
    const context = await super._prepareContext(options);
    return {
      ...context,
      item: this.item,
      system: this.item.system,
      editable: this.item.isOwner,
      isAction: this.item.type === "action",
      isEquipment: this.item.type === "equipment",
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

  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    const root = this.element as HTMLElement;
    if (!this.item.isOwner) {
      for (const control of root.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLButtonElement
      >("input, select, button")) {
        control.disabled = true;
      }
    }
    for (const element of root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement
    >("[data-document-field]")) {
      element.addEventListener("change", () => {
        const path = element.dataset.documentField;
        if (!path) return;
        void this.item.update({ [path]: fieldValue(element) });
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
