import { classificationContext } from "../ui/equipment-profile";
import { legacySlot, slotProfileErrors } from "../rules/equipment-slots";
import {
  equipmentProfileGroups,
  technicalSlotRows,
  bindEquipmentProfile,
} from "../ui/equipment-profile";
import {
  ACCESSIBILITY_STATES,
  CONTAINER_ACCESS_RULES,
  EQUIP_STATES,
  ITEM_CONDITIONS,
  LEGALITY_STATES,
  OWNERSHIP_STATES,
  QUANTITY_UNITS,
  isPhysicalItemType,
  physicalTotals,
} from "../data/item-defaults";
import {
  QUALITY_GRADE_LABELS,
  STRUCTURAL_RARITY_LABELS,
  hasCatalogFields,
  itemFieldApplicability,
  normalizeTraitIds,
  traitChoices,
  traitLabel,
} from "../data/item-catalog";
import {
  presentInventory,
  type InventoryItemLike,
  type InventoryLoad,
} from "../rules/inventory";
import {
  ATTRIBUTE_LABELS,
  MASTERY_LABELS,
  PACKAGE_VERSION,
  SKILL_DEFINITIONS,
} from "../config";
import type { RelisActor } from "../documents/actor";
import { materialDiagnostics } from "../rules/personal-material";

const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const EDITABLE_SURFACE_SELECTOR =
  '[contenteditable="true"], .ProseMirror[contenteditable]';
const EDITOR_TOOLBAR_SELECTOR = [
  "menu",
  '[role="toolbar"]',
  ".editor-menu",
  ".prosemirror-menu",
  ".ProseMirror-menubar",
].join(", ");

function isElement(value: unknown): value is HTMLElement {
  return Boolean(
    value &&
    typeof value === "object" &&
    (value as HTMLElement).nodeType === 1 &&
    (value as HTMLElement).style?.setProperty,
  );
}

function isEditableSurface(value: unknown): value is HTMLElement {
  if (!isElement(value)) return false;
  return (
    value.isContentEditable || value.getAttribute("contenteditable") === "true"
  );
}

/**
 * Find Foundry's live ProseMirror surface even if a future implementation
 * places it in a shadow root or an iframe.
 */
function findEditableSurface(root: ParentNode): HTMLElement | null {
  if (isEditableSurface(root)) return root;
  const direct = root.querySelector<HTMLElement>(EDITABLE_SURFACE_SELECTOR);
  if (direct) return direct;

  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.shadowRoot) {
      const shadowMatch = findEditableSurface(element.shadowRoot);
      if (shadowMatch) return shadowMatch;
    }
    if (element.tagName === "IFRAME") {
      const frameDocument = (element as HTMLIFrameElement).contentDocument;
      if (frameDocument) {
        const frameMatch = findEditableSurface(frameDocument);
        if (frameMatch) return frameMatch;
      }
    }
  }
  return null;
}

function nearestSharedContainer(
  first: HTMLElement,
  second: HTMLElement,
): HTMLElement | null {
  let candidate = first.parentElement;
  while (candidate) {
    if (candidate.contains(second)) return candidate;
    candidate = candidate.parentElement;
  }
  return null;
}

function findEditorToolbar(
  editor: HTMLElement,
  surface: HTMLElement,
): { toolbar: HTMLElement; layout: HTMLElement } | null {
  const surfaceRoot = surface.getRootNode() as ParentNode;
  const roots = editor.contains(surface) ? [editor] : [surfaceRoot];

  for (const root of roots) {
    for (const toolbar of root.querySelectorAll<HTMLElement>(
      EDITOR_TOOLBAR_SELECTOR,
    )) {
      if (toolbar.contains(surface)) continue;
      const controls = toolbar.querySelectorAll(
        'button, select, a, [role="button"]',
      );
      if (controls.length < 3) continue;
      const layout = nearestSharedContainer(toolbar, surface);
      if (layout) return { toolbar, layout };
    }
  }
  return null;
}

function directChildContaining(
  container: HTMLElement,
  descendant: HTMLElement,
): HTMLElement {
  let child = descendant;
  while (child.parentElement && child.parentElement !== container) {
    child = child.parentElement;
  }
  return child;
}

