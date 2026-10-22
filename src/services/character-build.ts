import type {
  CatalogSelection,
  CharacterCreationDraft,
} from "../rules/character-creation";
import {
  characterActorSource,
  deriveCharacterCreation,
  draftSelections,
  initialPhysicalCredits,
} from "../rules/character-creation";

export const BUILD_ITEM_TYPES = new Set([
  "ancestry",
  "profile",
  "origin",
  "advantage",
  "drawback",
  "path",
  "specialization",
  "post",
]);

export const BUILD_SLOT_DEFINITIONS = {
  ancestry: {
    label: "Ascendance",
    packId: "relis.creation-ancestries",
    itemType: "ancestry",
    path: "system.build.ancestryRef",
    multiple: false,
  },
  profile: {
    label: "Profil",
    packId: "relis.creation-profiles",
    itemType: "profile",
    path: "system.build.profileRef",
    multiple: false,
  },
  origin: {
    label: "Origine",
    packId: "relis.creation-origins",
    itemType: "origin",
    path: "system.build.originRef",
    multiple: false,
  },
  advantages: {
    label: "Atouts",
    packId: "relis.creation-advantages",
    itemType: "advantage",
    path: "system.build.advantageRefs",
    multiple: true,
  },
  drawbacks: {
    label: "Handicaps",
    packId: "relis.creation-drawbacks",
    itemType: "drawback",
    path: "system.build.drawbackRefs",
    multiple: true,
  },
  path: {
    label: "Voie principale",
    packId: "relis.progression-paths",
    itemType: "path",
    path: "system.build.pathRef",
    multiple: false,
  },
  primarySpecialization: {
    label: "Spécialisation Principale",
    packId: "relis.progression-specializations",
    itemType: "specialization",
    path: "system.build.primarySpecializationRef",
    multiple: false,
  },
  secondarySpecializations: {
    label: "Spécialisations secondaires",
    packId: "relis.progression-specializations",
    itemType: "specialization",
    path: "system.build.secondarySpecializations",
    multiple: true,
  },
  primaryPost: {
    label: "Poste principal",
    packId: "relis.creation-posts",
    itemType: "post",
    path: "system.post.primaryRef",
    multiple: false,
  },
  secondaryPosts: {
    label: "Postes secondaires",
    packId: "relis.creation-posts",
    itemType: "post",
    path: "system.post.secondaryRefs",
    multiple: true,
  },
} as const;

export type BuildSlotKey = keyof typeof BUILD_SLOT_DEFINITIONS;

export interface BuildSlotRow {
  key: BuildSlotKey;
  label: string;
  packId: string;
  multiple: boolean;
  items: Array<{
    id: string;
    name: string;
    img: string;
    relisId: string;
    selected: boolean;
    legacy: boolean;
    cssClass: string;
    slotKey: BuildSlotKey;
  }>;
  empty: boolean;
  diagnostic: string;
}

function referenceFromSelection(
  selection: CatalogSelection,
  embedded: Item,
): Record<string, any> {
  return {
    relisId: selection.relisId,
    uuid: embedded.uuid,
    documentName: "Item",
    type: selection.type,
    state: "resolved",
    labelSnapshot: selection.name,
    missingPolicy: "diagnose",
  };
}

function sourceRelisId(item: Item): string {
  return String(
    item.system?.meta?.relisId ?? item.flags?.relis?.canonicalId ?? "",
  );
}

function referenceMatches(item: Item, reference: any): boolean {
  return Boolean(
    (reference?.uuid && reference.uuid === item.uuid) ||
    (reference?.relisId && reference.relisId === sourceRelisId(item)),
  );
}

function getPath(source: any, path: string): any {
  return path.split(".").reduce((value, key) => value?.[key], source);
}

