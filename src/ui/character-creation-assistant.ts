import {
  ATTRIBUTE_LABELS,
  SKILL_DEFINITIONS,
  SYSTEM_ID,
  type AttributeKey,
  type SkillKey,
} from "../config";
import {
  CHARACTER_CREATION_STEPS,
  createCharacterDraft,
  creationStepState,
  deriveCharacterCreation,
  initialPhysicalCredits,
  normalizeCharacterDraft,
  secondarySpecializationCount,
  type CatalogSelection,
  type CharacterCreationDraft,
  type CharacterCreationStepId,
} from "../rules/character-creation";
import {
  finalizeCharacterDraft,
  loadCatalogSelections,
  openCatalogPicker,
} from "../services/character-build";

const ApplicationV2 = foundry.applications.api.ApplicationV2;
const HandlebarsApplicationMixin =
  foundry.applications.api.HandlebarsApplicationMixin;
const DRAFT_FLAG = "characterCreationDrafts";

type DraftCollection = Record<string, CharacterCreationDraft>;

function draftId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `draft-${Date.now()}`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function setDraftValue(
  draft: CharacterCreationDraft,
  path: string,
  value: unknown,
): void {
  const parts = path.split(".");
  let current: any = draft;
  for (const key of parts.slice(0, -1)) current = current[key];
  current[parts.at(-1) as string] = value;
  draft.revision += 1;
  draft.updatedAt = Date.now();
}

function plainText(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  return (container.textContent ?? "").trim();
}

function selectedSummary(selection: CatalogSelection | null): string {
  return selection?.name ?? "Non sélectionné";
}

function allowedAttributeChoices(
  draft: CharacterCreationDraft,
  source: "ancestry" | "profile" | "path",
): AttributeKey[] {
  const labels: string[] = [];
  if (source === "ancestry") {
    const catalog = draft.body.ancestry?.catalog ?? {};
    labels.push(...(catalog.inheritedAttributeChoices ?? []));
    const freeCount = String(catalog.attributeBonuses ?? "")
      .split(",")
      .filter((part) => /\+1\s+libre/iu.test(part)).length;
    if (freeCount > 0) labels.push(...Object.values(ATTRIBUTE_LABELS));
  }
  if (source === "profile")
    labels.push(...(draft.profile.profile?.catalog.standardAttributes ?? []));
  if (source === "path")
    labels.push(...(draft.path.path?.catalog.keyAttributes ?? []));
  const normalized = new Map(
    Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => [
      label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .toLocaleLowerCase("fr"),
      key as AttributeKey,
    ]),
  );
  return [
    ...new Set(
      labels
        .map((label) =>
          normalized.get(
            String(label)
              .replace(/^[+-]\d*\s*/u, "")
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/gu, "")
              .toLocaleLowerCase("fr"),
          ),
        )
        .filter((key): key is AttributeKey => Boolean(key)),
    ),
  ];
}

function markedPenaltyChoices(draft: CharacterCreationDraft): AttributeKey[] {
  const marked = String(draft.profile.profile?.catalog.markedProfile ?? "");
  const penaltyPart = marked.split(";")[1] ?? "";
  const lookup = new Map(
    Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => [
      label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/gu, "")
        .toLocaleLowerCase("fr"),
      key as AttributeKey,
    ]),
  );
  return penaltyPart
    .split(/,|\bou\b/iu)
    .map((value) =>
      lookup.get(
        value
          .replace(/[-+\d]/gu, "")
          .trim()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/gu, "")
          .toLocaleLowerCase("fr"),
      ),
    )
    .filter((key): key is AttributeKey => Boolean(key));
}

function energyProfiles(draft: CharacterCreationDraft): any[] {
  return Array.isArray(draft.body.ancestry?.catalog.energyProfiles)
    ? draft.body.ancestry?.catalog.energyProfiles
    : [];
}

function stepIndex(step: CharacterCreationStepId): number {
  return CHARACTER_CREATION_STEPS.findIndex((entry) => entry.id === step);
}

async function readDrafts(): Promise<DraftCollection> {
  return clone(
    (game.user?.getFlag(SYSTEM_ID, DRAFT_FLAG) as DraftCollection) ?? {},
  );
}