function arrangeEditorLayout(editor: HTMLElement, surface: HTMLElement): void {
  const editorParts = findEditorToolbar(editor, surface);
  if (!editorParts) return;
  const { toolbar, layout } = editorParts;
  const content = directChildContaining(layout, surface);

  // Do not touch Foundry's live menu while a toolbar control is acquiring
  // focus. Re-applying positional styles between pointerdown and click can
  // prevent ProseMirror's native command handlers from receiving the click.
  if (
    layout.dataset.relisEditorLayout === "stacked" &&
    toolbar.dataset.relisEditorToolbar === "true" &&
    content.dataset.relisEditorContent === "true"
  )
    return;

  layout.dataset.relisEditorLayout = "stacked";
  layout.style.setProperty("display", "flex", "important");
  layout.style.setProperty("flex-direction", "column", "important");
  layout.style.setProperty("align-items", "stretch", "important");
  layout.style.setProperty("gap", "0.45rem", "important");
  layout.style.setProperty("position", "relative", "important");
  layout.style.setProperty("isolation", "isolate", "important");
  layout.style.setProperty("overflow", "visible", "important");

  toolbar.dataset.relisEditorToolbar = "true";
  toolbar.style.setProperty("position", "relative", "important");
  toolbar.style.setProperty("inset", "auto", "important");
  toolbar.style.setProperty("z-index", "20", "important");
  toolbar.style.setProperty("display", "flex", "important");
  toolbar.style.setProperty("flex-wrap", "wrap", "important");
  toolbar.style.setProperty("align-items", "center", "important");
  toolbar.style.setProperty("gap", "0.3rem", "important");
  toolbar.style.setProperty("width", "100%", "important");
  toolbar.style.setProperty("height", "auto", "important");
  toolbar.style.setProperty("min-height", "2.55rem", "important");
  toolbar.style.setProperty("max-height", "none", "important");
  toolbar.style.setProperty("margin", "0", "important");
  toolbar.style.setProperty("padding", "0.35rem", "important");
  toolbar.style.setProperty("box-sizing", "border-box", "important");
  toolbar.style.setProperty("overflow", "visible", "important");
  toolbar.style.setProperty("pointer-events", "auto", "important");
  toolbar.style.setProperty("list-style", "none", "important");
  toolbar.style.setProperty("background", "#123444", "important");
  toolbar.style.setProperty("border", "1px solid #367487", "important");
  toolbar.style.setProperty("border-radius", "4px", "important");
  toolbar.style.setProperty("box-shadow", "none", "important");

  content.dataset.relisEditorContent = "true";
  content.style.setProperty("position", "relative", "important");
  content.style.setProperty("inset", "auto", "important");
  content.style.setProperty("z-index", "1", "important");
  content.style.setProperty("flex", "1 1 auto", "important");
  content.style.setProperty("width", "100%", "important");
  content.style.setProperty("min-height", "12rem", "important");
  content.style.setProperty("box-sizing", "border-box", "important");

  surface.style.setProperty("inset", "auto", "important");
  surface.style.setProperty("width", "100%", "important");
  surface.style.setProperty("min-height", "12rem", "important");
  surface.style.setProperty("margin", "0", "important");
  surface.style.setProperty("padding", "0.55rem 0.65rem", "important");
  surface.style.setProperty("box-sizing", "border-box", "important");
  surface.style.setProperty("pointer-events", "auto", "important");
}

/**
 * Foundry's editor surface is created only after the editor opens. Applying
 * the contrast directly to that live node avoids relying on private wrapper
 * classes or on CSS crossing a shadow-root boundary.
 */
