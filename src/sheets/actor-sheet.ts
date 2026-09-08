import { ATTRIBUTE_LABELS, MASTERY_LABELS, SKILL_DEFINITIONS } from "../config";
import type { RelisActor } from "../documents/actor";

const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

function fieldValue(
  target: HTMLInputElement | HTMLSelectElement,
): string | number | boolean {
  if (target instanceof HTMLInputElement && target.type === "checkbox")
    return target.checked;
  if (target.dataset.valueType === "number") return Number(target.value);
  return target.value;
}

export class RelisActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  static DEFAULT_OPTIONS = {
    classes: ["relis", "actor-sheet", "character-sheet"],
    position: { width: 780, height: 680 },
    window: { resizable: true },
  };

  static PARTS = {
    main: { template: "systems/relis/templates/actors/character.hbs" },
  };

  declare actor: RelisActor;

  async _prepareContext(options: any): Promise<Record<string, any>> {
    const context = await super._prepareContext(options);
    const attributes = Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
      key,
      label,
      base: this.actor.system.attributes[key].base,
      partial: this.actor.system.attributes[key].partial,
    }));
    const skills = Object.entries(SKILL_DEFINITIONS).map(
      ([key, definition]) => ({
        key,
        label: definition[0],
        defaultAttribute: definition[1],
        rank: this.actor.system.skills[key].rank,
        masteryRanks: Object.entries(MASTERY_LABELS).map(
          ([rankKey, label]) => ({
            key: rankKey,
            label,
          }),
        ),
      }),
    );

    return {
      ...context,
      actor: this.actor,
      system: this.actor.system,
      editable: this.actor.isOwner,
      attributes,
      skills,
      energyPools: Array.from(this.actor.system.energyPools ?? []),
      items: (Array.from(this.actor.items ?? []) as Item[]).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
        canRoll: item.type === "action",
      })),
    };
  }

  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    const root = this.element as HTMLElement;
    if (!this.actor.isOwner) {
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
        if (!this.actor.isOwner) return;
        const path = element.dataset.documentField;
        if (!path) return;
        void this.actor.update({ [path]: fieldValue(element) });
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='roll-skill']",
    )) {
      button.addEventListener("click", () => {
        const skillKey = button.dataset.skillKey ?? "shooting";
        const definition =
          SKILL_DEFINITIONS[skillKey as keyof typeof SKILL_DEFINITIONS];
        const difficultyInput = root.querySelector<HTMLInputElement>(
          "[data-test-difficulty]",
        );
        void this.actor.rollRelisCheck({
          attributeKey: definition?.[1] ?? "dexterity",
          skillKey,
          difficulty: Number(difficultyInput?.value ?? 15),
          label: definition?.[0] ?? skillKey,
        });
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='open-item']",
    )) {
      button.addEventListener("click", () => {
        const item = this.actor.items.get(button.dataset.itemId ?? "");
        void item?.sheet.render(true);
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='roll-action']",
    )) {
      button.addEventListener("click", () => {
        const item = this.actor.items.get(button.dataset.itemId ?? "");
        if (item) void this.actor.rollAction(item);
      });
    }

    root
      .querySelector<HTMLButtonElement>("[data-action='create-demo']")
      ?.addEventListener("click", () => {
        void this.createDemo();
      });
  }

  private async createDemo(): Promise<void> {
    if (!this.actor.isOwner) return;
    const pools = Array.from(
      this.actor.system.energyPools ?? [],
      (pool: any) => ({
        key: String(pool.key),
        current: Number(pool.current),
        maximum: Number(pool.maximum),
        reserved: Number(pool.reserved),
        debt: Number(pool.debt),
        unit: String(pool.unit),
      }),
    );
    if (!pools.some((pool) => pool.key === "ce")) {
      pools.push({
        key: "ce",
        current: 3,
        maximum: 3,
        reserved: 0,
        debt: 0,
        unit: "count",
      });
      await this.actor.update({ "system.energyPools": pools });
    }

    const toCreate: Record<string, unknown>[] = [];
    if (
      !this.actor.items.some(
        (item: Item) =>
          item.type === "equipment" && item.name === "Module d’essai — 10-C",
      )
    ) {
      toCreate.push({
        name: "Module d’essai — 10-C",
        type: "equipment",
        system: {
          physical: {
            quantity: 1,
            massEach: 1,
            bulkEach: 1,
            equipState: "carried",
            condition: "intact",
          },
        },
      });
    }
    if (
      !this.actor.items.some(
        (item: Item) =>
          item.type === "action" &&
          item.name === "Tir calibré — Démonstration 10-C",
      )
    ) {
      toCreate.push({
        name: "Tir calibré — Démonstration 10-C",
        type: "action",
        system: {
          test: {
            attributeKey: "dexterity",
            skillKey: "shooting",
            difficulty: 15,
            resourceKey: "ce",
            cost: 1,
          },
          effect: {
            conditionKey: "calibrated",
            intensity: 1,
            durationRounds: 1,
          },
        },
      });
    }
    if (toCreate.length > 0)
      await this.actor.createEmbeddedDocuments("Item", toCreate);
    ui.notifications.info(
      "Démonstration 10-C préparée : Action, Équipement et 3 CE.",
    );
  }
}
