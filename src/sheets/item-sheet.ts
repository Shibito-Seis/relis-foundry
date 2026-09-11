import {
  EQUIP_STATES,
  ITEM_CONDITIONS,
  LEGALITY_STATES,
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
import { ATTRIBUTE_LABELS, MASTERY_LABELS, SKILL_DEFINITIONS } from "../config";
import type { RelisActor } from "../documents/actor";

const ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const EDITABLE_SURFACE_SELECTOR =
  '[contenteditable="true"], .ProseMirror[contenteditable]';

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

/**
 * Foundry's editor surface is created only after the editor opens. Applying
 * the contrast directly to that live node avoids relying on private wrapper
 * classes or on CSS crossing a shadow-root boundary.
 */
function revealEditableSurface(surface: HTMLElement): void {
  surface.dataset.relisEditorSurface = "visible";
  surface.classList.add("relis-live-editor-surface");
  surface.style.setProperty("color", "#e8f7ff", "important");
  surface.style.setProperty("-webkit-text-fill-color", "#e8f7ff", "important");
  surface.style.setProperty("caret-color", "#87f2ff", "important");
  surface.style.setProperty("font-size", "0.9rem", "important");
  surface.style.setProperty("line-height", "1.5", "important");
  surface.style.setProperty("opacity", "1", "important");
  surface.style.setProperty("visibility", "visible", "important");
  surface.style.setProperty("filter", "none", "important");
  surface.style.setProperty("mix-blend-mode", "normal", "important");
  surface.style.setProperty("position", "relative", "important");
  surface.style.setProperty("z-index", "1", "important");

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
  revealEditableSurface(surface);
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

    return {
      ...context,
      item: this.item,
      itemTypeLabel: game.i18n.localize(`TYPES.Item.${this.item.type}`),
      system,
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
      hasPhysical,
      applicability,
      hasCatalog: hasCatalogFields(applicability),
      hasSourceRef,
      itemRole: this.item.parent
        ? hasSourceRef
          ? "Exemplaire lié à une source"
          : "Exemplaire autonome"
        : "Source ou modèle de monde",
      badges,
      diagnostics,
      manualOverrides,
      requirementCount: Number(system.requirementRefs?.length ?? 0),
      effectRefCount: Number(system.effectRefs?.length ?? 0),
      physicalTotals: hasPhysical ? physicalTotals(system.physical) : null,
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
            if (!revealEditorSurface(descriptionEditor, event))
              scheduleEditorSurfaceReveal(descriptionEditor);
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