function revealEditableSurface(
  editor: HTMLElement,
  surface: HTMLElement,
): void {
  surface.dataset.relisEditorSurface = "visible";
  surface.classList.add("relis-live-editor-surface");
  arrangeEditorLayout(editor, surface);
  surface.style.setProperty("color", "#e8f7ff", "important");
  surface.style.setProperty("-webkit-text-fill-color", "#e8f7ff", "important");
  surface.style.setProperty("caret-color", "#87f2ff", "important");
  surface.style.setProperty("font-size", "0.9rem", "important");
  surface.style.setProperty("line-height", "1.5", "important");
  surface.style.setProperty("opacity", "1", "important");
  surface.style.setProperty("visibility", "visible", "important");
  surface.style.setProperty("filter", "none", "important");
  surface.style.setProperty("mix-blend-mode", "normal", "important");
  surface.style.setProperty("position", "static", "important");
  surface.style.setProperty("z-index", "auto", "important");

  for (const child of surface.querySelectorAll<HTMLElement>("*")) {
    child.style.setProperty("color", "inherit", "important");
    child.style.setProperty(
      "-webkit-text-fill-color",
      "currentColor",
      "important",
    );
    child.style.setProperty("opacity", "1", "important");
    child.style.setProperty("visibility", "visible", "important");
    child.style.setProperty("filter", "none", "important");
    child.style.setProperty("mix-blend-mode", "normal", "important");
  }
}

function eventEditableSurface(event: Event): HTMLElement | null {
  return event.composedPath().find(isEditableSurface) as HTMLElement | null;
}

function revealEditorSurface(editor: HTMLElement, event?: Event): boolean {
  const eventSurface = event ? eventEditableSurface(event) : null;
  if (event && !eventSurface) return false;
  const primaryInput = (editor as any)._primaryInput;
  const surface =
    eventSurface ||
    (isEditableSurface(primaryInput)
      ? primaryInput
      : isElement(primaryInput)
        ? findEditableSurface(primaryInput)
        : null) ||
    findEditableSurface(editor);
  if (!surface) return false;
  revealEditableSurface(editor, surface);
  return true;
}

function scheduleEditorSurfaceReveal(editor: HTMLElement): void {
  let attempts = 8;
  const reveal = () => {
    if (revealEditorSurface(editor) || --attempts <= 0) return;
    requestAnimationFrame(reveal);
  };
  queueMicrotask(reveal);
}

function optionElements(root: ParentNode): HTMLOptionElement[] {
  const options = Array.from(
    root.querySelectorAll<HTMLOptionElement>("option"),
  );
  for (const element of root.querySelectorAll<HTMLElement>("*")) {
    if (element.shadowRoot) options.push(...optionElements(element.shadowRoot));
  }
  return [...new Set(options)];
}

function syncSelectedTraitOptions(selector: HTMLElement): void {
  const value = (selector as any).value;
  const selected = new Set(
    normalizeTraitIds(value instanceof Set ? Array.from(value) : value),
  );
  for (const option of optionElements(selector)) {
    option.hidden = selected.has(option.value);
  }
}

