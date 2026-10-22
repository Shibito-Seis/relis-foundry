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
  draftSelections,
  freeQualifiedSkillCount,
  initialPhysicalCredits,
  normalizeCharacterDraft,
  pathSkillKeys,
  profileSkillKeys,
  qualifiedSkillKeys,
  secondarySpecializationCount,
  type CatalogSelection,
  type CharacterCreationDraft,
  type CharacterCreationStepId,
} from "../rules/character-creation";
import {
  finalizeCharacterDraft,
  loadCatalogSelections,
  openCatalogPicker,
  openCatalogSelectionDocument,
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

const BODY_NATURE_LABELS: Record<string, string> = {
  biological: "Biologique",
  synthetic: "Synthétique",
  hybrid: "Hybride",
  energetic: "Énergétique",
  atypical: "Atypique",
};

function selectionView(
  draft: CharacterCreationDraft,
  selection: CatalogSelection,
): Record<string, any> {
  return {
    ...selection,
    description: selection.description ?? "",
    excerpt: plainText(selection.description ?? "").slice(0, 420),
    detailPath: `profile.selectionDetails.${selection.relisId}`,
    details: draft.profile.selectionDetails[selection.relisId] ?? "",
    creationChoices: Array.from(selection.catalog.creationChoices ?? []).map(
      (choice: any) => {
        const id = String(choice.id ?? "choice");
        const dataPath = `profile.selectionChoices.${selection.relisId}:${id}`;
        const selected =
          draft.profile.selectionChoices[`${selection.relisId}:${id}`] ?? [];
        const maximum = Math.max(
          Math.trunc(Number(choice.minimum) || 0),
          Math.trunc(Number(choice.maximum) || 0),
        );
        return {
          id,
          label: String(choice.label ?? "Précision"),
          dataPath,
          minimum: Math.max(0, Math.trunc(Number(choice.minimum) || 0)),
          maximum,
          options: Array.from(choice.options ?? []).map((value) => ({
            value: String(value),
            dataPath,
            maximum,
            selected: selected.includes(String(value)),
            disabled:
              !selected.includes(String(value)) && selected.length >= maximum,
          })),
        };
      },
    ),
  };
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
    const ancestryChoiceExpected =
      Math.max(
        0,
        Math.trunc(
          Number(
            this.draft.body.ancestry?.catalog.inheritedAttributeChoiceCount,
          ) || 0,
        ),
      ) +
      (String(this.draft.body.ancestry?.catalog.attributeBonuses ?? "").match(
        /\+1\s+libre/giu,
      )?.length ?? 0);
    const pathSkills = pathSkillKeys(this.draft);
    const profileSkills = profileSkillKeys(this.draft);
    const profileSelected = new Set(this.draft.skills.profileChoices);
    const pathSelected = new Set(this.draft.skills.pathChoices);
    const freeSelected = new Set(this.draft.skills.freeChoices);
    const qualifiedSkills = qualifiedSkillKeys(this.draft);
    const favoriteSkills = new Set(this.draft.skills.favorites);
    const skillLabel = (key: SkillKey) => SKILL_DEFINITIONS[key]?.[0] ?? key;
    const profileSkillRows = profileSkills.map((key) => ({
      key,
      label: skillLabel(key),
      selected: profileSelected.has(key),
      disabled: !profileSelected.has(key) && profileSelected.size >= 2,
    }));
    const newlyGrantedRequired = pathSkills.required.filter(
      (key) => !profileSelected.has(key),
    );
    const expectedPathChoices = Math.max(
      0,
      pathSkills.total - newlyGrantedRequired.length,
    );
    const pathSkillRows = pathSkills.choices
      .filter(
        (key) =>
          !profileSelected.has(key) && !pathSkills.required.includes(key),
      )
      .map((key) => ({
        key,
        label: skillLabel(key),
        selected: pathSelected.has(key),
        disabled:
          !pathSelected.has(key) && pathSelected.size >= expectedPathChoices,
        maximum: expectedPathChoices,
      }));
    const freeExpected = freeQualifiedSkillCount(
      this.draft,
      derived.attributes.intelligence,
    );
    const grantedBeforeFree = new Set([
      ...profileSelected,
      ...pathSkills.required,
      ...pathSelected,
    ]);
    const freeSkillRows = Object.entries(SKILL_DEFINITIONS)
      .filter(([key]) => !grantedBeforeFree.has(key as SkillKey))
      .map(([key, [label]]) => ({
        key,
        label,
        selected: freeSelected.has(key as SkillKey),
        disabled:
          !freeSelected.has(key as SkillKey) &&
          freeSelected.size >= freeExpected,
        maximum: freeExpected,
      }));
    const sourceBySkill = new Map<SkillKey, string>();
    for (const key of this.draft.skills.profileChoices)
      sourceBySkill.set(key, "Profil");
    for (const key of pathSkills.required)
      sourceBySkill.set(
        key,
        sourceBySkill.has(key)
          ? "Profil + Voie obligatoire"
          : "Voie obligatoire",
      );
    for (const key of this.draft.skills.pathChoices)
      sourceBySkill.set(key, "Choix de Voie");
    for (const key of this.draft.skills.freeChoices)
      sourceBySkill.set(key, "Choix libre");
    const qualifiedSkillRows = qualifiedSkills.map((key) => ({
      key,
      label: skillLabel(key),
      source: sourceBySkill.get(key) ?? "Création",
      favorite: favoriteSkills.has(key),
    }));
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
        stateIcon: {
          "not-started": "fa-regular fa-circle",
          "in-progress": "fa-solid fa-wrench",
          complete: "fa-solid fa-circle-check",
          warning: "fa-solid fa-triangle-exclamation",
          blocked: "fa-solid fa-ban",
        }[creationStepState(this.draft, step.id)],
      })),
      owners: Array.from(game.users ?? [])
        .filter(
          (user: any) =>
            (game.user?.isGM || user.id === game.user?.id) &&
            (user.active || user.id === this.draft.frame.ownerId),
        )
        .map((user: any) => ({ id: user.id, name: user.name })),
      bodyNatureLabel:
        BODY_NATURE_LABELS[this.draft.body.nature] ?? this.draft.body.nature,
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
        ancestryDisabled:
          !this.draft.body.ancestryAttributeChoices.includes(
            key as AttributeKey,
          ) &&
          this.draft.body.ancestryAttributeChoices.length >=
            ancestryChoiceExpected,
        ancestryMaximum: ancestryChoiceExpected,
        profileAllowed: profileAttributes.includes(key as AttributeKey),
        profileSelected: this.draft.profile.profileAttributeChoices.includes(
          key as AttributeKey,
        ),
        pathAllowed: pathAttributes.includes(key as AttributeKey),
        pathSelected: this.draft.attributes.pathAttribute === key,
        freeSelected: this.draft.attributes.freeIncreases.includes(
          key as AttributeKey,
        ),
        freeDisabled:
          !this.draft.attributes.freeIncreases.includes(key as AttributeKey) &&
          this.draft.attributes.freeIncreases.length >= 4,
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
            maxSelections: Math.max(
              0,
              Math.trunc(
                Number(
                  advantage.catalog.creationEffects?.freeAttributeIncreases,
                ) || 0,
              ),
            ),
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
      profileSkillRows,
      pathRequiredSkillRows: pathSkills.required.map((key) => ({
        key,
        label: skillLabel(key),
        alreadyGranted: profileSelected.has(key),
      })),
      pathSkillRows,
      expectedPathChoices,
      freeSkillRows,
      freeExpected,
      qualifiedSkillRows,
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
      secondarySpecializationLimitReached:
        this.draft.path.secondarySpecializations.length >=
        secondarySpecializationCount(this.draft.path.secondaryScheme),
      secondaryPostLimitReached:
        this.draft.assignments.secondaryPosts.length >= 1,
      advantageLimitReached: this.draft.profile.advantages.length >= 3,
      ancestryChoiceExpected,
      attributeLimitReached: this.draft.attributes.freeIncreases.length >= 4,
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
      profileSelection: this.draft.profile.profile
        ? selectionView(this.draft, this.draft.profile.profile)
        : null,
      originSelection: this.draft.profile.origin
        ? selectionView(this.draft, this.draft.profile.origin)
        : null,
      advantageRows: this.draft.profile.advantages.map((entry) =>
        selectionView(this.draft, entry),
      ),
      drawbackRows: this.draft.profile.drawbacks.map((entry) =>
        selectionView(this.draft, entry),
      ),
      pathSelection: this.draft.path.path
        ? selectionView(this.draft, this.draft.path.path)
        : null,
      primarySpecializationSelection: this.draft.path.primarySpecialization
        ? selectionView(this.draft, this.draft.path.primarySpecialization)
        : null,
      secondarySpecializationRows: this.draft.path.secondarySpecializations.map(
        (entry) => selectionView(this.draft, entry),
      ),
      talentRows: [
        this.draft.talents.ancestryTalent,
        this.draft.talents.profileTalent,
        this.draft.talents.primaryTalent,
        ...this.draft.talents.secondaryTalents,
      ]
        .filter((entry): entry is CatalogSelection => Boolean(entry))
        .map((entry) => selectionView(this.draft, entry)),
      equipmentGuidance: [
        this.draft.profile.profile?.catalog.typicalBenefit
          ? `Profil : ${String(this.draft.profile.profile.catalog.typicalBenefit)}`
          : "",
        this.draft.path.path?.catalog.initialLoadout
          ? `Voie : ${String(this.draft.path.path.catalog.initialLoadout)}`
          : "",
        this.draft.path.primarySpecialization?.catalog.primaryLoadout
          ? `Spécialisation principale : ${String(this.draft.path.primarySpecialization.catalog.primaryLoadout)}`
          : "",
        ...this.draft.path.secondarySpecializations.map((entry) =>
          entry.catalog.primaryLoadout
            ? `${entry.name} : ${String(entry.catalog.primaryLoadout)}`
            : "",
        ),
      ].filter(Boolean),
      initialEquipmentRows: this.draft.resources.initialEquipment.map((entry) =>
        selectionView(this.draft, entry),
      ),
    };
  }

  async _onRender(context: any, options: any): Promise<void> {
    await super._onRender(context, options);
    const root = this.element as HTMLElement;
    for (const control of root.querySelectorAll<
      HTMLInputElement | HTMLButtonElement
    >('[data-selection-disabled="true"]'))
      control.disabled = true;
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
        let checked = Array.from(
          root.querySelectorAll<HTMLInputElement>(
            `[data-draft-array="${path}"]:checked`,
          ),
        );
        const maximum = Number(input.dataset.maxSelections);
        if (
          input.checked &&
          Number.isFinite(maximum) &&
          maximum >= 0 &&
          checked.length > maximum
        ) {
          input.checked = false;
          checked = checked.filter((entry) => entry !== input);
          ui.notifications.warn(
            `Ce choix est limité à ${maximum} sélection${maximum > 1 ? "s" : ""}.`,
          );
        }
        const values = checked.map((entry) => entry.value);
        setDraftValue(this.draft, path, values);
        if (path.startsWith("skills.") && path !== "skills.favorites") {
          const qualified = new Set(qualifiedSkillKeys(this.draft));
          this.draft.skills.favorites = this.draft.skills.favorites.filter(
            (key) => qualified.has(key),
          );
        }
        void this.saveAndRender();
      });
    for (const textarea of root.querySelectorAll<HTMLTextAreaElement>(
      "textarea[data-auto-grow]",
    )) {
      const resize = () => {
        textarea.style.height = "auto";
        textarea.style.height = `${Math.max(textarea.scrollHeight, 56)}px`;
      };
      resize();
      textarea.addEventListener("input", resize);
    }
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
      if (action === "open-selection") {
        const uuid = button.dataset.selectionUuid;
        const selection = draftSelections(this.draft).find(
          (entry) => entry.uuid === uuid,
        );
        if (!selection) throw new Error("Sélection de catalogue introuvable.");
        await openCatalogSelectionDocument(selection);
        return;
      }
      if (action === "pick-image") {
        this.openImagePicker(button.dataset.draftPath ?? "");
        return;
      }
      if (action === "clear-image") {
        const path = button.dataset.draftPath;
        if (path) setDraftValue(this.draft, path, "");
        await this.saveAndRender();
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
            this.draft.body.nature = "biological";
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
            this.draft.skills.profileChoices = [];
            this.draft.skills.pathChoices = [];
            this.draft.skills.freeChoices = [];
          }
          if (path === "path.path") {
            this.draft.attributes.pathAttribute = "";
            this.draft.path.primarySpecialization = null;
            this.draft.path.secondarySpecializations = [];
            this.draft.talents.primaryTalent = null;
            this.draft.talents.secondaryTalents = [];
            this.draft.skills.pathChoices = [];
            this.draft.skills.freeChoices = [];
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
          if (path === "profile.advantages" || path === "profile.drawbacks") {
            delete this.draft.profile.selectionDetails[relisId];
            for (const key of Object.keys(this.draft.profile.selectionChoices))
              if (key.startsWith(`${relisId}:`))
                delete this.draft.profile.selectionChoices[key];
          }
          if (path === "path.secondarySpecializations")
            this.draft.talents.secondaryTalents =
              this.draft.talents.secondaryTalents.filter(
                (talent) =>
                  talent.catalog.specializationRef?.relisId !== relisId,
              );
          if (
            path === "resources.initialEquipment" &&
            this.draft.resources.initialEquipment.length === 0
          )
            this.draft.resources.equipmentPending = true;
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

  private openImagePicker(path: string): void {
    if (!path) return;
    const current = path
      .split(".")
      .reduce((value: any, key) => value?.[key], this.draft);
    const FilePicker = foundry.applications.apps.FilePicker.implementation;
    const picker = new FilePicker({
      type: "image",
      current: String(current ?? ""),
      callback: async (selectedPath: string) => {
        if (!selectedPath) return;
        setDraftValue(this.draft, path, selectedPath);
        await this.saveAndRender();
      },
    });
    void picker.render({ force: true });
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
        packId?: string;
        packIds?: string[];
        path: string;
        multiple?: boolean;
        maximum?: number;
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
        maximum: 3,
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
        maximum: secondarySpecializationCount(this.draft.path.secondaryScheme),
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
        predicate: (entry) => entry.catalog.postTier === "primary",
      },
      secondaryPost: {
        title: "Ajouter un Poste secondaire",
        packId: "relis.creation-posts",
        path: "assignments.secondaryPosts",
        multiple: true,
        maximum: 1,
        predicate: (entry) => entry.catalog.postTier === "secondary",
      },
      equipment: {
        title: "Ajouter un équipement initial réel",
        packIds: [
          "relis.material-weapons",
          "relis.material-armor",
          "relis.material-equipment",
          "relis.material-consumables",
          "relis.material-ammunition",
          "relis.material-resources",
          "relis.material-containers",
        ],
        path: "resources.initialEquipment",
        multiple: true,
        predicate: (entry) => entry.relisId !== "MAT-RES-CREDIT",
      },
    };
    const configuration = mapping[kind];
    if (!configuration) return;
    const current = configuration.path
      .split(".")
      .reduce((value: any, key) => value[key], this.draft);
    if (
      configuration.multiple &&
      configuration.maximum !== undefined &&
      Array.from(current ?? []).length >= configuration.maximum
    )
      throw new Error(
        `Ce choix est limité à ${configuration.maximum} sélection${configuration.maximum > 1 ? "s" : ""}.`,
      );
    const selected = configuration.multiple
      ? Array.from(current ?? []).map((entry: any) => entry.relisId)
      : current?.relisId
        ? [current.relisId]
        : [];
    const pickerOptions: Parameters<typeof openCatalogPicker>[0] = {
      title: configuration.title,
      selectedRelisIds: selected,
      ...(configuration.predicate
        ? { predicate: configuration.predicate }
        : {}),
    };
    if (configuration.packIds) pickerOptions.packIds = configuration.packIds;
    else if (configuration.packId) pickerOptions.packId = configuration.packId;
    else throw new Error("Aucun catalogue n’est configuré pour ce choix.");
    const choice = await openCatalogPicker(pickerOptions);
    if (!choice) return;
    setDraftValue(
      this.draft,
      configuration.path,
      configuration.multiple ? [...Array.from(current ?? []), choice] : choice,
    );
    if (kind === "ancestry") {
      this.draft.body.nature = String(
        choice.catalog.bodyNature ?? "biological",
      );
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
      this.draft.skills.profileChoices = [];
      this.draft.skills.pathChoices = [];
      this.draft.skills.freeChoices = [];
    }
    if (kind === "path") {
      this.draft.attributes.pathAttribute = "";
      this.draft.path.primarySpecialization = null;
      this.draft.path.secondarySpecializations = [];
      this.draft.talents.primaryTalent = null;
      this.draft.talents.secondaryTalents = [];
      this.draft.skills.pathChoices = [];
      this.draft.skills.freeChoices = [];
    }
    if (kind === "equipment") this.draft.resources.equipmentPending = false;
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
