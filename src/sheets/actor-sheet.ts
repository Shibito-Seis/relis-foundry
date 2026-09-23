import {
  equipmentActions,
  equipmentOverview,
  EQUIPMENT_ICONS,
  installationTargets,
  bindEquipmentMenus,
} from "../ui/equipment-presentation";
import {
  WEAR_FORMS,
  EQUIPMENT_CATEGORIES,
} from "../rules/equipment-classification";
import {
  slotSummary,
  ACCESSORY_CAPACITIES,
  BODY_SLOTS,
  technicalSummary,
  technicalUsage,
  TECHNICAL_SLOTS,
  installedOn,
} from "../rules/equipment-slots";
import {
  ATTRIBUTE_LABELS,
  MASTERY_LABELS,
  SKILL_DEFINITIONS,
  PACKAGE_VERSION,
} from "../config";
import { bindInventoryView, groupInventory } from "../ui/inventory-view";
import { openActorPortraitPicker } from "../ui/actor-portrait";
import {
  carriedMass,
  equipmentLinked,
  equipmentBodyId,
  equipmentFailureMessage,
  equipmentPlan,
  equipmentState,
  EQUIPMENT_LABELS,
  unitMass,
  type EquipmentRequest,
} from "../rules/equipment";
import {
  applyEquipment,
  previewEquipment,
  recoverEquipment,
  saveEquipmentOutfit,
} from "../services/inventory";
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
  validateStackSplit,
  validateInventoryMove,
  descendantIds,
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
  loadAmmunition,
  unloadAmmunition,
  transferItemEnergy,
  consumeInventoryItem,
} from "../services/inventory";
import { actorTabsForType, normalizeActorTab } from "../ui/actor-tabs";
import {
  ammunitionCompatibility,
  cashSummary,
  energyCompatibility,
  hostPortSummary,
  materialDiagnostics,
  materialStatus,
  nestInstalledRows,
  powerSourceCompatibility,
} from "../rules/personal-material";
import { physicalFeedKind } from "../data/material-catalog";

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
  return document.createElement("div");
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
  field.className = "relis-inventory-dialog-field";
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
  field.className = "relis-inventory-dialog-field";
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

function dialogOptional(
  content: HTMLElement,
  label: string,
  name: string,
  value: unknown = "",
  numeric = false,
): void {
  dialogText(content, label, name, value == null ? "" : String(value));
  const input = content.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
  input.required = false;
  if (numeric) {
    input.type = "number";
    input.min = "0";
    input.step = "any";
  }
}

function dialogNote(content: HTMLElement, text: string): void {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  content.append(paragraph);
}