export function buildSlotRows(actor: Actor): BuildSlotRow[] {
  const items = Array.from(actor.items ?? []) as Item[];
  return Object.entries(BUILD_SLOT_DEFINITIONS).map(([key, definition]) => {
    const candidates = items.filter(
      (item) => item.type === definition.itemType,
    );
    const raw = getPath(actor, definition.path);
    const references = definition.multiple
      ? Array.from(raw ?? []).map((entry: any) => entry?.ref ?? entry)
      : raw
        ? [raw]
        : [];
    const rows = candidates.map((item) => {
      const selected = references.some((reference) =>
        referenceMatches(item, reference),
      );
      return {
        id: item.id,
        name: item.name,
        img: item.img || "icons/svg/item-bag.svg",
        relisId: sourceRelisId(item),
        selected,
        legacy: !selected,
        cssClass: selected
          ? "relis-build-item"
          : "relis-build-item relis-build-item--legacy",
        slotKey: key as BuildSlotKey,
      };
    });
    let diagnostic = "";
    if (!definition.multiple && candidates.length > 1)
      diagnostic = `${candidates.length} Items ${definition.label} sont embarqués. Aucun n’est supprimé automatiquement.`;
    else if (
      !definition.multiple &&
      candidates.length === 1 &&
      !rows[0]?.selected
    )
      diagnostic = "Item historique non rattaché à la référence active.";
    else if (definition.multiple && rows.some((row) => row.legacy)) {
      const legacyCount = rows.filter((row) => row.legacy).length;
      diagnostic = `${legacyCount} Item${legacyCount > 1 ? "s" : ""} ${definition.label} historique${legacyCount > 1 ? "s" : ""} non rattaché${legacyCount > 1 ? "s" : ""}. Aucun n’est supprimé automatiquement.`;
    } else if (
      references.some(
        (reference) =>
          !candidates.some((item) => referenceMatches(item, reference)),
      )
    )
      diagnostic =
        "Une référence active ne correspond plus à aucun Item embarqué.";
    return {
      key: key as BuildSlotKey,
      label: definition.label,
      packId: definition.packId,
      multiple: definition.multiple,
      items: rows,
      empty: rows.length === 0,
      diagnostic,
    };
  });
}

export function legacyBuildDiagnostics(actor: Actor): string[] {
  return buildSlotRows(actor)
    .map((slot) => slot.diagnostic)
    .filter(Boolean);
}

export async function loadCatalogSelections(
  packId: string,
  predicate?: (selection: CatalogSelection) => boolean,
): Promise<CatalogSelection[]> {
  const pack = game.packs?.get(packId);
  if (!pack) throw new Error(`Compendium introuvable : ${packId}.`);
  const documents = (await pack.getDocuments()) as Item[];
  return documents
    .map((document) => ({
      packId,
      uuid: document.uuid,
      relisId: sourceRelisId(document),
      name: document.name,
      type: document.type,
      img: document.img || "icons/svg/item-bag.svg",
      catalog: JSON.parse(JSON.stringify(document.system?.catalog ?? {})),
      level:
        document.system?.level === null || document.system?.level === undefined
          ? null
          : Number(document.system.level),
      requirementRefs: JSON.parse(
        JSON.stringify(document.system?.requirementRefs ?? []),
      ),
      description: String(document.system?.description ?? ""),
    }))
    .filter(
      (selection) =>
        selection.catalog.selectable !== false &&
        (!predicate || predicate(selection)),
    )
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
}

export async function loadCatalogSelectionsFromPacks(
  packIds: string[],
  predicate?: (selection: CatalogSelection) => boolean,
): Promise<CatalogSelection[]> {
  const groups = await Promise.all(
    packIds.map((packId) => loadCatalogSelections(packId, predicate)),
  );
  return groups
    .flat()
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
}

export async function openCatalogSelectionDocument(
  selection: CatalogSelection,
): Promise<void> {
  if (selection.type === "ancestry") {
    const pack = game.packs?.get("relis.creation-ancestry-journals");
    if (pack) {
      const journals = await pack.getDocuments();
      const journal = journals.find(
        (entry: any) =>
          entry.flags?.relis?.ancestryRelisId === selection.relisId,
      );
      if (journal) {
        await journal.sheet?.render(true);
        return;
      }
    }
  }
  const document = await fromUuid(selection.uuid);
  if (!document)
    throw new Error(`Source de catalogue introuvable : ${selection.name}.`);
  await document.sheet?.render(true);
}