function fieldValue(
  target: FormControl,
): string | string[] | number | boolean | null {
  if (target.dataset.valueType === "boolean")
    return (target as HTMLInputElement).checked;
  if (target.dataset.valueType === "nullable-number")
    return target.value === "" ? null : Number(target.value);
  if (target.dataset.valueType === "string-list")
    return Array.from(
      new Set(
        target.value
          .split(/[,;\n]/)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    );
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
  carried: "Rangé",
  readied: "Préparé",
  equipped: "Équipé",
  installed: "Installé",
  ground: "Au sol",
};

const CONDITION_LABELS: Record<string, string> = {
  intact: "Intact",
  worn: "Usé",
  damaged: "Endommagé",
  broken: "Brisé",
  destroyed: "Détruit",
};

const OWNERSHIP_LABELS: Record<string, string> = {
  owned: "Possédé",
  loaned: "Prêté",
  issued: "Attribué",
  held: "Détenu",
  evidence: "Pièce à conviction",
};

const ACCESSIBILITY_LABELS: Record<string, string> = {
  ready: "Prêt",
  accessible: "Accessible",
  stored: "Rangé",
  distant: "Distant",
  unavailable: "Indisponible",
};

const CONTAINER_ACCESS_LABELS: Record<string, string> = {
  normal: "Accès normal",
  quick: "Accès rapide",
  restricted: "Accès restreint",
  sealed: "Scellé",
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
    const isContainer = this.item.type === "container";
    const applicability = itemFieldApplicability(this.item.type);
    const canEditDescription = Boolean(
      this.item.isOwner &&
      (game.user?.isGM || system.permissions?.playerEditableDescription),
    );
    const canManageDescriptionPermission = Boolean(
      this.item.isOwner && game.user?.isGM,
    );
    const canEditTraits = Boolean(this.item.isOwner);
    const selectedTraitIds = normalizeTraitIds(system.traits);
    const traitOptions = traitChoices(selectedTraitIds);
    const description = String(system.description ?? "");
    const enrichedDescription =
      await foundry.applications.ux.TextEditor.implementation.enrichHTML(
        description,
        {
          async: true,
          relativeTo: this.item,
          secrets: this.item.isOwner,
        },
      );
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
    if (hasPhysical) {
      const source = this.item.toObject?.(true) ?? {};
      for (const diagnostic of materialDiagnostics({
        id: this.item.id,
        name: this.item.name,
        type: this.item.type,
        uuid: this.item.uuid,
        system: source.system ?? system,
        flags: source.flags ?? this.item.flags ?? {},
      }))
        diagnostics.push({
          level: diagnostic.level,
          icon:
            diagnostic.level === "error"
              ? "fa-circle-exclamation"
              : "fa-triangle-exclamation",
          message: diagnostic.message,
        });
    }
    let containerUsage: InventoryLoad | null = null;
    if (isContainer && this.item.parent) {
      const owned = (Array.from(this.item.parent.items ?? []) as Item[]).map(
        (item): InventoryItemLike => {
          const source = item.toObject?.(true) ?? {};
          return {
            id: item.id,
            name: item.name,
            type: item.type,
            uuid: item.uuid,
            system: source.system ?? item.system ?? {},
            flags: source.flags ?? item.flags ?? {},
          };
        },
      );
      containerUsage =
        presentInventory(owned).rows.find((row) => row.item.id === this.item.id)
          ?.containerUsage ?? null;
    }

    return {
      ...context,
      item: this.item,
      itemTypeLabel: game.i18n.localize(`TYPES.Item.${this.item.type}`),
      system,
      packageVersion: PACKAGE_VERSION,
      editable: this.item.isOwner,
      canEditDescription,
      canManageDescriptionPermission,
      canEditTraits,
      description,
      enrichedDescription,
      traitOptions,
      selectedTraits: selectedTraitIds.map((value) => ({
        value,
        label: traitLabel(value),
      })),
      isAction: this.item.type === "action",
      isWeapon: this.item.type === "weapon",
      isArmor: this.item.type === "armor",
      isAmmunition: this.item.type === "ammunition",
      isConsumable: this.item.type === "consumable",
      isResource: this.item.type === "resource",
      hasProtectionProfile:
        this.item.type === "armor" ||
        (this.item.type === "weapon" &&
          (system.physical?.equipmentProfile?.wearForm === "shield" ||
            Boolean(system.protectionProfile?.kind))),
      hasEnergyProfile: [
        "weapon",
        "armor",
        "equipment",
        "consumable",
        "resource",
      ].includes(this.item.type),
      hasSupplyProfile: ["armor", "equipment"].includes(this.item.type),
      hasPhysical,
      technicalSlotRows: technicalSlotRows(
        system.physical?.equipmentProfile ?? {},
      ),
      ...classificationContext(
        system.physical?.equipmentProfile ?? {},
        this.item.type,
        Boolean(game.user?.isGM),
      ),
      equipmentSlotHint:
        this.item.type === "weapon"
          ? "Choisir Bouclier uniquement pour un véritable bouclier ; les mains nécessaires viennent de sa source."
          : this.item.type === "armor"
            ? "Casques, protections de membres, combinaisons et exo-armures utilisent les emplacements d’armure."
            : this.item.type === "equipment"
              ? "Une forme unique par objet. Les ornements décoratifs ne donnent aucun bonus implicite. Les capacités appartiennent au corps."
              : "Aucun emplacement corporel pour ce type ; l’installation sur un hôte reste distincte.",
      equipmentSlotErrors: slotProfileErrors(
        system.physical?.equipmentProfile ?? {},
        this.item.type,
      ),
      legacyEquipmentSlot: legacySlot(system.physical?.equipmentProfile ?? {}),
      equipmentFamilies: {
        "": "Selon le type d’objet",
        manipulable: "Objet manipulable",
        wearable: "Équipement portable",
        resource: "Ressource ou consommable",
      },
      equipmentProfileGroups: hasPhysical
        ? equipmentProfileGroups(
            system.physical?.equipmentProfile ?? {},
            (value) => game.i18n.localize(value),
            this.item.type,
          )
        : [],
      isContainer,
      applicability,
      hasCatalog: hasCatalogFields(applicability),
      hasSourceRef,
      itemRole: this.item.parent
        ? hasSourceRef
          ? "Exemplaire lié à une source"
          : "Exemplaire autonome"
        : "Source ou modèle de monde",
      isOwnedPhysical: Boolean(this.item.parent && hasPhysical),
      equipmentLabel:
        EQUIP_STATE_LABELS[system.physical?.equipState] ?? "Rangé",
      badges,
      diagnostics,
      manualOverrides,
      requirementCount: Number(system.requirementRefs?.length ?? 0),
      effectRefCount: Number(system.effectRefs?.length ?? 0),
      physicalTotals: hasPhysical ? physicalTotals(system.physical) : null,
      containerUsage,
      qualityOptions: [
        { value: "", label: "Non applicable" },
        ...QUALITY_GRADE_LABELS.map((label, value) => ({
          value,
          label,
        })),
      ],
      rarityOptions: [
        { value: "", label: "Non applicable" },
        ...STRUCTURAL_RARITY_LABELS.map((label, value) => ({
          value,
          label,
        })),
      ],
      legalityOptions: options(["", ...LEGALITY_STATES], LEGALITY_LABELS),
      quantityUnitOptions: options(QUANTITY_UNITS, {}),
      equipStateOptions: options(
        EQUIP_STATES.filter((state) => state !== "carried"),
        EQUIP_STATE_LABELS,
      ),
      selectedEquipState:
        system.physical?.equipState === "carried"
          ? "stored"
          : system.physical?.equipState,
      conditionOptions: options(ITEM_CONDITIONS, CONDITION_LABELS),
      ownershipOptions: options(OWNERSHIP_STATES, OWNERSHIP_LABELS),
      accessibilityOptions: options(ACCESSIBILITY_STATES, ACCESSIBILITY_LABELS),
      containerAccessOptions: options(
        CONTAINER_ACCESS_RULES,
        CONTAINER_ACCESS_LABELS,
      ),
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
      weaponSupportOptions: {
        "": "Non renseigné",
        personal: "Personnel",
        vehicle: "Véhicule",
        mecha: "Mecha",
        spatial: "Spatial",
        natural: "Naturel matériel",
      },
      accessOptions: {
        "": "Non renseigné",
        common: "Courante",
        martial: "Martiale",
        specialized: "Spécialisée",
        heavy: "Lourde",
      },
      attackModeOptions: {
        "": "Non renseigné",
        melee: "Mêlée",
        ranged: "Distance",
        thrown: "Lancée",
        mounted: "Montée",
        natural: "Naturelle matérielle",
      },
      defenseTargetOptions: {
        "": "Non renseignée",
        cap: "CAP",
        cae: "CAE",
        maneuver: "DD de manœuvre",
        profile: "Selon le mode ou le profil",
      },
      rangeKindOptions: {
        "": "Non renseigné",
        contact: "Contact",
        thrown: "Lancée",
        increments: "Portées chiffrées",
        zone: "Zone",
        special: "Spéciale",
      },
      feedKindOptions: {
        "": "Non renseigné",
        none: "Aucune alimentation",
        internal: "Magasin interne",
        detachable: "Chargeur détachable",
        energy: "Énergie",
        hybrid: "Hybride",
      },
      protectionKindOptions: {
        "": "Non renseigné",
        underlayer: "Sous-couche",
        light: "Armure légère",
        intermediate: "Armure intermédiaire",
        heavy: "Armure lourde",
        exo: "Exo-armure",
        underhelmet: "Sous-casque",
        helmet: "Casque",
        arms: "Protections de bras",
        legs: "Jambières",
        eva: "Combinaison EVA",
        shield: "Bouclier",
        barrier: "Champ ou barrière",
      },
      sealingOptions: {
        "": "Non renseigné",
        none: "Non scellable",
        partial: "Scellement partiel",
        sealed: "Scellable / scellé selon l’état",
      },
      energyKindOptions: {
        "": "Sans profil énergétique",
        battery: "Batterie",
        internal: "Réserve interne",
        generator: "Générateur",
        singleUse: "Source à usage unique",
      },
      energyCycleOptions: {
        "": "Non renseigné",
        rechargeable: "Rechargeable",
        consumable: "Consommable",
        hybrid: "Hybride",
      },
      consumableKindOptions: {
        "": "Non renseignée",
        medical: "Médicament ou soin",
        drug: "Stimulant ou drogue",
        toxin: "Poison ou toxine",
        potion: "Potion ou élixir",
        matrix: "Matrice ou cartouche",
        grenade: "Grenade ou projectile consommable",
        mine: "Mine",
        charge: "Charge de démolition",
        utility: "Consommable utilitaire",
      },
      consumableEnergyOptions: {
        "": "Aucune ou non renseignée",
        mana: "Mana",
        prana: "Prana investi",
        flux: "Flux",
        technomagic: "Techno-magique",
        other: "Autre source encodée",
      },
      routeOptions: {
        "": "Non renseignée",
        oral: "Orale",
        inhaled: "Inhalée",
        cutaneous: "Cutanée",
        injected: "Injectée",
        infused: "Perfusée",
        contact: "Contact",
        other: "Autre",
      },
      containerKindOptions: {
        general: "Conteneur général",
        magazine: "Chargeur détachable",
      },
      installationKindOptions: {
        "": "Non renseignée",
        accessory: "Accessoire amovible",
        modification: "Modification intégrée",
        improvement: "Amélioration de grade ou valeur",
      },
      consumableSafetyOptions: {
        "": "Non renseigné",
        usable: "Utilisable",
        uncertain: "Incertain",
        contaminated: "Contaminé",
        expired: "Périmé",
      },
    };
  }

  async _onRender(context: any, optionsValue: any): Promise<void> {
    await super._onRender(context, optionsValue);
    const root = this.element as HTMLElement;
    bindEquipmentProfile(root, this.item, (message) =>
      ui.notifications.error(message),
    );
    const descriptionHost = root.querySelector<HTMLElement>(
      "[data-description-editor-host]",
    );
    if (descriptionHost) {
      const descriptionEditor =
        foundry.applications.elements.HTMLProseMirrorElement.create({
          name: "system.description",
          value: String(context.description ?? ""),
          enriched: String(context.enrichedDescription ?? ""),
          toggled: true,
          documentUUID: this.item.uuid,
          collaborate: false,
          height: 260,
          disabled: !context.canEditDescription,
          classes: "relis-description-editor",
          dataset: { descriptionEditor: "true" },
        });
      descriptionHost.replaceChildren(descriptionEditor);
      descriptionEditor.addEventListener("open", () => {
        scheduleEditorSurfaceReveal(descriptionEditor);
      });
      for (const eventName of ["focusin", "beforeinput", "input"]) {
        descriptionEditor.addEventListener(
          eventName,
          (event: Event) => {
            // A toolbar button also emits focusin inside <prose-mirror>.
            // Only the actual contenteditable surface should trigger our
            // visibility patch; the menu must remain untouched for the whole
            // native pointer interaction.
            revealEditorSurface(descriptionEditor, event);
          },
          { capture: true },
        );
      }
      descriptionEditor.addEventListener("save", (event: Event) => {
        if (!context.canEditDescription) return;
        const value = String((event.currentTarget as any).value ?? "");
        void this.item.update({ "system.description": value });
      });
    }
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
    const traitSelector = root.querySelector<HTMLElement>(
      "[data-trait-selector]",
    );
    if (traitSelector) {
      requestAnimationFrame(() => syncSelectedTraitOptions(traitSelector));
      traitSelector.addEventListener("change", (event) => {
        if (!context.canEditTraits) return;
        const value = (event.currentTarget as any).value;
        syncSelectedTraitOptions(event.currentTarget as HTMLElement);
        void this.item.update({
          "system.traits": normalizeTraitIds(
            value instanceof Set ? Array.from(value) : value,
          ),
        });
      });
    }
    root
      .querySelector<HTMLButtonElement>("[data-action='edit-image']")
      ?.addEventListener("click", () => {
        if (!this.item.isOwner) return;
        const FilePicker = foundry.applications.apps.FilePicker.implementation;
        const picker = new FilePicker({
          type: "image",
          current: this.item.img,
          callback: (path: string) => this.item.update({ img: path }),
        });
        void picker.render({ force: true });
      });
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