function dialogSelect(
  content: HTMLElement,
  label: string,
  name: string,
  choices: Array<{ value: string; label: string }>,
): void {
  const field = document.createElement("label");
  field.className = "relis-inventory-dialog-field";
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
  private inventoryQuery = { value: "" };

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
    if (activeBody) {
      for (const item of physicalSnapshots) {
        const p = item.system.physical ?? {};
        if (
          !["readied", "equipped", "installed"].includes(p.equipState) ||
          (equipmentBodyId(physicalSnapshots, item) &&
            equipmentBodyId(physicalSnapshots, item) !== activeBody.id)
        )
          continue;
        const host = physicalSnapshots.find(
          (entry) =>
            (p.hostRef?.uuid && entry.uuid === p.hostRef.uuid) ||
            (p.hostRef?.relisId &&
              entry.system.meta?.relisId === p.hostRef.relisId),
        );
        const plan = equipmentPlan(physicalSnapshots, activeBody, {
          itemId: item.id,
          state: equipmentState(item),
          hostId: host?.id ?? "",
        });
        for (const message of plan.errors)
          inventory.diagnostics.push({
            itemId: item.id,
            level: "warning",
            message: `${item.name} : ${message}`,
          });
      }
    }
    for (const item of physicalSnapshots)
      for (const diagnostic of materialDiagnostics(item))
        inventory.diagnostics.push({
          itemId: item.id,
          level: diagnostic.level,
          message: `${item.name} : ${diagnostic.message}`,
        });
    const visualRows = nestInstalledRows(
      inventory.rows.map((row) => ({
        id: row.item.id,
        name: row.item.name,
        type: row.item.type,
        depth: row.depth,
        parentId: row.parentId,
        value: row,
      })),
      physicalSnapshots,
    );
    const visualChildren = new Map<string, number>();
    for (const visual of visualRows)
      if (visual.parentId)
        visualChildren.set(
          visual.parentId,
          (visualChildren.get(visual.parentId) ?? 0) + 1,
        );
    const inventoryRows = visualRows.map((visual) => {
      const row = visual.value!;
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
      const transferableIds = new Set([
        row.item.id,
        ...descendantIds(physicalSnapshots, row.item.id),
      ]);
      const canTransfer = inventory.rows
        .filter((candidate) => transferableIds.has(candidate.item.id))
        .every((candidate) => {
          const state = candidate.item.system.physical ?? {};
          const amount = Number(state.quantity ?? 0);
          return (
            !candidate.orphaned &&
            !candidate.cyclic &&
            Number.isFinite(amount) &&
            amount > 0 &&
            (state.unit !== "count" || Number.isInteger(amount)) &&
            (candidate.item.type !== "container" || amount === 1) &&
            state.accessibility !== "unavailable" &&
            (candidate.item.flags?.relis?.inventoryTransfer?.state ??
              "complete") === "complete"
          );
        });
      const massEach = unitMass(row.item);
      const linked = equipmentLinked(physicalSnapshots, row.item.id);
      const supplyProfile =
        row.item.type === "weapon"
          ? row.item.system.weaponProfile
          : ["armor", "equipment"].includes(row.item.type)
            ? row.item.system.supplyProfile
            : null;
      const rowPhysicalFeed = supplyProfile
        ? row.item.type === "weapon"
          ? physicalFeedKind(
              String(supplyProfile.feedKind ?? ""),
              String(supplyProfile.hybridPhysicalFeedKind ?? ""),
            )
          : supplyProfile.feedKind === "hybrid"
            ? "internal"
            : String(supplyProfile.feedKind ?? "")
        : "";
      const compatibleAmmunitionAvailable = physicalSnapshots.some(
        (candidate) =>
          candidate.type === "ammunition" &&
          Number(candidate.system.physical?.quantity ?? 0) > 0 &&
          candidate.system.physical?.accessibility !== "unavailable" &&
          !["broken", "destroyed"].includes(
            candidate.system.physical?.condition,
          ) &&
          ammunitionCompatibility(candidate, row.item).length === 0,
      );
      const internalLoaded = Array.from(
        supplyProfile?.loadSequence ?? [],
      ).reduce(
        (sum: number, segment: any) =>
          sum + Math.max(0, Number(segment.quantity ?? 0)),
        0,
      );
      const internalFree = supplyProfile
        ? Math.max(
            0,
            Number(
              row.item.type === "weapon"
                ? (supplyProfile.internalCapacity ?? 0)
                : (supplyProfile.capacity ?? 0),
            ) - internalLoaded,
          )
        : 0;
      const chamberFree =
        (rowPhysicalFeed === "chamber" || supplyProfile?.chamberSeparate) &&
        Array.from(supplyProfile.chamberLoad ?? []).length === 0;
      const magazineLoaded =
        row.item.type === "container" &&
        row.item.system.containerKind === "magazine"
          ? physicalSnapshots
              .filter(
                (candidate) =>
                  candidate.type === "ammunition" &&
                  (candidate.system.physical?.containerRef?.uuid ===
                    row.item.uuid ||
                    candidate.system.physical?.containerRef?.relisId ===
                      row.item.system.meta?.relisId),
              )
              .reduce(
                (sum, candidate) =>
                  sum + Number(candidate.system.physical?.quantity ?? 0),
                0,
              )
          : 0;
      const magazineFree = Math.max(
        0,
        Number(row.item.system.magazineProfile?.capacity ?? 0) - magazineLoaded,
      );
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
        equipmentDuration:
          physical.equipmentProfile?.duration || "à arbitrer avec le MJ",
        equipmentIcon: EQUIPMENT_ICONS[equipmentState(row.item)] ?? "fa-box",
        equipmentActions: equipmentActions(
          physicalSnapshots,
          activeBody ?? { id: "" },
          row.item,
        ),
        classificationLabel: [
          EQUIPMENT_CATEGORIES[physical.equipmentProfile?.functionalCategory],
          WEAR_FORMS[physical.equipmentProfile?.wearForm]?.label,
        ]
          .filter(Boolean)
          .join(" · "),
        equipmentLabel:
          EQUIPMENT_LABELS[equipmentState(row.item)] ??
          "État ancien à vérifier",
        equipmentBody: physical.bodyId
          ? (bodies.find((body: any) => body.id === physical.bodyId)?.name ??
            "Corps absent")
          : "",
        equipmentHost: physical.hostRef?.labelSnapshot ?? "",
        equipmentSlots: slotSummary(physical.equipmentProfile ?? {}),
        technicalNeeds: technicalSummary(
          physical.equipmentProfile ?? {},
          "requiredSlots",
        ),
        technicalCapacity: Object.entries(
          physical.equipmentProfile?.providedSlots ?? {},
        )
          .filter(([, n]) => Number(n) > 0)
          .map(
            ([key, n]) =>
              `${TECHNICAL_SLOTS[key] ?? key} : ${technicalUsage(physicalSnapshots, row.item)[key] ?? 0} / ${n}`,
          )
          .join(" ; "),
        equipmentTime: physical.equipmentProfile?.duration || "À arbitrer",
        type: row.item.type,
        typeLabel: game.i18n.localize(`TYPES.Item.${row.item.type}`),
        rowClasses,
        img: item?.img ?? "icons/svg/item-bag.svg",
        depth: visual.depth,
        level: visual.depth + 1,
        indent: visual.depth * 18,
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
        warning:
          physical.condition !== "intact" ||
          physical.accessibility === "unavailable" ||
          Number(physical.wear ?? 0) > 0 ||
          row.orphaned ||
          row.cyclic,
        wear: physical.wear ?? 0,
        provenanceSource:
          row.item.system.provenance?.acquiredFromRef?.labelSnapshot ||
          "Non renseignée",
        massEach: displayMeasure(massEach, "kg"),
        volumeEach: displayMeasure(physical.volumeEach ?? null, "L"),
        bulkEach: displayMeasure(physical.bulkEach ?? null, ""),
        accessibility:
          INVENTORY_ACCESS_LABELS[String(physical.accessibility ?? "stored")] ??
          String(physical.accessibility ?? ""),
        location: row.parentId
          ? (physicalItems.find((candidate) => candidate.id === row.parentId)
              ?.name ?? "Conteneur manquant")
          : physical.equipState === "ground"
            ? "Au sol"
            : physical.hostRef?.labelSnapshot
              ? `Sur ${physical.hostRef.labelSnapshot}`
              : equipmentState(row.item) === "equipped"
                ? slotSummary(physical.equipmentProfile ?? {})
                : "Inventaire principal",
        isContainer: row.item.type === "container",
        childCount: visualChildren.get(row.item.id) ?? 0,
        materialStatus: materialStatus(row.item, physicalSnapshots),
        loadedContentLines: supplyProfile
          ? [
              ...Array.from(supplyProfile.chamberLoad ?? []).map(
                (segment: any) =>
                  `Chambre · ${segment.ammunitionRef?.labelSnapshot || "munition"}`,
              ),
              ...Array.from(supplyProfile.loadSequence ?? []).map(
                (segment: any) =>
                  `${segment.quantity} × ${segment.ammunitionRef?.labelSnapshot || "munition"}${segment.lotId ? ` · lot ${segment.lotId}` : ""}`,
              ),
            ]
          : [],
        modulePorts: hostPortSummary(physicalSnapshots, row.item).map(
          (port) => ({
            ...port,
            hostId: row.item.id,
            installedNames: port.installed
              .map((entry) => entry.name)
              .join(", "),
          }),
        ),
        hasModulePorts: hostPortSummary(physicalSnapshots, row.item).length > 0,
        isConsumable: row.item.type === "consumable",
        canConsume:
          row.item.type === "consumable" &&
          physical.accessibility !== "unavailable" &&
          !["broken", "destroyed"].includes(physical.condition) &&
          (physical.charges?.current !== null &&
          physical.charges?.current !== undefined
            ? Number(physical.charges.current) > 0
            : quantity > 0),
        canLoadAmmunition:
          (supplyProfile &&
            ["chamber", "internal"].includes(rowPhysicalFeed) &&
            (internalFree > 0 || chamberFree) &&
            compatibleAmmunitionAvailable) ||
          (row.item.type === "container" &&
            row.item.system.containerKind === "magazine" &&
            magazineFree > 0 &&
            physicalSnapshots.some(
              (candidate) =>
                candidate.type === "ammunition" &&
                !candidate.system.physical?.containerRef?.uuid &&
                !candidate.system.physical?.containerRef?.relisId &&
                candidate.system.physical?.quantity > 0 &&
                ammunitionCompatibility(candidate, row.item).length === 0,
            )),
        canUnloadAmmunition:
          (supplyProfile &&
            (Array.from(supplyProfile.loadSequence ?? []).length > 0 ||
              Array.from(supplyProfile.chamberLoad ?? []).length > 0)) ||
          (row.item.type === "container" &&
            row.item.system.containerKind === "magazine" &&
            physicalSnapshots.some(
              (candidate) =>
                candidate.type === "ammunition" &&
                (candidate.system.physical?.containerRef?.uuid ===
                  row.item.uuid ||
                  candidate.system.physical?.containerRef?.relisId ===
                    row.item.system.meta?.relisId),
            )),
        canReceiveEnergy:
          row.item.type !== "weapon" &&
          Boolean(row.item.system.energyProfile?.kind) &&
          row.item.system.energyProfile?.kind !== "pranaCrystal" &&
          physicalSnapshots.some(
            (candidate) =>
              candidate.id !== row.item.id &&
              energyCompatibility(candidate, row.item).length === 0,
          ),
        canManagePowerSource:
          row.item.type === "weapon" &&
          ["energy", "hybrid", "pranaCrystal"].includes(
            String(row.item.system.weaponProfile?.feedKind ?? ""),
          ),
        pending: pendingState === "pending",
        quarantined: pendingState === "quarantined",
        hasError: row.orphaned || row.cyclic,
        canSplit:
          !linked &&
          Number.isFinite(quantity) &&
          validateStackSplit(row.item, counted ? 1 : quantity / 2).length === 0,
        canMerge: !linked && mergeCandidates.length > 0,
        canMove:
          !linked &&
          (inventoryContainerTargets(physicalSnapshots, row.item.id).some(
            (target) =>
              target.id !== row.parentId &&
              validateInventoryMove(physicalSnapshots, row.item.id, target.id)
                .valid,
          ) ||
            (Boolean(row.parentId) &&
              validateInventoryMove(physicalSnapshots, row.item.id, null)
                .valid)),
        canTransfer: canTransfer && !linked,
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
      packageVersion: PACKAGE_VERSION,
      inventoryTab: isCharacter ? "inventory" : "capabilities",
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
      inventoryGroups: groupInventory(inventoryRows),
      equipmentOverview: equipmentOverview(
        physicalSnapshots,
        activeBody ?? { id: "" },
      ),
      carrying: carriedMass(physicalSnapshots, activeBody ?? { id: "" }),
      canConfigureBody: Boolean(game.user?.isGM),
      equipmentRecovery: Boolean(
        (this.actor as any).flags?.relis?.equipmentRecovery,
      ),
      equipmentOutfits: Array.from(this.actor.system.outfits ?? []).filter(
        (outfit: any) =>
          outfit.equipmentEntries?.length ||
          String(outfit.id).startsWith("equipment-"),
      ),
      hasInventory: inventoryRows.length > 0,
      inventoryDiagnostics: inventory.diagnostics,
      hasInventoryDiagnostics: inventory.diagnostics.length > 0,
      inventoryTotals: {
        itemCount: physicalItems.length,
        mass: displayMeasure(inventory.totalLoad.mass, "kg"),
        volume: displayMeasure(inventory.totalLoad.volume, "L"),
        bulk: displayMeasure(inventory.totalLoad.bulk, "ENC"),
      },
      physicalCash: cashSummary(
        physicalSnapshots,
        String(activeBody?.id ?? ""),
      ).map((entry) => ({
        ...entry,
        amountLabel: new Intl.NumberFormat("fr-FR", {
          maximumFractionDigits: 6,
        }).format(entry.amount),
      })),
      effects,
      effectCount: effects.length,
      itemCount: actorItems.length,
    };
  }

  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    const root = this.element as HTMLElement;
    this.activateTab(root, this.activeTab);
    bindEquipmentMenus(root);
    root
      .querySelector<HTMLButtonElement>("[data-edit-actor-portrait]")
      ?.addEventListener("click", () => {
        openActorPortraitPicker(this.actor);
      });
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-equipment-command]",
    )) {
      button.addEventListener("click", () => {
        void this.inventoryTask(async () => {
          if (!this.actor.isOwner && !game.user?.isGM) return;
          switch (button.dataset.equipmentCommand) {
            case "state":
              return this.changeEquipment(
                button.dataset.itemId ?? "",
                button.dataset.equipmentState ?? "",
              );
            case "body":
              await this.configureCarrying();
              break;
            case "save":
              await this.saveOutfit();
              break;
            case "apply":
              return this.applyOutfit(button.dataset.outfitId ?? "");
            case "recover":
              await recoverEquipment(this.actor);
              break;
          }
        }, "Commande d’équipement terminée.");
      });
    }
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-material-command]",
    )) {
      button.addEventListener("click", () => {
        void this.inventoryTask(async () => {
          if (!this.actor.isOwner && !game.user?.isGM) return false;
          const itemId = button.dataset.itemId ?? "";
          switch (button.dataset.materialCommand) {
            case "load":
              return this.loadMaterialAmmunition(itemId);
            case "unload":
              await unloadAmmunition(this.actor, itemId);
              break;
            case "energy":
              return this.transferMaterialEnergy(itemId);
            case "power-source":
              return this.manageWeaponPowerSource(itemId);
            case "consume":
              return this.consumeMaterial(itemId);
            case "port":
              return this.manageMaterialPort(
                itemId,
                button.dataset.slotKey ?? "",
              );
          }
        }, "Opération matérielle terminée.");
      });
    }
    bindInventoryView(
      root,
      `${game.world?.id}.${game.user?.id}.${this.actor.uuid}`,
      this.inventoryQuery,
    );

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
    task: () => Promise<void | boolean>,
    success: string,
  ): Promise<void> {
    try {
      const applied = await task();
      if (applied === false) return;
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

  private async confirmEquipment(
    requests: EquipmentRequest[],
    assisted = false,
  ): Promise<boolean> {
    const preview = previewEquipment(this.actor, requests, assisted);
    if (!preview.updates.length)
      throw new Error(equipmentFailureMessage(preview));
    const content = dialogContent();
    dialogNote(
      content,
      `Corps : ${preview.body.name}. Masse finale connue : ${preview.mass.mass} kg ; ${preview.mass.missing} masse(s) manquante(s).`,
    );
    for (const row of preview.rows) {
      dialogNote(
        content,
        `${row.name} → ${EQUIPMENT_LABELS[row.request.state] ?? row.request.state}. Temps déclaré : ${row.duration}. ${row.errors.join(" ")} ${row.warnings.join(" ")}`,
      );
    }
    dialogNote(
      content,
      "Appliquer confirme que le temps, l’aide et les conditions de la scène ont été respectés. Aucun temps de combat n’est débité automatiquement.",
    );
    const result = await askInventoryForm(
      assisted
        ? "Aperçu assisté — seuls les changements valides seront appliqués"
        : "Aperçu strict de l’équipement",
      content,
      "Appliquer",
    );
    if (!result) return false;
    await applyEquipment(this.actor, requests, preview.fingerprint, assisted);
    return true;
  }

  private async changeEquipment(
    itemId: string,
    state: string,
  ): Promise<boolean> {
    const item = this.actor.items.get(itemId) as Item | undefined;
    if (!item) return false;
    let hostId = "";
    if (state === "installed") {
      const items = (Array.from(this.actor.items ?? []) as Item[])
        .filter((entry) => isPhysicalItemType(entry.type))
        .map(itemSnapshot);
      const body = Array.from(this.actor.system.bodies ?? []).find(
        (entry: any) => entry.id === this.actor.system.activeBodyId,
      ) as any;
      const targets = installationTargets(
        items,
        body ?? { id: "" },
        itemSnapshot(item),
      );
      const compatible = targets.filter((target) => !target.errors.length);
      if (!compatible.length)
        throw new Error("Aucun support compatible et disponible.");
      const content = dialogContent();
      dialogNote(
        content,
        "Choisir le support. Les places sont vérifiées de nouveau au moment de l’installation.",
      );
      for (const target of compatible) {
        const label = document.createElement("label");
        label.className = "relis-install-target";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "hostId";
        input.value = target.id;
        input.required = true;
        label.append(
          input,
          document.createTextNode(`${target.name} — ${target.capacity}`),
        );
        content.append(label);
      }
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "Pourquoi les autres supports sont indisponibles ?";
      details.append(summary);
      for (const target of targets.filter((entry) => entry.errors.length)) {
        const p = document.createElement("p");
        p.textContent = `${target.name} : ${target.errors.join(" ")}`;
        details.append(p);
      }
      content.append(details);
      const result = await askInventoryForm(
        `Installer ${item.name} sur…`,
        content,
        "Installer",
      );
      if (!result) return false;
      hostId = String(result.hostId ?? "");
    }
    const requests = [{ itemId, state, hostId }];
    const preview = previewEquipment(this.actor, requests);
    if (!preview.updates.length)
      throw new Error(equipmentFailureMessage(preview));
    await applyEquipment(this.actor, requests, preview.fingerprint);
    return true;
  }

  private physicalSnapshots(): InventoryItemLike[] {
    return (Array.from(this.actor.items ?? []) as Item[])
      .filter((item) => isPhysicalItemType(item.type))
      .map(itemSnapshot);
  }

  private async loadMaterialAmmunition(targetId: string): Promise<boolean> {
    const target = this.actor.items.get(targetId) as Item | undefined;
    if (!target) return false;
    const targetSnapshot = itemSnapshot(target);
    const targetIsMagazine =
      target.type === "container" && target.system.containerKind === "magazine";
    const candidates = (Array.from(this.actor.items ?? []) as Item[]).filter(
      (item) =>
        item.type === "ammunition" &&
        Number(item.system.physical?.quantity ?? 0) > 0 &&
        (!targetIsMagazine ||
          (!item.system.physical?.containerRef?.uuid &&
            !item.system.physical?.containerRef?.relisId)) &&
        ammunitionCompatibility(itemSnapshot(item), targetSnapshot).length ===
          0,
    );
    if (!candidates.length)
      throw new Error(
        "Aucune munition exactement compatible et disponible dans cet inventaire.",
      );
    const content = dialogContent();
    dialogSelect(
      content,
      "Munition",
      "ammunitionId",
      candidates.map((item) => ({
        value: item.id,
        label: `${item.name} — ${item.system.physical.quantity} disponible(s)`,
      })),
    );
    const supplyProfile =
      target.type === "weapon"
        ? target.system.weaponProfile
        : ["armor", "equipment"].includes(target.type)
          ? target.system.supplyProfile
          : null;
    const internalLoaded = Array.from(supplyProfile?.loadSequence ?? []).reduce(
      (sum: number, segment: any) =>
        sum + Math.max(0, Number(segment.quantity ?? 0)),
      0,
    );
    const targetPhysicalFeed = supplyProfile
      ? target.type === "weapon"
        ? physicalFeedKind(
            String(supplyProfile.feedKind ?? ""),
            String(supplyProfile.hybridPhysicalFeedKind ?? ""),
          )
        : supplyProfile.feedKind === "hybrid"
          ? "internal"
          : String(supplyProfile.feedKind ?? "")
      : "";
    const internalFree = supplyProfile
      ? targetPhysicalFeed === "internal"
        ? Math.max(
            0,
            Number(
              target.type === "weapon"
                ? (supplyProfile.internalCapacity ?? 0)
                : (supplyProfile.capacity ?? 0),
            ) - internalLoaded,
          )
        : 0
      : 0;
    const chamberFree = Boolean(
      (targetPhysicalFeed === "chamber" || supplyProfile?.chamberSeparate) &&
      Array.from(supplyProfile.chamberLoad ?? []).length === 0,
    );
    const magazineLoaded = targetIsMagazine
      ? (Array.from(this.actor.items ?? []) as Item[])
          .filter(
            (item) =>
              item.type === "ammunition" &&
              (item.system.physical?.containerRef?.uuid === target.uuid ||
                item.system.physical?.containerRef?.relisId ===
                  target.system.meta?.relisId),
          )
          .reduce(
            (sum, item) => sum + Number(item.system.physical?.quantity ?? 0),
            0,
          )
      : 0;
    const magazineFree = targetIsMagazine
      ? Math.max(
          0,
          Number(target.system.magazineProfile?.capacity ?? 0) - magazineLoaded,
        )
      : 0;
    const locations = [
      ...(targetIsMagazine || internalFree > 0
        ? [
            {
              value: "magazine",
              label: targetIsMagazine ? "Chargeur" : "Magasin interne",
            },
          ]
        : []),
      ...(chamberFree
        ? [
            {
              value: "chamber",
              label:
                targetPhysicalFeed === "chamber"
                  ? "Chambre"
                  : "Chambre séparée",
            },
          ]
        : []),
    ];
    if (!locations.length)
      throw new Error("Aucune place de chargement n’est disponible.");
    if (locations.length > 1)
      dialogSelect(content, "Destination", "location", [...locations]);
    const available = Math.min(
      Math.max(
        ...candidates.map((item) => Number(item.system.physical.quantity ?? 0)),
      ),
      Math.max(internalFree, chamberFree ? 1 : 0, magazineFree),
    );
    dialogNumber(content, "Quantité", "quantity", 1, available, true);
    const result = await askInventoryForm(
      `Charger « ${target.name} »`,
      content,
      "Charger",
    );
    if (!result) return false;
    await loadAmmunition(
      this.actor,
      targetId,
      String(result.ammunitionId ?? ""),
      Number(result.quantity),
      String(result.location ?? locations[0]?.value ?? "magazine") === "chamber"
        ? "chamber"
        : "magazine",
    );
    return true;
  }

  private async transferMaterialEnergy(targetId: string): Promise<boolean> {
    const target = this.actor.items.get(targetId) as Item | undefined;
    if (!target) return false;
    const targetSnapshot = itemSnapshot(target);
    const candidates = (Array.from(this.actor.items ?? []) as Item[]).filter(
      (item) =>
        item.id !== target.id &&
        energyCompatibility(itemSnapshot(item), targetSnapshot).length === 0,
    );
    if (!candidates.length)
      throw new Error("Aucune source énergétique compatible et chargée.");
    const content = dialogContent();
    dialogSelect(
      content,
      "Source",
      "sourceId",
      candidates.map((item) => ({
        value: item.id,
        label: `${item.name} — ${item.system.energyProfile.current}/${item.system.energyProfile.maximum} CE`,
      })),
    );
    const free =
      Number(target.system.energyProfile.maximum ?? 0) -
      Number(target.system.energyProfile.current ?? 0);
    dialogNumber(content, "CE transférés", "quantity", 1, free, false);
    const result = await askInventoryForm(
      `Recharger « ${target.name} »`,
      content,
      "Transférer",
    );
    if (!result) return false;
    await transferItemEnergy(
      this.actor,
      String(result.sourceId ?? ""),
      targetId,
      Number(result.quantity),
    );
    return true;
  }

  private async manageWeaponPowerSource(weaponId: string): Promise<boolean> {
    const items = this.physicalSnapshots();
    const weapon = items.find(
      (candidate) => candidate.id === weaponId && candidate.type === "weapon",
    );
    if (!weapon) return false;
    const sourceKind =
      weapon.system.weaponProfile?.feedKind === "pranaCrystal"
        ? "pranaCrystal"
        : "battery";
    const installed = items.filter(
      (candidate) =>
        candidate.system.energyProfile?.kind === sourceKind &&
        installedOn(candidate, weapon),
    );
    const withoutInstalled = items.filter(
      (candidate) => !installed.some((entry) => entry.id === candidate.id),
    );
    const body = Array.from(this.actor.system.bodies ?? []).find(
      (entry: any) => entry.id === this.actor.system.activeBodyId,
    ) as any;
    const candidates = items.filter(
      (candidate) =>
        candidate.id !== weapon.id &&
        candidate.system.energyProfile?.kind === sourceKind &&
        !installed.some((entry) => entry.id === candidate.id) &&
        candidate.system.physical?.equipState !== "installed" &&
        powerSourceCompatibility(candidate, weapon, withoutInstalled).length ===
          0 &&
        equipmentPlan(withoutInstalled, body ?? { id: "" }, {
          itemId: candidate.id,
          state: "installed",
          hostId: weapon.id,
        }).errors.length === 0,
    );
    const content = dialogContent();
    dialogNote(
      content,
      sourceKind === "pranaCrystal"
        ? "Choisir le cristal de Prana Item installé dans cette lame. En 0.6.2, il reste incolore et non accordé."
        : "Choisir la batterie Item insérée. Ses CE restent portés par la batterie et ne sont jamais transférés dans l’arme.",
    );
    dialogSelect(content, "Source", "choice", [
      { value: "none", label: "Ne rien installer — éjecter la source" },
      ...installed.map((source) => ({
        value: `keep:${source.id}`,
        label: `Conserver ${source.name}`,
      })),
      ...candidates.map((source) => ({
        value: `install:${source.id}`,
        label:
          sourceKind === "battery"
            ? `Installer ${source.name} — ${source.system.energyProfile?.current ?? "?"}/${source.system.energyProfile?.maximum ?? "?"} CE`
            : `Installer ${source.name} — incolore, non accordé`,
      })),
    ]);
    if (!installed.length && !candidates.length)
      throw new Error(
        sourceKind === "battery"
          ? "Aucune batterie exactement compatible n’est disponible."
          : "Aucun cristal de Prana disponible n’est compatible avec cette lame.",
      );
    const result = await askInventoryForm(
      sourceKind === "battery"
        ? `Alimentation de « ${weapon.name} »`
        : `Cristal de « ${weapon.name} »`,
      content,
      "Appliquer",
    );
    if (!result) return false;
    const choice = String(result.choice ?? "");
    if (choice.startsWith("keep:")) return false;
    const requests: EquipmentRequest[] = installed.map((source) => ({
      itemId: source.id,
      state: "stored",
    }));
    if (choice.startsWith("install:"))
      requests.push({
        itemId: choice.slice("install:".length),
        state: "installed",
        hostId: weapon.id,
      });
    if (!requests.length) return false;
    return this.confirmEquipment(requests);
  }

  private async consumeMaterial(itemId: string): Promise<boolean> {
    const item = this.actor.items.get(itemId) as Item | undefined;
    if (!item) return false;
    const content = dialogContent();
    dialogNote(
      content,
      `${item.name} : une charge est dépensée si elle est suivie ; sinon une unité est consommée. L’effet et la cible restent résolus selon la règle ou le MJ jusqu’à 10-F.`,
    );
    const result = await askInventoryForm(
      `Employer « ${item.name} »`,
      content,
      "Consommer",
    );
    if (!result) return false;
    await consumeInventoryItem(this.actor, itemId);
    return true;
  }

  private async manageMaterialPort(
    hostId: string,
    slotKey: string,
  ): Promise<boolean> {
    const items = this.physicalSnapshots();
    const host = items.find((item) => item.id === hostId);
    const body = Array.from(this.actor.system.bodies ?? []).find(
      (entry: any) => entry.id === this.actor.system.activeBodyId,
    ) as any;
    if (!host || !body) return false;
    const installed = items.filter(
      (item) =>
        item.system.physical?.equipState === "installed" &&
        Number(
          item.system.physical?.equipmentProfile?.requiredSlots?.[slotKey] ?? 0,
        ) > 0 &&
        ((item.system.physical?.hostRef?.uuid &&
          item.system.physical.hostRef.uuid === host.uuid) ||
          (item.system.physical?.hostRef?.relisId &&
            item.system.physical.hostRef.relisId ===
              host.system.meta?.relisId)),
    );
    const candidates = items.filter((item) => {
      if (
        item.id === host.id ||
        item.system.physical?.equipState === "installed" ||
        Number(
          item.system.physical?.equipmentProfile?.requiredSlots?.[slotKey] ?? 0,
        ) <= 0
      )
        return false;
      return installationTargets(items, body, item).some(
        (target) => target.id === host.id && !target.errors.length,
      );
    });
    const content = dialogContent();
    dialogNote(
      content,
      `${TECHNICAL_SLOTS[slotKey] ?? slotKey} sur ${host.name}. Les choix sont recalculés au moment de l’écriture.`,
    );
    dialogSelect(content, "Choix", "choice", [
      { value: "none", label: "Ne rien mettre — retirer ce port" },
      ...installed.map((item) => ({
        value: `keep:${item.id}`,
        label: `Conserver ${item.name}`,
      })),
      ...candidates.map((item) => ({
        value: `install:${item.id}`,
        label: `Installer ${item.name}`,
      })),
    ]);
    if (!installed.length && !candidates.length)
      throw new Error(
        "Aucun module compatible : vérifier les profils, les places et les exigences.",
      );
    const result = await askInventoryForm(
      `Gérer le port « ${TECHNICAL_SLOTS[slotKey] ?? slotKey} »`,
      content,
      "Appliquer",
    );
    if (!result) return false;
    const choice = String(result.choice ?? "");
    if (choice.startsWith("keep:")) return false;
    if (choice.startsWith("install:"))
      return this.confirmEquipment([
        {
          itemId: choice.slice("install:".length),
          state: "installed",
          hostId,
        },
      ]);
    if (choice === "none") {
      if (!installed.length) return false;
      return this.confirmEquipment(
        installed.map((item) => ({ itemId: item.id, state: "stored" })),
      );
    }
    return false;
  }

  private async configureCarrying(): Promise<void> {
    if (!game.user?.isGM) return;
    const bodies = JSON.parse(
      JSON.stringify(Array.from(this.actor.system.bodies ?? [])),
    );
    const body = bodies.find(
      (entry: any) => entry.id === this.actor.system.activeBodyId,
    );
    if (!body) throw new Error("Corps actif absent.");
    const before = JSON.stringify(bodies);
    const profile = body.carrying ?? {};
    const content = dialogContent();
    dialogNote(
      content,
      "Renseigner les valeurs de la règle applicable ou une décision MJ. Laisser vide lorsqu’elles sont inconnues ; aucune formule automatique n’est supposée.",
    );
    dialogOptional(
      content,
      "Nombre de mains utilisables",
      "hands",
      profile.hands,
      true,
    );
    content.querySelector<HTMLInputElement>('[name="hands"]')!.step = "1";
    const advanced = document.createElement("details");
    const advancedSummary = document.createElement("summary");
    advancedSummary.textContent =
      "Capacités d’accessoires — règles du corps (réservé au MJ)";
    advanced.append(advancedSummary);
    content.append(advanced);
    for (const [key, fallback] of Object.entries(ACCESSORY_CAPACITIES)) {
      const label = BODY_SLOTS[key] ?? key;
      dialogOptional(
        content,
        label,
        key,
        profile.accessorySlots?.[key] ?? fallback,
        true,
      );
      advanced.append(content.lastElementChild!);
      advanced.querySelector<HTMLInputElement>(`[name="${key}"]`)!.step = "1";
    }

    dialogOptional(
      content,
      "Chargé à partir de (kg)",
      "loaded",
      profile.loaded,
      true,
    );
    dialogOptional(
      content,
      "Surchargé à partir de (kg)",
      "overloaded",
      profile.overloaded,
      true,
    );
    dialogText(
      content,
      "Source de la règle ou décision MJ",
      "source",
      profile.source || "Décision MJ",
    );
    const result = await askInventoryForm(
      `Portage — ${body.name}`,
      content,
      "Enregistrer",
    );
    if (!result) return;
    const nullable = (value: unknown) =>
      value === "" || value == null ? null : Number(value);
    const hands = nullable(result.hands),
      loaded = nullable(result.loaded),
      overloaded = nullable(result.overloaded);
    if (hands !== null && (!Number.isInteger(hands) || hands < 0))
      throw new Error("Le nombre de mains doit être un entier positif ou nul.");
    if (
      (loaded === null) !== (overloaded === null) ||
      (loaded !== null &&
        (!Number.isFinite(loaded) ||
          loaded <= 0 ||
          !Number.isFinite(overloaded) ||
          overloaded! <= loaded))
    )
      throw new Error(
        "Renseigner les deux seuils positifs, avec Surchargé supérieur à Chargé.",
      );
    if (JSON.stringify(Array.from(this.actor.system.bodies ?? [])) !== before)
      throw new Error("Le corps a changé : rouvrir la configuration.");
    const accessorySlots = Object.fromEntries(
      Object.keys(ACCESSORY_CAPACITIES).map((key) => [
        key,
        Number(result[key]),
      ]),
    );
    if (
      Object.values(accessorySlots).some(
        (value) => !Number.isSafeInteger(value) || value < 0,
      )
    )
      throw new Error(
        "Les places d’accessoires doivent être des entiers positifs ou nuls.",
      );
    body.carrying = {
      ...profile,
      accessorySlots,
      hands,
      loaded,
      overloaded,
      source: String(result.source).trim(),
    };
    await this.actor.update({ "system.bodies": bodies });
  }

  private async saveOutfit(): Promise<void> {
    const content = dialogContent();
    dialogSelect(
      content,
      "Emplacement à enregistrer ou remplacer",
      "slot",
      Array.from({ length: 5 }, (_, index) => ({
        value: String(index),
        label: `Ensemble ${index + 1}`,
      })),
    );
    dialogText(content, "Nom de l’ensemble", "name");
    dialogNote(
      content,
      "Mémorise les références et états actuels du corps actif. Aucun objet n’est copié. Un emplacement déjà utilisé sera remplacé.",
    );
    const result = await askInventoryForm(
      "Mémoriser l’équipement actuel",
      content,
      "Enregistrer",
    );
    if (result)
      await saveEquipmentOutfit(
        this.actor,
        Number(result.slot),
        String(result.name),
      );
  }

  private async applyOutfit(outfitId: string): Promise<boolean> {
    const outfit = Array.from(this.actor.system.outfits ?? []).find(
      (entry: any) => entry.id === outfitId,
    ) as any;
    if (!outfit) return false;
    if (!outfit.bodyIds?.includes(this.actor.system.activeBodyId))
      throw new Error("Cet ensemble appartient à un autre corps.");
    const content = dialogContent();
    dialogSelect(content, "Application", "mode", [
      {
        value: "strict",
        label: "Stricte — refuser si une pièce est impossible",
      },
      {
        value: "assisted",
        label: "Assistée — appliquer les changements possibles",
      },
    ]);
    dialogNote(
      content,
      "Les objets actuellement actifs mais absents de cet ensemble seront rangés sur le même corps. L’aperçu détaille tous les changements.",
    );
    const result = await askInventoryForm(
      outfit.name,
      content,
      "Voir l’aperçu",
    );
    if (!result) return false;
    const entries = Array.from(
      outfit.equipmentEntries ?? [],
    ) as EquipmentRequest[];
    const snapshots = (Array.from(this.actor.items ?? []) as Item[])
      .filter((item) => isPhysicalItemType(item.type))
      .map(itemSnapshot);
    const releases = snapshots
      .filter(
        (item) =>
          item.system.physical?.bodyId === this.actor.system.activeBodyId &&
          ["held-one", "held-two", "equipped"].includes(equipmentState(item)) &&
          !entries.some((entry) => entry.itemId === item.id),
      )
      .map((item) => ({ itemId: item.id, state: "stored" }));
    return this.confirmEquipment(
      [...releases, ...entries],
      result.mode === "assisted",
    );
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
            equipState: "stored",
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