function normalizeCatalogSearch(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLocaleLowerCase("fr");
}

function plainText(value: unknown): string {
  const container = document.createElement("div");
  container.innerHTML = String(value ?? "");
  return (container.textContent ?? "").trim();
}

function catalogMetadata(selection: CatalogSelection): string {
  const value = String(selection.catalog.value ?? "").trim();
  const level = selection.level ? `Niveau ${selection.level}` : "";
  return [
    value ? `Valeur ${value}` : "",
    selection.catalog.pathName,
    selection.catalog.branchName,
    selection.catalog.family,
    selection.catalog.postTier === "primary"
      ? "Poste principal"
      : selection.catalog.postTier === "secondary"
        ? "Poste secondaire"
        : "",
    level,
  ]
    .filter(Boolean)
    .join(" · ");
}

export async function openCatalogPicker(options: {
  title: string;
  packId?: string;
  packIds?: string[];
  selectedRelisIds?: string[];
  predicate?: (selection: CatalogSelection) => boolean;
}): Promise<CatalogSelection | null> {
  const packIds = options.packIds ?? (options.packId ? [options.packId] : []);
  if (!packIds.length) throw new Error("Aucun catalogue n’a été fourni.");
  const entries = await loadCatalogSelectionsFromPacks(
    packIds,
    options.predicate,
  );
  const root = document.createElement("div");
  const browser = document.createElement("section");
  browser.className = "relis-catalog-browser";
  const searchLabel = document.createElement("label");
  searchLabel.textContent = "Rechercher dans le catalogue";
  const search = document.createElement("input");
  search.type = "search";
  search.placeholder = "Nom, famille ou branche…";
  searchLabel.append(search);
  browser.append(searchLabel);
  const status = document.createElement("p");
  status.className = "relis-catalog-browser__status";
  status.setAttribute("role", "status");
  browser.append(status);
  const list = document.createElement("div");
  list.className = "relis-catalog-browser__list";
  const selectedIds = new Set(options.selectedRelisIds ?? []);
  for (const [index, entry] of entries.entries()) {
    const row = document.createElement("article");
    row.className = "relis-catalog-browser__entry";
    row.dataset.search = normalizeCatalogSearch(
      `${entry.name} ${catalogMetadata(entry)} ${plainText(entry.description ?? "")}`,
    );
    const input = document.createElement("input");
    input.type = "radio";
    input.name = "selection";
    input.value = String(index);
    input.disabled = selectedIds.has(entry.relisId);
    input.setAttribute("aria-label", `Sélectionner ${entry.name}`);
    const image = document.createElement("img");
    image.src = entry.img;
    image.alt = "";
    const text = document.createElement("span");
    const strong = document.createElement("strong");
    strong.textContent = entry.name;
    const small = document.createElement("small");
    small.textContent = [
      catalogMetadata(entry),
      selectedIds.has(entry.relisId) ? "Déjà sélectionné" : "",
    ]
      .filter(Boolean)
      .join(" · ");
    text.append(strong, small);
    const actions = document.createElement("span");
    actions.className = "relis-catalog-browser__actions";
    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.disabled = input.disabled;
    selectButton.innerHTML =
      '<i class="fa-solid fa-check" aria-hidden="true"></i> Sélectionner';
    selectButton.addEventListener("click", () => {
      input.checked = true;
      for (const candidate of list.querySelectorAll("article"))
        candidate.classList.remove("is-selected");
      row.classList.add("is-selected");
    });
    const readButton = document.createElement("button");
    readButton.type = "button";
    readButton.innerHTML =
      '<i class="fa-solid fa-book-open" aria-hidden="true"></i> Lire';
    readButton.addEventListener("click", () => {
      void openCatalogSelectionDocument(entry).catch((error) => {
        ui.notifications.error(
          error instanceof Error ? error.message : "Lecture impossible.",
        );
      });
    });
    actions.append(selectButton, readButton);
    row.append(input, image, text, actions);
    list.append(row);
  }
  browser.append(list);
  root.append(browser);
  const filter = () => {
    const query = normalizeCatalogSearch(search.value.trim());
    let visible = 0;
    for (const row of list.querySelectorAll<HTMLElement>("article")) {
      const match = !query || (row.dataset.search ?? "").includes(query);
      row.hidden = !match;
      if (match) visible += 1;
    }
    status.textContent = `${visible} résultat${visible > 1 ? "s" : ""}.`;
  };
  search.addEventListener("input", filter);
  filter();
  const result = (await foundry.applications.api.DialogV2.input({
    window: { title: options.title },
    content: root,
    ok: { label: "Valider la sélection" },
    modal: true,
    rejectClose: false,
  })) as Record<string, any> | null;
  if (!result || result.selection === undefined || result.selection === "")
    return null;
  const selection = entries[Number(result.selection)] ?? null;
  if (!selection || !["advantage", "drawback"].includes(selection.type))
    return selection;
  const values = [
    ...new Set(
      (String(selection.catalog.value ?? "").match(/[+-]\d+/gu) ?? [])
        .map(Number)
        .filter(Number.isFinite),
    ),
  ];
  if (values.length === 0) return selection;
  if (values.length === 1) {
    selection.catalog.selectedValue = values[0];
    return selection;
  }
  const valueRoot = document.createElement("div");
  const valueField = document.createElement("label");
  valueField.className = "relis-inventory-dialog-field";
  valueField.textContent = `Valeur de ${selection.name}`;
  const valueSelect = document.createElement("select");
  valueSelect.name = "selectedValue";
  for (const value of values) {
    const option = document.createElement("option");
    option.value = String(value);
    option.textContent = value > 0 ? `+${value}` : String(value);
    valueSelect.append(option);
  }
  valueField.append(valueSelect);
  valueRoot.append(valueField);
  const valueResult = (await foundry.applications.api.DialogV2.input({
    window: { title: `Préciser ${selection.name}` },
    content: valueRoot,
    ok: { label: "Valider la valeur" },
    modal: true,
    rejectClose: false,
  })) as Record<string, any> | null;
  if (!valueResult) return null;
  const selectedValue = Number(valueResult.selectedValue);
  if (!values.includes(selectedValue)) return null;
  selection.catalog.selectedValue = selectedValue;
  return selection;
}

