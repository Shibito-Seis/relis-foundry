import { ATTRIBUTE_LABELS, MASTERY_LABELS, SKILL_DEFINITIONS } from "../config";
import { PHYSICAL_ITEM_TYPES, isPhysicalItemType } from "../data/item-defaults";
import type { RelisActor } from "../documents/actor";
import { formatRoundDuration, presentCondition } from "../rules/effects";
import {
  plainResourcePool,
  resourcePoolPresentation,
  updateResourcePoolCurrent,
} from "../rules/resources";
import {
  canMergeStacks,
  inventoryContainerTargets,
  presentInventory,
  type InventoryItemLike,
} from "../rules/inventory";
import {
  createInventoryItem,
  mergeInventoryStacks,
  moveInventoryItem,
  splitInventoryStack,
  transferInventoryItem,
} from "../services/inventory";
import { actorTabsForType, normalizeActorTab } from "../ui/actor-tabs";

const ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

function fieldValue(
  target: HTMLInputElement | HTMLSelectElement,
): string | number | boolean | null {
  if (target instanceof HTMLInputElement && target.type === "checkbox")
    return target.checked;
  if (target.dataset.valueType === "number")
    return target.value.trim() === "" ? null : Number(target.value);
  return target.value;
}

const BODY_NATURE_LABELS: Record<string, string> = {
  biological: "Biologique",
  synthetic: "Synthétique",
  hybrid: "Hybride",
  energetic: "Énergétique",
  atypical: "Atypique",
};

const NEED_LABELS: Record<string, string> = {
  oxygen: "Oxygène",
  food: "Alimentation",
  water: "Hydratation",
  sleep: "Sommeil",
  energy: "Énergie",
  cooling: "Refroidissement",
  maintenance: "Maintenance",
  rest: "Repos",
  feeding: "Alimentation spéciale",
  uvExposure: "Exposition UV",
  environmentalSafety: "Sécurité environnementale",
};

const NPC_DETAIL_OPTIONS = [
  { key: "condensed", label: "Figurant — condensé" },
  { key: "standard", label: "Secondaire — standard" },
  { key: "complete", label: "Majeur — complet" },
];

const STABILITY_OPTIONS = [
  { key: "stable", label: "Stable" },
  { key: "unstable", label: "Instable" },
  { key: "stabilized", label: "Stabilisé" },
  { key: "incapacitated", label: "Hors de combat" },
];

const INVENTORY_CONDITION_LABELS: Record<string, string> = {
  intact: "Intact",
  worn: "Usé",
  damaged: "Endommagé",
  broken: "Brisé",
  destroyed: "Détruit",
};

const INVENTORY_ACCESS_LABELS: Record<string, string> = {
  ready: "Prêt",
  accessible: "Accessible",
  stored: "Rangé",
  distant: "Distant",
  unavailable: "Indisponible",
};

const QUANTITY_UNIT_LABELS: Record<string, string> = {
  count: "unité(s)",
  kg: "kg",
  g: "g",
  l: "L",
  ml: "mL",
  m: "m",
};

function itemSnapshot(item: Item): InventoryItemLike {
  const source = item.toObject?.(true) ?? {};
  return {
    id: item.id,
    name: item.name,
    type: item.type,
    uuid: item.uuid,
    system: source.system ?? item.system ?? {},
    flags: source.flags ?? item.flags ?? {},
  };
}

function displayMeasure(value: number | null, suffix: string): string {
  return value === null ? "Inconnue" : `${value} ${suffix}`;
}

function dialogContent(): HTMLDivElement {
  const content = document.createElement("div");
  content.className = "relis-inventory-dialog";
  return content;
}

function dialogNumber(
  content: HTMLElement,
  label: string,
  name: string,
  value: number,
  maximum: number,
  integerValue: boolean,
): void {
  const field = document.createElement("label");
  field.textContent = label;
  const input = document.createElement("input");
  input.type = "number";
  input.name = name;
  input.min = integerValue ? "1" : "0.000001";
  input.max = String(maximum);
  input.step = integerValue ? "1" : "any";
  input.value = String(value);
  input.autofocus = true;
  field.append(input);
  content.append(field);
}

function dialogText(
  content: HTMLElement,
  label: string,
  name: string,
  value = "",
): void {
  const field = document.createElement("label");
  field.textContent = label;
  const input = document.createElement("input");
  input.type = "text";
  input.name = name;
  input.value = value;
  input.required = true;
  input.autofocus = true;
  field.append(input);
  content.append(field);
}