async function writeDrafts(drafts: DraftCollection): Promise<void> {
  if (!game.settings.get(SYSTEM_ID, "assistants.persistDrafts")) return;
  await game.user?.setFlag(SYSTEM_ID, DRAFT_FLAG, drafts);
}

export class RelisCharacterCreationAssistant extends HandlebarsApplicationMixin(
  ApplicationV2,
) {
  static DEFAULT_OPTIONS = {
    id: "relis-character-creation",
    classes: ["relis", "relis-character-creation"],
    position: { width: 1080, height: 760 },
    window: {
      title: "RE:LIS — Assistant de création",
      resizable: true,
    },
  };

  static PARTS = {
    main: {
      template: "systems/relis/templates/apps/character-creation.hbs",
    },
  };

  private draft: CharacterCreationDraft;

  constructor(
    draft: CharacterCreationDraft,
    options: Record<string, any> = {},
  ) {
    super(options);
    this.draft = draft;
  }

  async _prepareContext(options: any): Promise<Record<string, any>> {
    const context = await super._prepareContext(options);
    const derived = deriveCharacterCreation(this.draft);
    const current = this.draft.currentStep;
    const index = stepIndex(current);
    const profileAttributes = allowedAttributeChoices(this.draft, "profile");
    const ancestryAttributes = allowedAttributeChoices(this.draft, "ancestry");
    const pathAttributes = allowedAttributeChoices(this.draft, "path");
    const requiredPathSkills = new Set(
      (this.draft.path.path?.catalog.requiredSkills ?? []).map(String),
    );
    const selectedSkills = new Set(this.draft.skills.qualified);
    const favoriteSkills = new Set(this.draft.skills.favorites);
    const skillRows = Object.entries(SKILL_DEFINITIONS).map(
      ([key, [label]]) => ({
        key,
        label,
        selected: selectedSkills.has(key as SkillKey),
        favorite: favoriteSkills.has(key as SkillKey),
        required: requiredPathSkills.has(label),
      }),
    );
    const currentDiagnostics = derived.diagnostics.filter(
      (entry) => entry.step === current,
    );
    return {
      ...context,
      draft: this.draft,
      currentStep: current,
      currentStepLabel:
        CHARACTER_CREATION_STEPS.find((step) => step.id === current)?.label ??
        current,
      [`step_${current}`]: true,
      steps: CHARACTER_CREATION_STEPS.map((step, stepNumber) => ({
        ...step,
        number: stepNumber + 1,
        active: step.id === current,
        ariaCurrent: step.id === current ? "step" : "false",
        state: creationStepState(this.draft, step.id),
        stateLabel: {
          "not-started": "Non commencée",
          "in-progress": "En cours",
          complete: "Complète",
          warning: "Avec avertissement",
          blocked: "Bloquée",
        }[creationStepState(this.draft, step.id)],
      })),
      owners: Array.from(game.users ?? [])
        .filter(
          (user: any) =>
            (game.user?.isGM || user.id === game.user?.id) &&
            (user.active || user.id === this.draft.frame.ownerId),
        )
        .map((user: any) => ({ id: user.id, name: user.name })),
      natureOptions: [
        { key: "biological", label: "Biologique" },
        { key: "synthetic", label: "Synthétique" },
        { key: "hybrid", label: "Hybride" },
        { key: "energetic", label: "Énergétique" },
        { key: "atypical", label: "Atypique" },
      ],
      sizeOptions: [
        { key: "small", label: "Petit" },
        { key: "medium", label: "Moyen" },
        { key: "large", label: "Grand" },
      ],
      secondarySchemeOptions: [
        { key: "duo", label: "Duo spécialisé · 2" },
        { key: "trio", label: "Trio équilibré · 3" },
        { key: "quartet", label: "Quatuor polyvalent · 4" },
      ],
      profileModeStandard: this.draft.profile.profileMode === "standard",
      profileModeMarked: this.draft.profile.profileMode === "marked",
      previousDisabled: index <= 0,
      nextDisabled: index >= CHARACTER_CREATION_STEPS.length - 1,
      isReview: current === "review",
      currentDiagnostics,
      diagnostics: derived.diagnostics,
      blockingDiagnostics: derived.diagnostics.filter(
        (entry) => entry.level === "error",
      ),
      canFinalize: !derived.diagnostics.some(
        (entry) => entry.level === "error",
      ),
      attributes: Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
        key,
        label,
        value: derived.attributes[key as AttributeKey],
        ancestryAllowed: ancestryAttributes.includes(key as AttributeKey),
        ancestrySelected: this.draft.body.ancestryAttributeChoices.includes(
          key as AttributeKey,
        ),
        profileAllowed: profileAttributes.includes(key as AttributeKey),
        profileSelected: this.draft.profile.profileAttributeChoices.includes(
          key as AttributeKey,
        ),
        pathAllowed: pathAttributes.includes(key as AttributeKey),
        pathSelected: this.draft.attributes.pathAttribute === key,
        freeSelected: this.draft.attributes.freeIncreases.includes(
          key as AttributeKey,
        ),
      })),
      advantageAttributeRows: this.draft.profile.advantages
        .map((advantage) => ({
          relisId: advantage.relisId,
          name: advantage.name,
          expected: Math.max(
            0,
            Math.trunc(
              Number(
                advantage.catalog.creationEffects?.freeAttributeIncreases,
              ) || 0,
            ),
          ),
          choices: Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
            key,
            label,
            dataPath: `profile.advantageAttributeChoices.${advantage.relisId}`,
            inputType:
              Math.max(
                0,
                Math.trunc(
                  Number(
                    advantage.catalog.creationEffects?.freeAttributeIncreases,
                  ) || 0,
                ),
              ) === 1
                ? "radio"
                : "checkbox",
            radioName: `advantage-attribute-${advantage.relisId}`,
            selected: (
              this.draft.profile.advantageAttributeChoices[advantage.relisId] ??
              []
            ).includes(key as AttributeKey),
          })),
        }))
        .filter((entry) => entry.expected > 0),
      markedPenalties: markedPenaltyChoices(this.draft).map((key) => ({
        key,
        label: ATTRIBUTE_LABELS[key],
      })),
      markedBonuses: String(
        this.draft.profile.profile?.catalog.markedProfile ?? "",
      ).split(";")[0],
      skillRows,
      energyProfiles: energyProfiles(this.draft).map((profile) => ({
        ...profile,
        summary: `Mana ${profile.mana ?? 0} · Prana ${profile.prana ?? 0} · Flux ${profile.flux ?? 0}`,
        ancestrySelected:
          this.draft.body.ancestryProfileId === String(profile.id),
        energySelected:
          this.draft.resources.energyProfileId === String(profile.id),
      })),
      secondaryExpected: secondarySpecializationCount(
        this.draft.path.secondaryScheme,
      ),
      hitPoints: derived.hitPoints ?? "—",
      initialCredits: initialPhysicalCredits(this.draft).toLocaleString(
        "fr-FR",
      ),
      hitPointSources: derived.hitPointSources,
      requiredQualifiedSkills: derived.requiredQualifiedSkills ?? "—",
      selectedQualifiedSkills: derived.qualifiedSkillCount,
      selectionSummary: {
        ancestry: selectedSummary(this.draft.body.ancestry),
        profile: selectedSummary(this.draft.profile.profile),
        origin: selectedSummary(this.draft.profile.origin),
        path: selectedSummary(this.draft.path.path),
        primarySpecialization: selectedSummary(
          this.draft.path.primarySpecialization,
        ),
        post: selectedSummary(this.draft.assignments.primaryPost),
      },
    };
  }

  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    const root = this.element as HTMLElement;
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-step-id]",
    ))
      button.addEventListener("click", () => {
        this.draft.currentStep = button.dataset
          .stepId as CharacterCreationStepId;
        void this.saveAndRender();
      });
    for (const field of root.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("[data-draft-path]"))
      field.addEventListener("change", () => {
        const path = field.dataset.draftPath;
        if (!path) return;
        const value =
          field instanceof HTMLInputElement && field.type === "checkbox"
            ? field.checked
            : field instanceof HTMLInputElement && field.type === "number"
              ? Number(field.value)
              : field.value;
        setDraftValue(this.draft, path, value);
        if (path === "body.ancestryProfileId")
          setDraftValue(this.draft, "resources.energyProfileId", value);
        if (path === "resources.energyProfileId")
          setDraftValue(this.draft, "body.ancestryProfileId", value);
        void this.saveAndRender();
      });
    for (const input of root.querySelectorAll<HTMLInputElement>(
      "[data-draft-array]",
    ))
      input.addEventListener("change", () => {
        const path = input.dataset.draftArray;
        if (!path) return;
        const values = Array.from(
          root.querySelectorAll<HTMLInputElement>(
            `[data-draft-array="${path}"]:checked`,
          ),
        ).map((entry) => entry.value);
        setDraftValue(this.draft, path, values);
        void this.saveAndRender();
      });
    for (const button of root.querySelectorAll<HTMLButtonElement>(
      "[data-assistant-action]",
    ))
      button.addEventListener("click", () => {
        void this.handleAction(button.dataset.assistantAction ?? "", button);
      });
  }

  private async handleAction(
    action: string,
    button: HTMLButtonElement,
  ): Promise<void> {
    try {
      if (action === "previous" || action === "next") {
        const current = stepIndex(this.draft.currentStep);
        const target = action === "previous" ? current - 1 : current + 1;
        const step = CHARACTER_CREATION_STEPS[target];
        if (step) this.draft.currentStep = step.id;
        await this.saveAndRender();
        return;
      }
      if (action === "save-close") {
        await this.save();
        await this.close();
        return;
      }
      if (action === "finalize") {
        button.disabled = true;
        const actor = await finalizeCharacterDraft(this.draft);
        this.draft.completedActorUuid = actor.uuid;
        await this.save();
        ui.notifications.info(`Personnage créé : ${actor.name}.`);
        await actor.sheet?.render(true);
        await this.close();
        return;
      }
      if (action === "open-ancestry-journal") {
        const relisId = this.draft.body.ancestry?.relisId;
        const pack = game.packs?.get("relis.creation-ancestry-journals");
        if (!relisId || !pack)
          throw new Error("Journal encyclopédique d’Ascendance introuvable.");
        const journals = await pack.getDocuments();
        const journal = journals.find(
          (entry: any) => entry.flags?.relis?.ancestryRelisId === relisId,
        );
        if (!journal)
          throw new Error("Entrée encyclopédique d’Ascendance introuvable.");
        await journal.sheet?.render(true);
        return;
      }
      if (action === "clear-selection") {
        const path = button.dataset.selectionPath;
        if (path) {
          setDraftValue(
            this.draft,
            path,
            button.dataset.multiple === "true" ? [] : null,
          );
          if (path === "body.ancestry") {
            this.draft.body.ancestryAttributeChoices = [];
            this.draft.body.ancestryProfileId = "";
            this.draft.resources.energyProfileId = "";
            this.draft.talents.ancestryTalent = null;
            this.draft.profile.drawbacks = this.draft.profile.drawbacks.filter(
              (entry) => entry.catalog.creationAutomatic !== true,
            );
          }
          if (path === "profile.profile") {
            this.draft.profile.profileAttributeChoices = [];
            this.draft.profile.profilePenalty = "";
            this.draft.talents.profileTalent = null;
          }
          if (path === "path.path") {
            this.draft.attributes.pathAttribute = "";
            this.draft.path.primarySpecialization = null;
            this.draft.path.secondarySpecializations = [];
            this.draft.talents.primaryTalent = null;
            this.draft.talents.secondaryTalents = [];
          }
          if (path === "path.primarySpecialization")
            this.draft.talents.primaryTalent = null;
        }
        await this.saveAndRender();
        return;
      }
      if (action === "remove-selection") {
        const path = button.dataset.selectionPath;
        const relisId = button.dataset.relisId;
        if (path && relisId) {
          const values = path
            .split(".")
            .reduce((value: any, key) => value[key], this.draft);
          setDraftValue(
            this.draft,
            path,
            Array.from(values ?? []).filter(
              (entry: any) => entry.relisId !== relisId,
            ),
          );
          if (path === "profile.advantages")
            delete this.draft.profile.advantageAttributeChoices[relisId];
          if (path === "path.secondarySpecializations")
            this.draft.talents.secondaryTalents =
              this.draft.talents.secondaryTalents.filter(
                (talent) =>
                  talent.catalog.specializationRef?.relisId !== relisId,
              );
        }
        await this.saveAndRender();
        return;
      }
      if (action === "pick") await this.pick(button.dataset.picker ?? "");
    } catch (error) {
      console.error("RE:LIS | Assistant de création", error);
      ui.notifications.error(
        error instanceof Error
          ? error.message
          : "Opération de création refusée.",
      );
      button.disabled = false;
    }
  }

  private async pick(kind: string): Promise<void> {
    const ancestry = this.draft.body.ancestry;
    const profile = this.draft.profile.profile;
    const path = this.draft.path.path;
    const primary = this.draft.path.primarySpecialization;
    const mapping: Record<
      string,
      {
        title: string;
        packId: string;
        path: string;
        multiple?: boolean;
        predicate?: (entry: CatalogSelection) => boolean;
      }
    > = {
      ancestry: {
        title: "Choisir une Ascendance",
        packId: "relis.creation-ancestries",
        path: "body.ancestry",
      },
      profile: {
        title: "Choisir un Profil",
        packId: "relis.creation-profiles",
        path: "profile.profile",
      },
      origin: {
        title: "Choisir une Origine",
        packId: "relis.creation-origins",
        path: "profile.origin",
      },
      advantage: {
        title: "Ajouter un Atout",
        packId: "relis.creation-advantages",
        path: "profile.advantages",
        multiple: true,
      },
      drawback: {
        title: "Ajouter un Handicap",
        packId: "relis.creation-drawbacks",
        path: "profile.drawbacks",
        multiple: true,
        predicate: (entry) => entry.catalog.automaticOnly !== true,
      },
      path: {
        title: "Choisir une Voie",
        packId: "relis.progression-paths",
        path: "path.path",
      },
      primarySpecialization: {
        title: "Choisir la Spécialisation Principale",
        packId: "relis.progression-specializations",
        path: "path.primarySpecialization",
        predicate: (entry) =>
          Boolean(path && entry.catalog.pathName === path.name),
      },
      secondarySpecialization: {
        title: "Ajouter une Spécialisation secondaire",
        packId: "relis.progression-specializations",
        path: "path.secondarySpecializations",
        multiple: true,
        predicate: (entry) => entry.relisId !== primary?.relisId,
      },
      ancestryTalent: {
        title: "Choisir le Talent d’Ascendance de niveau 1",
        packId: "relis.progression-ancestry-talents",
        path: "talents.ancestryTalent",
        predicate: (entry) => {
          const allowed = new Set([
            ancestry?.name,
            ...(ancestry?.catalog.talentCatalogs ?? []),
            "Universel",
          ]);
          return (
            entry.level === 1 && allowed.has(String(entry.catalog.ancestry))
          );
        },
      },
      profileTalent: {
        title: "Choisir le Talent de compétence du Profil",
        packId: "relis.progression-skill-talents",
        path: "talents.profileTalent",
        predicate: (entry) =>
          entry.level === 1 &&
          Boolean(
            profile &&
            (profile.catalog.skillChoices ?? []).includes(entry.catalog.skill),
          ),
      },
      primaryTalent: {
        title: "Choisir le Talent de Spécialisation Principale",
        packId: "relis.progression-specialization-talents",
        path: "talents.primaryTalent",
        predicate: (entry) =>
          entry.level === 1 &&
          entry.catalog.specializationRef?.relisId === primary?.relisId,
      },
      secondaryTalent: {
        title: "Ajouter un Talent de Spécialisation secondaire",
        packId: "relis.progression-specialization-talents",
        path: "talents.secondaryTalents",
        multiple: true,
        predicate: (entry) => {
          const specializationId = String(
            entry.catalog.specializationRef?.relisId ?? "",
          );
          const allowed = this.draft.path.secondarySpecializations.some(
            (specialization) => specialization.relisId === specializationId,
          );
          const alreadyFilled = this.draft.talents.secondaryTalents.some(
            (talent) =>
              talent.catalog.specializationRef?.relisId === specializationId,
          );
          return entry.level === 1 && allowed && !alreadyFilled;
        },
      },
      post: {
        title: "Choisir le Poste principal",
        packId: "relis.creation-posts",
        path: "assignments.primaryPost",
      },
      secondaryPost: {
        title: "Ajouter un Poste secondaire",
        packId: "relis.creation-posts",
        path: "assignments.secondaryPosts",
        multiple: true,
      },
    };
    const configuration = mapping[kind];
    if (!configuration) return;
    const current = configuration.path
      .split(".")
      .reduce((value: any, key) => value[key], this.draft);
    const selected = configuration.multiple
      ? Array.from(current ?? []).map((entry: any) => entry.relisId)
      : current?.relisId
        ? [current.relisId]
        : [];
    const choice = await openCatalogPicker({
      title: configuration.title,
      packId: configuration.packId,
      selectedRelisIds: selected,
      ...(configuration.predicate
        ? { predicate: configuration.predicate }
        : {}),
    });
    if (!choice) return;
    setDraftValue(
      this.draft,
      configuration.path,
      configuration.multiple ? [...Array.from(current ?? []), choice] : choice,
    );
    if (kind === "ancestry") {
      this.draft.body.ancestryAttributeChoices = [];
      this.draft.body.ancestryProfileId = "";
      this.draft.resources.energyProfileId = "";
      this.draft.talents.ancestryTalent = null;
      this.draft.profile.drawbacks = this.draft.profile.drawbacks.filter(
        (entry) => entry.catalog.creationAutomatic !== true,
      );
      for (const automatic of choice.catalog.automaticDrawbacks ?? []) {
        const [drawback] = await loadCatalogSelections(
          "relis.creation-drawbacks",
          (entry) => entry.relisId === automatic.relisId,
        );
        if (!drawback)
          throw new Error(
            `Le Handicap automatique ${String(automatic.label ?? automatic.relisId)} est introuvable.`,
          );
        drawback.catalog.selectedValue = Number(automatic.selectedValue);
        drawback.catalog.creationAutomatic = true;
        this.draft.profile.drawbacks.push(drawback);
      }
    }
    if (kind === "profile") {
      this.draft.profile.profileAttributeChoices = [];
      this.draft.profile.profilePenalty = "";
      this.draft.talents.profileTalent = null;
    }
    if (kind === "path") {
      this.draft.attributes.pathAttribute = "";
      this.draft.path.primarySpecialization = null;
      this.draft.path.secondarySpecializations = [];
      this.draft.talents.primaryTalent = null;
      this.draft.talents.secondaryTalents = [];
    }
    await this.saveAndRender();
  }

  private async save(): Promise<void> {
    const drafts = await readDrafts();
    drafts[this.draft.id] = clone(this.draft);
    await writeDrafts(drafts);
  }

  private async saveAndRender(): Promise<void> {
    await this.save();
    await this.render({ force: true });
  }
}

export async function openCharacterCreationAssistant(): Promise<void> {
  const drafts = await readDrafts();
  const latest = Object.values(drafts)
    .filter((entry) => !entry.completedActorUuid)
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  const id = latest?.id ?? draftId();
  const draft = normalizeCharacterDraft(
    latest ?? createCharacterDraft(id),
    id,
    game.user?.id ?? "",
  );
  drafts[id] = draft;
  await writeDrafts(drafts);
  new RelisCharacterCreationAssistant(draft).render(true);
}

export async function discardCharacterCreationDraft(
  draftIdValue: string,
): Promise<void> {
  const drafts = await readDrafts();
  delete drafts[draftIdValue];
  await writeDrafts(drafts);
}

export function characterCreationPreviewText(
  draft: CharacterCreationDraft,
): string {
  return plainText(
    [draft.body.ancestry?.description, draft.path.path?.description]
      .filter(Boolean)
      .join(" "),
  );
}