async function embeddedSource(
  selection: CatalogSelection,
): Promise<Record<string, any>> {
  const source = await fromUuid(selection.uuid);
  if (!source || source.documentName !== "Item")
    throw new Error(`Source de catalogue introuvable : ${selection.name}.`);
  const data = source.toObject(true);
  delete data._id;
  data.system ??= {};
  data.system.catalog ??= {};
  for (const key of [
    "selectedValue",
    "creationAutomatic",
    "selectedChoices",
    "selectionDetails",
  ])
    if (selection.catalog[key] !== undefined)
      data.system.catalog[key] = selection.catalog[key];
  return data;
}

export async function assignBuildSelection(
  actor: Actor,
  slotKey: BuildSlotKey,
  selection: CatalogSelection,
): Promise<void> {
  if (!actor.isOwner && !game.user?.isGM)
    throw new Error("Vous ne pouvez pas modifier cette construction.");
  const definition = BUILD_SLOT_DEFINITIONS[slotKey];
  if (selection.type !== definition.itemType)
    throw new Error(
      `Le catalogue ne fournit pas un Item ${definition.itemType}.`,
    );
  const current = getPath(actor, definition.path);
  const currentReferences = definition.multiple
    ? Array.from(current ?? []).map((entry: any) => entry?.ref ?? entry)
    : current
      ? [current]
      : [];
  if (
    definition.multiple &&
    currentReferences.some(
      (reference) => reference.relisId === selection.relisId,
    )
  )
    throw new Error(`${selection.name} est déjà sélectionné.`);
  if (
    slotKey === "primarySpecialization" &&
    Array.from(actor.system.build?.secondarySpecializations ?? []).some(
      (entry: any) => (entry?.ref ?? entry)?.relisId === selection.relisId,
    )
  )
    throw new Error(
      "Une Spécialisation secondaire ne peut pas devenir simultanément la Spécialisation Principale.",
    );
  if (
    slotKey === "secondarySpecializations" &&
    actor.system.build?.primarySpecializationRef?.relisId === selection.relisId
  )
    throw new Error(
      "La Spécialisation Principale ne peut pas occuper aussi un emplacement secondaire.",
    );
  const reusable = (Array.from(actor.items ?? []) as Item[]).find(
    (item) =>
      !["advantage", "drawback"].includes(selection.type) &&
      item.type === definition.itemType &&
      sourceRelisId(item) === selection.relisId &&
      !currentReferences.some((reference) => referenceMatches(item, reference)),
  );
  const createdNew = !reusable;
  const [created] = reusable
    ? [reusable]
    : await actor.createEmbeddedDocuments(
        "Item",
        [await embeddedSource(selection)],
        { sourceUuid: selection.uuid },
      );
  if (!created) throw new Error("Foundry n’a pas créé l’Item sélectionné.");
  const reference = referenceFromSelection(selection, created);
  if (definition.multiple) {
    const value =
      slotKey === "secondarySpecializations"
        ? [
            ...Array.from(current ?? []),
            {
              ref: reference,
              rank: "1",
              sourceRef: JSON.parse(
                JSON.stringify(actor.system.build?.pathRef ?? {}),
              ),
            },
          ]
        : [...Array.from(current ?? []), reference];
    try {
      await actor.update({ [definition.path]: value });
    } catch (error) {
      if (createdNew) await actor.deleteEmbeddedDocuments("Item", [created.id]);
      throw error;
    }
    return;
  }
  try {
    await actor.update({ [definition.path]: reference });
  } catch (error) {
    if (createdNew) await actor.deleteEmbeddedDocuments("Item", [created.id]);
    throw error;
  }
}