function dialogSelect(
  content: HTMLElement,
  label: string,
  name: string,
  choices: Array<{ value: string; label: string }>,
): void {
  const field = document.createElement("label");
  field.textContent = label;
  const select = document.createElement("select");
  select.name = name;
  for (const choice of choices) {
    const option = document.createElement("option");
    option.value = choice.value;
    option.textContent = choice.label;
    select.append(option);
  }
  field.append(select);
  content.append(field);
}

async function askInventoryForm(
  title: string,
  content: HTMLDivElement,
  label: string,
): Promise<Record<string, any> | null> {
  return (await foundry.applications.api.DialogV2.input({
    window: { title },
    content,
    ok: { label },
    modal: true,
    rejectClose: false,
  })) as Record<string, any> | null;
}

function referencePresentation(reference: any): Record<string, unknown> {
  return {
    label:
      String(reference?.labelSnapshot ?? "").trim() ||
      String(reference?.relisId ?? "").trim() ||
      "Référence sans libellé",
    state: String(reference?.state ?? "unresolved"),
    uuid: String(reference?.uuid ?? ""),
  };
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
    const isNpc = this.actor.type === "npc";
    const isPerson = isCharacter || isNpc;
    const npcDetailLevel = isNpc
      ? String(this.actor.system.detailLevel ?? "standard")
      : "complete";
    const attributes = isPerson
      ? Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
          key,
          label,
          base: this.actor.system.attributes[key].base,
          partial: this.actor.system.attributes[key].partial,
          effective: this.actor.system.derived?.attributes?.[key] ?? 0,
        }))
      : [];
    const allSkills = isPerson
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
    const skills = isNpc
      ? allSkills.filter((skill) => {
          if (npcDetailLevel === "complete") return true;
          if (npcDetailLevel === "standard")
            return skill.favorite || skill.rank !== "untrained";
          return skill.favorite || skill.rank !== "untrained";
        })
      : allSkills;
    const energyPools = isPerson
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
    const normalizedTab = normalizeActorTab(
      this.actor.type,
      this.activeTab,
      npcDetailLevel,
    );
    const tabs = actorTabsForType(this.actor.type, npcDetailLevel).map(
      (tab) => ({
        ...tab,
        active: tab.id === normalizedTab,
        tabIndex: tab.id === normalizedTab ? 0 : -1,
      }),
    );
    const favoriteSkills = skills.filter((skill) => skill.favorite);
    const featuredSkills =
      favoriteSkills.length > 0 ? favoriteSkills : skills.slice(0, 4);
    const publicName = isPerson
      ? String(this.actor.system.identity.publicName ?? "").trim()
      : "";
    const activeBody = this.actor.system.derived?.activeBody ?? null;
    const bodies = isPerson
      ? Array.from(this.actor.system.bodies ?? []).map((body: any) => ({
          id: String(body.id),
          name: String(body.name),
          nature: String(body.nature),
          natureLabel:
            BODY_NATURE_LABELS[String(body.nature)] ?? String(body.nature),
          size: String(body.size),
          selected: String(body.id) === String(this.actor.system.activeBodyId),
        }))
      : [];
    const needs = isPerson
      ? Array.from(this.actor.system.needs ?? []).map((need: any) => ({
          key: String(need.key),
          label: NEED_LABELS[String(need.key)] ?? String(need.key),
          current: need.current,
          maximum: need.maximum,
          unit: String(need.unit ?? ""),
          state: String(need.state ?? "normal"),
        }))
      : [];
    const stress = isPerson
      ? this.actor.system.derived?.trackables?.stress
      : null;
    const primaryMovement = this.actor.system.derived?.primaryMovement ?? null;
    const referenceGroups = isPerson
      ? [
          {
            label: "Relations",
            entries: Array.from(this.actor.system.relationshipRefs ?? []).map(
              referencePresentation,
            ),
          },
          {
            label: "Organisations",
            entries: Array.from(this.actor.system.organizationRefs ?? []).map(
              referencePresentation,
            ),
          },
          {
            label: "Comptes",
            entries: Array.from(this.actor.system.accountRefs ?? []).map(
              referencePresentation,
            ),
          },
          {
            label: "Journaux personnels",
            entries: Array.from(
              this.actor.system.personalJournalRefs ?? [],
            ).map(referencePresentation),
          },
        ]
      : [];
    const actorItems = Array.from(this.actor.items ?? []) as Item[];
    const physicalItems = actorItems.filter((item) =>
      isPhysicalItemType(item.type),
    );
    const physicalSnapshots = physicalItems.map(itemSnapshot);
    const inventory = presentInventory(physicalSnapshots);
    const inventoryRows = inventory.rows.map((row) => {
      const item = physicalItems.find(
        (candidate) => candidate.id === row.item.id,
      );
      const physical = row.item.system.physical ?? {};
      const pendingState = String(
        row.item.flags?.relis?.inventoryTransfer?.state ?? "complete",
      );
      const mergeCandidates = physicalSnapshots.filter(
        (candidate) =>
          String(
            candidate.flags?.relis?.inventoryTransfer?.state ?? "complete",
          ) === "complete" && canMergeStacks(row.item, candidate),
      );
      const capacity = row.item.system.capacity ?? {};
      const quantity = Number(physical.quantity ?? 0);
      const counted = String(physical.unit ?? "count") === "count";
      const massEach =
        physical.massEach === null || physical.massEach === undefined
          ? null
          : Number(physical.massEach);
      const rowClasses = [
        "relis-inventory-row",
        row.item.type === "container" ? "relis-inventory-row--container" : "",
        row.orphaned || row.cyclic ? "relis-inventory-row--error" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return {
        id: row.item.id,
        name: row.item.name,
        type: row.item.type,
        typeLabel: game.i18n.localize(`TYPES.Item.${row.item.type}`),
        rowClasses,
        img: item?.img ?? "icons/svg/item-bag.svg",
        depth: row.depth,
        level: row.depth + 1,
        indent: row.depth * 18,
        quantity,
        quantityUnit:
          QUANTITY_UNIT_LABELS[String(physical.unit ?? "count")] ??
          String(physical.unit ?? ""),
        lot: String(
          row.item.system.provenance?.lotId ?? physical.batchId ?? "",
        ).trim(),
        condition:
          INVENTORY_CONDITION_LABELS[String(physical.condition ?? "intact")] ??
          String(physical.condition ?? ""),
        accessibility:
          INVENTORY_ACCESS_LABELS[String(physical.accessibility ?? "stored")] ??
          String(physical.accessibility ?? ""),
        location: row.parentId
          ? (physicalItems.find((candidate) => candidate.id === row.parentId)
              ?.name ?? "Conteneur manquant")
          : "Inventaire principal",
        isContainer: row.item.type === "container",
        childCount: row.childCount,
        pending: pendingState === "pending",
        quarantined: pendingState === "quarantined",
        hasError: row.orphaned || row.cyclic,
        canSplit:
          row.item.type !== "container" &&
          (counted ? quantity > 1 : quantity > 0),
        canMerge: mergeCandidates.length > 0,
        canMove:
          inventoryContainerTargets(physicalSnapshots, row.item.id).length >
            0 || Boolean(row.parentId),
        canTransfer: quantity > 0,
        ownMass: displayMeasure(
          massEach !== null && Number.isFinite(massEach)
            ? massEach * quantity
            : null,
          "kg",
        ),
        subtreeMass: displayMeasure(row.subtreeLoad.mass, "kg"),
        capacityMass:
          capacity.mass === null || capacity.mass === undefined
            ? "Sans limite définie"
            : `${row.containerUsage?.mass ?? "?"} / ${capacity.mass} kg`,
        capacityVolume:
          capacity.volume === null || capacity.volume === undefined
            ? "Sans limite définie"
            : `${row.containerUsage?.volume ?? "?"} / ${capacity.volume} L`,
        capacityBulk:
          capacity.bulk === null || capacity.bulk === undefined
            ? "Sans limite définie"
            : `${row.containerUsage?.bulk ?? "?"} / ${capacity.bulk}`,
        capacityUnits:
          capacity.units === null || capacity.units === undefined
            ? "Sans limite définie"
            : `${row.containerUsage?.units ?? 0} / ${capacity.units}`,
      };
    });
    const itemRows = actorItems.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
      canRoll: item.type === "action",
    }));
    const relatedItems = itemRows.filter(
      (item) => !isPhysicalItemType(item.type),
    );

    return {
      ...context,
      actor: this.actor,
      system: this.actor.system,
      editable: this.actor.isOwner,
      isCharacter,
      isNpc,
      isPerson,
      npcDetailLevel,
      npcCondensed: npcDetailLevel === "condensed",
      npcStandard: npcDetailLevel === "standard",
      npcComplete: npcDetailLevel === "complete",
      npcDetailOptions: NPC_DETAIL_OPTIONS,
      stabilityOptions: STABILITY_OPTIONS,
      actorTypeLabel: game.i18n.localize(`TYPES.Actor.${this.actor.type}`),
      displayName: publicName || this.actor.name,
      tabs,
      attributes,
      skills,
      featuredSkills,
      energyPools,
      bodies,
      activeBody,
      activeBodyNatureLabel:
        BODY_NATURE_LABELS[String(activeBody?.nature)] ??
        String(activeBody?.nature ?? "Non défini"),
      needs,
      stress,
      primaryMovement,
      referenceGroups,
      hasReferences: referenceGroups.some((group) => group.entries.length > 0),
      progression: isCharacter ? this.actor.system.progression : null,
      hasDemoEnergy: energyPools.some((pool) => pool.isDemo),
      items: itemRows,
      relatedItems,
      inventoryRows,
      hasInventory: inventoryRows.length > 0,
      inventoryDiagnostics: inventory.diagnostics,
      hasInventoryDiagnostics: inventory.diagnostics.length > 0,
      inventoryTotals: {
        itemCount: physicalItems.length,
        mass: displayMeasure(inventory.totalLoad.mass, "kg"),
        volume: displayMeasure(inventory.totalLoad.volume, "L"),
        bulk: displayMeasure(inventory.totalLoad.bulk, "ENC"),
      },
      effects,
      effectCount: effects.length,
      itemCount: actorItems.length,
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
      .querySelector<HTMLButtonElement>("[data-action='create-inventory-item']")
      ?.addEventListener("click", () => {
        void this.createPhysicalItem();
      });

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='split-inventory-stack']",
    )) {
      button.addEventListener("click", () => {
        void this.splitPhysicalStack(button.dataset.itemId ?? "");
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='merge-inventory-stack']",
    )) {
      button.addEventListener("click", () => {
        void this.mergePhysicalStack(button.dataset.itemId ?? "");
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='move-inventory-item']",
    )) {
      button.addEventListener("click", () => {
        void this.movePhysicalItem(button.dataset.itemId ?? "");
      });
    }

    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-action='transfer-inventory-item']",
    )) {
      button.addEventListener("click", () => {
        void this.transferPhysicalItem(button.dataset.itemId ?? "");
      });
    }

    root
      .querySelector<HTMLButtonElement>("[data-action='create-demo']")
      ?.addEventListener("click", () => {
        void this.createDemo();
      });
  }

  private async inventoryTask(
    task: () => Promise<void>,
    success: string,
  ): Promise<void> {
    try {
      await task();
      ui.notifications.info(success);
      await this.render({ force: true });
    } catch (error) {
      console.error("RE:LIS | Opération d’inventaire refusée", error);
      ui.notifications.error(
        error instanceof Error
          ? error.message
          : "Opération d’inventaire refusée.",
      );
    }
  }

  private async createPhysicalItem(): Promise<void> {
    if (!this.actor.isOwner) return;
    const content = dialogContent();
    dialogText(content, "Nom", "name", "Nouvel objet");
    dialogSelect(
      content,
      "Type matériel",
      "type",
      PHYSICAL_ITEM_TYPES.map((value) => ({
        value,
        label: game.i18n.localize(`TYPES.Item.${value}`),
      })),
    );
    const result = await askInventoryForm(
      "Créer un Item d’inventaire",
      content,
      "Créer",
    );
    if (!result) return;
    await this.inventoryTask(async () => {
      await createInventoryItem(
        this.actor,
        String(result.name ?? ""),
        String(result.type ?? "equipment"),
      );
    }, "Item ajouté à l’inventaire.");
  }

  private async splitPhysicalStack(itemId: string): Promise<void> {
    if (!this.actor.isOwner) return;
    const item = this.actor.items.get(itemId) as Item | undefined;
    if (!item) return;
    const quantity = Number(item.system.physical?.quantity ?? 0);
    const counted = String(item.system.physical?.unit ?? "count") === "count";
    const content = dialogContent();
    dialogNumber(
      content,
      `Quantité à détacher de « ${item.name} »`,
      "quantity",
      counted ? 1 : Math.min(quantity / 2, 1),
      counted ? quantity - 1 : quantity - Number.EPSILON,
      counted,
    );
    const result = await askInventoryForm(
      "Scinder la pile",
      content,
      "Scinder",
    );
    if (!result) return;
    await this.inventoryTask(async () => {
      await splitInventoryStack(this.actor, itemId, Number(result.quantity));
    }, "Pile scindée sans modifier la quantité totale.");
  }

  private async mergePhysicalStack(itemId: string): Promise<void> {
    if (!this.actor.isOwner) return;
    const item = this.actor.items.get(itemId) as Item | undefined;
    if (!item) return;
    const snapshot = itemSnapshot(item);
    const candidates = (Array.from(this.actor.items ?? []) as Item[]).filter(
      (candidate) => canMergeStacks(snapshot, itemSnapshot(candidate)),
    );
    if (!candidates.length) {
      ui.notifications.warn("Aucune pile strictement compatible à fusionner.");
      return;
    }
    const content = dialogContent();
    dialogSelect(
      content,
      "Pile absorbée",
      "sourceId",
      candidates.map((candidate) => ({
        value: candidate.id,
        label: `${candidate.name} — ${candidate.system.physical.quantity} ${QUANTITY_UNIT_LABELS[String(candidate.system.physical.unit)] ?? candidate.system.physical.unit}`,
      })),
    );
    const result = await askInventoryForm(
      `Fusionner dans « ${item.name} »`,
      content,
      "Fusionner",
    );
    if (!result) return;
    await this.inventoryTask(async () => {
      await mergeInventoryStacks(
        this.actor,
        itemId,
        String(result.sourceId ?? ""),
      );
    }, "Piles fusionnées ; le total est conservé.");
  }

  private async movePhysicalItem(itemId: string): Promise<void> {
    if (!this.actor.isOwner) return;
    const item = this.actor.items.get(itemId) as Item | undefined;
    if (!item) return;
    const snapshots = (Array.from(this.actor.items ?? []) as Item[])
      .filter((candidate) => isPhysicalItemType(candidate.type))
      .map(itemSnapshot);
    const targets = inventoryContainerTargets(snapshots, itemId);
    const content = dialogContent();
    dialogSelect(content, "Destination", "containerId", [
      { value: "", label: "Inventaire principal" },
      ...targets.map((target) => ({ value: target.id, label: target.name })),
    ]);
    const result = await askInventoryForm(
      `Déplacer « ${item.name} »`,
      content,
      "Déplacer",
    );
    if (!result) return;
    await this.inventoryTask(async () => {
      await moveInventoryItem(
        this.actor,
        itemId,
        String(result.containerId ?? "") || null,
      );
    }, "Emplacement mis à jour après contrôle des capacités.");
  }

  private async transferPhysicalItem(itemId: string): Promise<void> {
    if (!this.actor.isOwner) return;
    const item = this.actor.items.get(itemId) as Item | undefined;
    if (!item) return;
    const actors = (
      Array.from(game.actors?.contents ?? game.actors ?? []) as RelisActor[]
    ).filter(
      (actor) =>
        actor.uuid !== this.actor.uuid &&
        ["character", "npc"].includes(actor.type) &&
        (game.user?.isGM || actor.isOwner),
    );
    if (!actors.length) {
      ui.notifications.warn(
        "Aucun autre Personnage ou PNJ modifiable ne peut recevoir cet Item.",
      );
      return;
    }
    const content = dialogContent();
    dialogSelect(
      content,
      "Actor destinataire",
      "actorUuid",
      actors.map((actor) => ({ value: actor.uuid, label: actor.name })),
    );
    const maximum = Number(item.system.physical?.quantity ?? 0);
    if (item.type !== "container")
      dialogNumber(
        content,
        "Quantité transférée",
        "quantity",
        maximum,
        maximum,
        String(item.system.physical?.unit ?? "count") === "count",
      );
    const result = await askInventoryForm(
      `Transférer « ${item.name} »`,
      content,
      "Transférer",
    );
    if (!result) return;
    const destination = actors.find(
      (actor) => actor.uuid === String(result.actorUuid ?? ""),
    );
    if (!destination) return;
    await this.inventoryTask(async () => {
      await transferInventoryItem(
        this.actor,
        destination,
        itemId,
        item.type === "container" ? maximum : Number(result.quantity),
      );
    }, `Transfert vers ${destination.name} terminé sans duplication jouable.`);
  }

  private activateTab(
    root: HTMLElement,
    requested: string | undefined,
    focus = false,
  ): void {
    const detailLevel =
      this.actor.type === "npc"
        ? String(this.actor.system.detailLevel ?? "standard")
        : "complete";
    const active = normalizeActorTab(this.actor.type, requested, detailLevel);
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
