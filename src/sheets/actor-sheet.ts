import { ATTRIBUTE_LABELS, MASTERY_LABELS, SKILL_DEFINITIONS } from "../config";
import type { RelisActor } from "../documents/actor";
import { formatRoundDuration, presentCondition } from "../rules/effects";
import {
  plainResourcePool,
  resourcePoolPresentation,
  updateResourcePoolCurrent,
} from "../rules/resources";
import { actorTabsForType, normalizeActorTab } from "../ui/actor-tabs";

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
    classes: ["relis", "actor-sheet", "relis-actor-sheet"],
    position: { width: 920, height: 720 },
    window: { resizable: true },
  };

  static PARTS = {
    main: { template: "systems/relis/templates/actors/character.hbs" },
  };

  declare actor: RelisActor;
  private activeTab = "summary";

  async _prepareContext(options: any): Promise<Record<string, any>> {
    const context = await super._prepareContext(options);
    const isCharacter = this.actor.type === "character";
    const attributes = isCharacter
      ? Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
          key,
          label,
          base: this.actor.system.attributes[key].base,
          partial: this.actor.system.attributes[key].partial,
          effective: this.actor.system.derived?.attributes?.[key] ?? 0,
        }))
      : [];
    const skills = isCharacter
      ? Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => ({
          key,
          label: definition[0],
          defaultAttribute: definition[1],
          rank: this.actor.system.skills[key].rank,
          masteryBonus:
            this.actor.system.derived?.skills?.[key]?.masteryBonus ?? 0,
          total: this.actor.system.derived?.skills?.[key]?.total ?? 0,
          favorite: Boolean(this.actor.system.skills[key].favorite),
          masteryRanks: Object.entries(MASTERY_LABELS).map(
            ([rankKey, label]) => ({
              key: rankKey,
              label,
            }),
          ),
        }))
      : [];
    const energyPools = isCharacter
      ? Array.from(this.actor.system.energyPools ?? []).map(
          (pool: any, index: number) => {
            const plain = plainResourcePool(pool);
            const presentation = resourcePoolPresentation(plain.key);
            return {
              ...plain,
              ...presentation,
              index,
              resourceClass: presentation.isDemo
                ? "relis-resource--demo"
                : "relis-resource--energy",
              cardClass: presentation.isDemo
                ? "relis-energy-card--demo"
                : "relis-energy-card--canonical",
            };
          },
        )
      : [];
    const effects = (
      Array.from(this.actor.effects ?? []) as ActiveEffect[]
    ).map((effect) => {
      const presentation = presentCondition(
        String(effect.system?.conditionKey ?? effect.name),
        game.i18n,
      );
      return {
        id: effect.id,
        name: effect.name || presentation.label,
        description: presentation.description,
        icon: effect.img || "icons/svg/aura.svg",
        intensity: Math.max(
          0,
          Math.trunc(Number(effect.system?.intensity) || 0),
        ),
        duration: formatRoundDuration(
          effect.duration?.remaining ?? effect.duration?.rounds,
          game.i18n,
        ),
      };
    });
    const tabs = actorTabsForType(this.actor.type).map((tab) => ({
      ...tab,
      active: tab.id === normalizeActorTab(this.actor.type, this.activeTab),
      tabIndex:
        tab.id === normalizeActorTab(this.actor.type, this.activeTab) ? 0 : -1,
    }));
    const favoriteSkills = skills.filter((skill) => skill.favorite);
    const featuredSkills =
      favoriteSkills.length > 0 ? favoriteSkills : skills.slice(0, 4);
    const publicName = isCharacter
      ? String(this.actor.system.identity.publicName ?? "").trim()
      : "";

    return {
      ...context,
      actor: this.actor,
      system: this.actor.system,
      editable: this.actor.isOwner,
      isCharacter,
      isNpc: this.actor.type === "npc",
      actorTypeLabel: game.i18n.localize(`TYPES.Actor.${this.actor.type}`),
      displayName: publicName || this.actor.name,
      tabs,
      attributes,
      skills,
      featuredSkills,
      energyPools,
      hasDemoEnergy: energyPools.some((pool) => pool.isDemo),
      items: (Array.from(this.actor.items ?? []) as Item[]).map((item) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
        canRoll: item.type === "action",
      })),
      effects,
      effectCount: effects.length,
      itemCount: Number(this.actor.items?.size ?? 0),
    };
  }

  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    const root = this.element as HTMLElement;
    this.activateTab(root, this.activeTab);

    if (!this.actor.isOwner) {
      for (const control of root.querySelectorAll<
        HTMLInputElement | HTMLSelectElement | HTMLButtonElement
      >("[data-document-field], [data-owner-control]")) {
        control.disabled = true;
      }
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='switch-tab']",
    )) {
      button.addEventListener("click", () => {
        this.activateTab(root, button.dataset.tabId, true);
      });
      button.addEventListener("keydown", (event) => {
        this.onTabKeydown(root, event);
      });
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

    for (const element of root.querySelectorAll<HTMLInputElement>(
      "[data-energy-index]",
    )) {
      element.addEventListener("change", () => {
        if (!this.actor.isOwner) return;
        const index = Number(element.dataset.energyIndex);
        if (!Number.isInteger(index)) return;
        const pools = updateResourcePoolCurrent(
          this.actor.system.energyPools ?? [],
          index,
          Number(element.value),
        );
        void this.actor.update({ "system.energyPools": pools });
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='roll-skill']",
    )) {
      button.addEventListener("click", () => {
        if (!this.actor.isOwner) return;
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
        if (!this.actor.isOwner) return;
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

  private activateTab(
    root: HTMLElement,
    requested: string | undefined,
    focus = false,
  ): void {
    const active = normalizeActorTab(this.actor.type, requested);
    this.activeTab = active;
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='switch-tab']",
    )) {
      const selected = button.dataset.tabId === active;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
    }
    for (const panel of root.querySelectorAll<HTMLElement>("[data-tab-panel]"))
      panel.hidden = panel.dataset.tabPanel !== active;
  }

  private onTabKeydown(root: HTMLElement, event: KeyboardEvent): void {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(
      root.querySelectorAll<HTMLButtonElement>("[data-action='switch-tab']"),
    );
    const current = buttons.findIndex(
      (button) => button.dataset.tabId === this.activeTab,
    );
    if (current < 0 || buttons.length === 0) return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length;
    this.activateTab(root, buttons[next]?.dataset.tabId, true);
  }

  private async createDemo(): Promise<void> {
    if (!this.actor.isOwner) return;
    const pools = Array.from(
      this.actor.system.energyPools ?? [],
      plainResourcePool,
    );
    if (!pools.some((pool) => pool.key === "ce")) {
      pools.push({
        key: "ce",
        current: 3,
        maximum: 3,
        reserved: 0,
        debt: 0,
        unit: "test",
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
      "Démonstration 10-C préparée : Action, Équipement et 3 CE de test.",
    );
  }
}