export async function removeBuildItem(
  actor: Actor,
  slotKey: BuildSlotKey,
  itemId: string,
): Promise<void> {
  if (!actor.isOwner && !game.user?.isGM)
    throw new Error("Vous ne pouvez pas modifier cette construction.");
  const definition = BUILD_SLOT_DEFINITIONS[slotKey];
  const item = actor.items.get(itemId) as Item | undefined;
  if (!item || item.type !== definition.itemType)
    throw new Error("Item de construction introuvable.");
  const current = getPath(actor, definition.path);
  let update: unknown;
  if (definition.multiple) {
    update = Array.from(current ?? []).filter((entry: any) => {
      const reference = entry?.ref ?? entry;
      return !referenceMatches(item, reference);
    });
  } else {
    update = referenceMatches(item, current)
      ? {
          relisId: "",
          uuid: "",
          documentName: "",
          type: "",
          state: "unresolved",
          labelSnapshot: "",
          missingPolicy: "diagnose",
        }
      : current;
  }
  await actor.update({ [definition.path]: update });
  await actor.deleteEmbeddedDocuments("Item", [item.id]);
}

async function selectedItemSources(
  draft: CharacterCreationDraft,
): Promise<Record<string, any>[]> {
  const unique = new Map<string, CatalogSelection>();
  for (const selection of draftSelections(draft))
    unique.set(selection.relisId, selection);
  const result: Record<string, any>[] = [];
  for (const selection of unique.values()) {
    const enriched = JSON.parse(JSON.stringify(selection)) as CatalogSelection;
    const selectedChoices = draft.profile.selectionChoices[selection.relisId];
    const selectionDetails = draft.profile.selectionDetails[selection.relisId];
    if (selectedChoices?.length)
      enriched.catalog.selectedChoices = selectedChoices;
    if (selectionDetails?.trim())
      enriched.catalog.selectionDetails = selectionDetails.trim();
    result.push(await embeddedSource(enriched));
  }
  if (!draft.resources.creditsPending) {
    const credits = initialPhysicalCredits(draft);
    if (credits > 0) {
      const [selection] = await loadCatalogSelections(
        "relis.material-resources",
        (entry) => entry.relisId === "MAT-RES-CREDIT",
      );
      if (!selection)
        throw new Error("La source canonique du crédit physique est absente.");
      const source = await embeddedSource(selection);
      source.system.physical.quantity = credits;
      result.push(source);
    }
  }
  return result;
}

async function synchronizeEmbeddedBuildReferences(
  actor: Actor,
  draft: CharacterCreationDraft,
  createdItems: Item[],
): Promise<void> {
  const byRelisId = new Map(
    createdItems
      .map((item) => [sourceRelisId(item), item] as const)
      .filter(([relisId]) => Boolean(relisId)),
  );
  const ref = (selection: CatalogSelection) => {
    const embedded = byRelisId.get(selection.relisId);
    if (!embedded)
      throw new Error(`L’Item embarqué ${selection.name} est introuvable.`);
    return referenceFromSelection(selection, embedded);
  };
  const emptyReference = {
    relisId: "",
    uuid: "",
    documentName: "",
    type: "",
    state: "unresolved",
    labelSnapshot: "",
    missingPolicy: "diagnose",
  };
  const optionalRef = (selection: CatalogSelection | null) =>
    selection ? ref(selection) : emptyReference;
  const pathReference = optionalRef(draft.path.path);
  await actor.update({
    "system.build.ancestryRef": optionalRef(draft.body.ancestry),
    "system.build.profileRef": optionalRef(draft.profile.profile),
    "system.build.originRef": optionalRef(draft.profile.origin),
    "system.build.pathRef": pathReference,
    "system.build.primarySpecializationRef": optionalRef(
      draft.path.primarySpecialization,
    ),
    "system.build.secondarySpecializations":
      draft.path.secondarySpecializations.map((selection) => ({
        ref: ref(selection),
        rank: "1",
        sourceRef: pathReference,
      })),
    "system.build.advantageRefs": draft.profile.advantages.map(ref),
    "system.build.drawbackRefs": draft.profile.drawbacks.map(ref),
    "system.post.primaryRef": optionalRef(draft.assignments.primaryPost),
    "system.post.secondaryRefs": draft.assignments.secondaryPosts.map(ref),
  });
}

const characterFinalizations = new Map<string, Promise<Actor>>();

async function performCharacterFinalization(
  draft: CharacterCreationDraft,
): Promise<Actor> {
  const existing = Array.from(game.actors ?? []).find(
    (actor: any) => actor.flags?.relis?.characterCreation?.draftId === draft.id,
  );
  if (existing) return existing as Actor;
  const derived = deriveCharacterCreation(draft);
  const errors = derived.diagnostics.filter((entry) => entry.level === "error");
  if (errors.length)
    throw new Error(
      `Création bloquée : ${errors.map((entry) => entry.message).join(" ")}`,
    );
  let actor: Actor | null = null;
  try {
    actor = await Actor.implementation.create(characterActorSource(draft));
    if (!actor) throw new Error("Foundry n’a pas créé l’Actor demandé.");
    const items = await selectedItemSources(draft);
    const createdItems = items.length
      ? ((await actor.createEmbeddedDocuments("Item", items)) as Item[])
      : [];
    await synchronizeEmbeddedBuildReferences(actor, draft, createdItems);
    return actor;
  } catch (error) {
    if (actor) await actor.delete();
    throw error;
  }
}

export async function finalizeCharacterDraft(
  draft: CharacterCreationDraft,
): Promise<Actor> {
  const running = characterFinalizations.get(draft.id);
  if (running) return running;
  const operation = performCharacterFinalization(draft);
  characterFinalizations.set(draft.id, operation);
  try {
    return await operation;
  } finally {
    characterFinalizations.delete(draft.id);
  }
}
