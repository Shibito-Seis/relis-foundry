import {
  ATTRIBUTE_LABELS,
  SKILL_DEFINITIONS,
  type AttributeKey,
  type SkillKey,
} from "../config";

export const CHARACTER_CREATION_VERSION = 1;

export const CHARACTER_CREATION_STEPS = [
  { id: "frame", label: "Cadre" },
  { id: "identity", label: "Identité" },
  { id: "body", label: "Corps & Ascendance" },
  { id: "profile", label: "Profil & Origine" },
  { id: "attributes", label: "Attributs" },
  { id: "skills", label: "Compétences" },
  { id: "path", label: "Voie & Spécialisations" },
  { id: "talents", label: "Talents & Capacités" },
  { id: "resources", label: "Ressources initiales" },
  { id: "appearance", label: "Apparence & Présentation" },
  { id: "assignments", label: "Affectations" },
  { id: "review", label: "Révision" },
] as const;

export type CharacterCreationStepId =
  (typeof CHARACTER_CREATION_STEPS)[number]["id"];

export interface CatalogSelection {
  packId: string;
  uuid: string;
  relisId: string;
  name: string;
  type: string;
  img: string;
  catalog: Record<string, any>;
  level?: number | null;
  requirementRefs?: Array<Record<string, any>>;
  description?: string;
}

export interface CharacterCreationDraft {
  id: string;
  version: number;
  revision: number;
  currentStep: CharacterCreationStepId;
  updatedAt: number;
  completedActorUuid: string;
  frame: {
    ownerId: string;
    level: number;
    creationType: "character";
    templateRef: string;
  };
  identity: {
    primaryName: string;
    publicName: string;
    pronouns: string;
    gender: string;
    callsign: string;
    earthBirthDate: string;
    chronologicalAge: number | null;
    biologicalAge: number | null;
    apparentAge: number | null;
    memorableMemory: string;
  };
  body: {
    nature: string;
    size: string;
    ancestry: CatalogSelection | null;
    ancestryAttributeChoices: AttributeKey[];
    ancestryProfileId: string;
  };
  profile: {
    profile: CatalogSelection | null;
    profileMode: "standard" | "marked";
    profileAttributeChoices: AttributeKey[];
    profilePenalty: AttributeKey | "";
    advantageAttributeChoices: Record<string, AttributeKey[]>;
    origin: CatalogSelection | null;
    advantages: CatalogSelection[];
    drawbacks: CatalogSelection[];
  };
  attributes: {
    pathAttribute: AttributeKey | "";
    freeIncreases: AttributeKey[];
  };
  skills: {
    qualified: SkillKey[];
    favorites: SkillKey[];
  };
  path: {
    path: CatalogSelection | null;
    primarySpecialization: CatalogSelection | null;
    secondaryScheme: "duo" | "trio" | "quartet";
    secondarySpecializations: CatalogSelection[];
  };
  talents: {
    ancestryTalent: CatalogSelection | null;
    profileTalent: CatalogSelection | null;
    primaryTalent: CatalogSelection | null;
    secondaryTalents: CatalogSelection[];
  };
  resources: {
    energyProfileId: string;
    creditsPending: boolean;
    equipmentPending: boolean;
  };
  appearance: {
    actorImage: string;
    tokenImage: string;
    description: string;
  };
  assignments: {
    primaryPost: CatalogSelection | null;
    secondaryPosts: CatalogSelection[];
  };
}

export interface CreationDiagnostic {
  level: "error" | "warning" | "info";
  step: CharacterCreationStepId;
  message: string;
}

export interface CreationDerivedState {
  attributes: Record<AttributeKey, number>;
  hitPoints: number | null;
  hitPointSources: string[];
  energyPools: Array<{
    key: string;
    current: number;
    maximum: number;
    reserved: number;
    debt: number;
    unit: string;
  }>;
  qualifiedSkillCount: number;
  requiredQualifiedSkills: number | null;
  diagnostics: CreationDiagnostic[];
}

const ATTRIBUTE_BY_LABEL = new Map<string, AttributeKey>(
  Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => [
    normalizeLabel(label),
    key as AttributeKey,
  ]),
);

const SKILL_BY_LABEL = new Map<string, SkillKey>(
  Object.entries(SKILL_DEFINITIONS).map(([key, [label]]) => [
    normalizeLabel(label),
    key as SkillKey,
  ]),
);

function normalizeLabel(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .trim()
    .toLocaleLowerCase("fr");
}

function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function catalogChoiceLabels(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).filter(Boolean);
}

function attributeKey(value: unknown): AttributeKey | null {
  return ATTRIBUTE_BY_LABEL.get(normalizeLabel(value)) ?? null;
}

function skillKey(value: unknown): SkillKey | null {
  return SKILL_BY_LABEL.get(normalizeLabel(value)) ?? null;
}

function signedAttributes(value: unknown): Array<[AttributeKey, number]> {
  const result: Array<[AttributeKey, number]> = [];
  for (const fragment of String(value ?? "").split(",")) {
    const match = fragment.trim().match(/^([+-]\d+)\s+(.+)$/u);
    if (!match) continue;
    const key = attributeKey(match[2]);
    const amount = Number(match[1]);
    if (key && Number.isInteger(amount)) result.push([key, amount]);
  }
  return result;
}

function markedAttributes(value: unknown, sign: 1 | -1): AttributeKey[] {
  const [bonuses = "", penalties = ""] = String(value ?? "").split(";");
  const source = sign > 0 ? bonuses : penalties;
  return source
    .split(/,|\bou\b/iu)
    .map((fragment) => attributeKey(fragment.replace(/[+\-\d]/gu, "").trim()))
    .filter((key): key is AttributeKey => Boolean(key));
}

function freeAttributeCount(value: unknown): number {
  return String(value ?? "")
    .split(",")
    .filter((fragment) => /^\s*\+1\s+libre\s*$/iu.test(fragment)).length;
}

function selectionReference(
  selection: CatalogSelection | null,
): Record<string, any> {
  return {
    relisId: selection?.relisId ?? "",
    uuid: selection?.uuid ?? "",
    documentName: selection ? "Item" : "",
    type: selection?.type ?? "",
    state: selection ? "resolved" : "unresolved",
    labelSnapshot: selection?.name ?? "",
    missingPolicy: "diagnose",
  };
}

export function createCharacterDraft(
  id: string,
  ownerId = "",
  now = Date.now(),
): CharacterCreationDraft {
  return {
    id,
    version: CHARACTER_CREATION_VERSION,
    revision: 0,
    currentStep: "frame",
    updatedAt: now,
    completedActorUuid: "",
    frame: {
      ownerId,
      level: 1,
      creationType: "character",
      templateRef: "",
    },
    identity: {
      primaryName: "",
      publicName: "",
      pronouns: "",
      gender: "",
      callsign: "",
      earthBirthDate: "",
      chronologicalAge: null,
      biologicalAge: null,
      apparentAge: null,
      memorableMemory: "",
    },
    body: {
      nature: "biological",
      size: "medium",
      ancestry: null,
      ancestryAttributeChoices: [],
      ancestryProfileId: "",
    },
    profile: {
      profile: null,
      profileMode: "standard",
      profileAttributeChoices: [],
      profilePenalty: "",
      advantageAttributeChoices: {},
      origin: null,
      advantages: [],
      drawbacks: [],
    },
    attributes: { pathAttribute: "", freeIncreases: [] },
    skills: { qualified: [], favorites: [] },
    path: {
      path: null,
      primarySpecialization: null,
      secondaryScheme: "duo",
      secondarySpecializations: [],
    },
    talents: {
      ancestryTalent: null,
      profileTalent: null,
      primaryTalent: null,
      secondaryTalents: [],
    },
    resources: {
      energyProfileId: "",
      creditsPending: true,
      equipmentPending: true,
    },
    appearance: { actorImage: "", tokenImage: "", description: "" },
    assignments: { primaryPost: null, secondaryPosts: [] },
  };
}

export function normalizeCharacterDraft(
  value: Partial<CharacterCreationDraft> | null | undefined,
  id: string,
  ownerId = "",
): CharacterCreationDraft {
  const base = createCharacterDraft(id, ownerId);
  if (!value || value.version !== CHARACTER_CREATION_VERSION) return base;
  return {
    ...base,
    ...value,
    id,
    frame: { ...base.frame, ...value.frame },
    identity: { ...base.identity, ...value.identity },
    body: { ...base.body, ...value.body },
    profile: { ...base.profile, ...value.profile },
    attributes: { ...base.attributes, ...value.attributes },
    skills: { ...base.skills, ...value.skills },
    path: { ...base.path, ...value.path },
    talents: { ...base.talents, ...value.talents },
    resources: { ...base.resources, ...value.resources },
    appearance: { ...base.appearance, ...value.appearance },
    assignments: { ...base.assignments, ...value.assignments },
  };
}

export function secondarySpecializationCount(
  scheme: CharacterCreationDraft["path"]["secondaryScheme"],
): number {
  return scheme === "duo" ? 2 : scheme === "trio" ? 3 : 4;
}

export function requiredQualifiedSkillCount(
  draft: CharacterCreationDraft,
  intelligence: number,
): number | null {
  const pathTotal = Number(draft.path.path?.catalog.qualifiedSkillTotal);
  const advantageSkills = draft.profile.advantages.reduce(
    (total, advantage) =>
      total +
      Math.max(
        0,
        Math.trunc(
          Number(advantage.catalog.creationEffects?.qualifiedSkills) || 0,
        ),
      ),
    0,
  );
  return Number.isFinite(pathTotal)
    ? Math.max(
        0,
        pathTotal + 2 + Math.max(0, Math.trunc(intelligence)) + advantageSkills,
      )
    : null;
}

function advantageAttributeChanges(
  draft: CharacterCreationDraft,
  diagnostics: CreationDiagnostic[],
): Array<[AttributeKey, number]> {
  const result: Array<[AttributeKey, number]> = [];
  const allChoices: AttributeKey[] = [];
  for (const advantage of draft.profile.advantages) {
    const expected = Math.max(
      0,
      Math.trunc(
        Number(advantage.catalog.creationEffects?.freeAttributeIncreases) || 0,
      ),
    );
    if (expected === 0) continue;
    const choices = distinct(
      draft.profile.advantageAttributeChoices[advantage.relisId] ?? [],
    );
    if (choices.length !== expected)
      diagnostics.push({
        level: "error",
        step: "attributes",
        message: `${advantage.name} exige ${expected} augmentation${expected > 1 ? "s" : ""} d’Attribut libre${expected > 1 ? "s" : ""}.`,
      });
    allChoices.push(...choices);
    result.push(...choices.map((key) => [key, 1] as [AttributeKey, number]));
  }
  if (distinct(allChoices).length !== allChoices.length)
    diagnostics.push({
      level: "error",
      step: "attributes",
      message:
        "Deux Atouts d’Attribut ne peuvent pas augmenter le même Attribut à la création.",
    });
  return result;
}

function selectedCreationValue(selection: CatalogSelection): number | null {
  const values =
    String(selection.catalog.value ?? "")
      .match(/[+-]\d+/gu)
      ?.map(Number)
      .filter(Number.isFinite) ?? [];
  if (values.length === 0) return null;
  if (values.length === 1) return values[0] ?? null;
  const selected = Number(selection.catalog.selectedValue);
  return values.includes(selected) ? selected : null;
}

function ancestryAttributeChanges(
  draft: CharacterCreationDraft,
  diagnostics: CreationDiagnostic[],
): Array<[AttributeKey, number]> {
  const catalog = draft.body.ancestry?.catalog ?? {};
  const fixed = [
    ...signedAttributes(catalog.attributeBonuses),
    ...signedAttributes(catalog.attributePenalty),
  ];
  const freeCount = freeAttributeCount(catalog.attributeBonuses);
  const inheritedCount = Number(catalog.inheritedAttributeChoiceCount ?? 0);
  const expected = freeCount + inheritedCount;
  const selected = distinct(draft.body.ancestryAttributeChoices);
  if (draft.body.ancestry && selected.length !== expected)
    diagnostics.push({
      level: "error",
      step: "body",
      message: `${draft.body.ancestry.name} exige ${expected} choix d’Attribut distinct${expected > 1 ? "s" : ""}.`,
    });
  const inheritedAllowed = catalogChoiceLabels(
    catalog.inheritedAttributeChoices,
  )
    .map(attributeKey)
    .filter((key): key is AttributeKey => Boolean(key));
  if (
    inheritedCount > 0 &&
    selected.filter((key) => inheritedAllowed.includes(key)).length <
      inheritedCount
  )
    diagnostics.push({
      level: "error",
      step: "body",
      message: "Un choix d’Attribut hérité ne provient pas du parent déclaré.",
    });
  return [
    ...fixed,
    ...selected.map((key) => [key, 1] as [AttributeKey, number]),
  ];
}

function profileAttributeChanges(
  draft: CharacterCreationDraft,
  diagnostics: CreationDiagnostic[],
): Array<[AttributeKey, number]> {
  const profile = draft.profile.profile;
  if (!profile) return [];
  const catalog = profile.catalog;
  const selected = distinct(draft.profile.profileAttributeChoices);
  const allowed = catalogChoiceLabels(catalog.standardAttributes)
    .map(attributeKey)
    .filter((key): key is AttributeKey => Boolean(key));
  const markedBonuses = markedAttributes(catalog.markedProfile, 1);
  const result: Array<[AttributeKey, number]> = [];
  if (draft.profile.profileMode === "marked") {
    if (markedBonuses.length !== 2)
      diagnostics.push({
        level: "error",
        step: "profile",
        message: `Le Profil marqué ${profile.name} ne fournit pas deux bonus structurés.`,
      });
    result.push(
      ...markedBonuses.map((key) => [key, 1] as [AttributeKey, number]),
    );
  } else {
    if (selected.length !== 1 || selected.some((key) => !allowed.includes(key)))
      diagnostics.push({
        level: "error",
        step: "profile",
        message: `Le Profil ${profile.name} exige un bonus d’Attribut parmi sa liste.`,
      });
    result.push(...selected.map((key) => [key, 1] as [AttributeKey, number]));
  }
  if (draft.profile.profileMode === "marked") {
    const allowedPenalties = markedAttributes(catalog.markedProfile, -1);
    if (
      !draft.profile.profilePenalty ||
      !allowedPenalties.includes(draft.profile.profilePenalty)
    )
      diagnostics.push({
        level: "error",
        step: "profile",
        message:
          "Le Profil marqué exige une contrepartie prévue par sa source.",
      });
    else result.push([draft.profile.profilePenalty, -1]);
  }
  return result;
}

function selectedHitPoints(draft: CharacterCreationDraft): number | null {
  const profile = draft.body.ancestry?.catalog.hitPointProfile;
  if (!profile) return null;
  if (profile.mode === "fixed") {
    const value = Number(profile.value);
    return Number.isFinite(value) ? value : null;
  }
  const profiles = Array.isArray(profile.profiles) ? profile.profiles : [];
  const selected = profiles.find(
    (entry: any) =>
      String(entry.id) ===
      (draft.body.ancestryProfileId || draft.resources.energyProfileId),
  );
  const value = Number(selected?.value);
  return Number.isFinite(value) ? value : null;
}

function selectedEnergyProfile(draft: CharacterCreationDraft): any | null {
  const profiles = Array.isArray(draft.body.ancestry?.catalog.energyProfiles)
    ? draft.body.ancestry?.catalog.energyProfiles
    : [];
  if (!profiles.length) return null;
  return (
    profiles.find(
      (profile: any) => String(profile.id) === draft.resources.energyProfileId,
    ) ?? (profiles.length === 1 ? profiles[0] : null)
  );
}

export function deriveCharacterCreation(
  draft: CharacterCreationDraft,
): CreationDerivedState {
  const diagnostics: CreationDiagnostic[] = [];
  if (draft.frame.level !== 1)
    diagnostics.push({
      level: "error",
      step: "frame",
      message:
        "10-D3 crée un personnage de niveau 1. Les niveaux ultérieurs appartiennent à la progression 10-D4.",
    });
  const attributes = Object.fromEntries(
    Object.keys(ATTRIBUTE_LABELS).map((key) => [key, 0]),
  ) as Record<AttributeKey, number>;
  const changes: Array<[AttributeKey, number]> = [
    ...ancestryAttributeChanges(draft, diagnostics),
    ...profileAttributeChanges(draft, diagnostics),
    ...advantageAttributeChanges(draft, diagnostics),
  ];
  const pathAllowed = catalogChoiceLabels(
    draft.path.path?.catalog.keyAttributes,
  )
    .map(attributeKey)
    .filter((key): key is AttributeKey => Boolean(key));
  if (draft.path.path) {
    if (
      !draft.attributes.pathAttribute ||
      !pathAllowed.includes(draft.attributes.pathAttribute)
    )
      diagnostics.push({
        level: "error",
        step: "attributes",
        message: "Choisissez un Attribut clef proposé par la Voie.",
      });
    else changes.push([draft.attributes.pathAttribute, 1]);
  }
  const free = distinct(draft.attributes.freeIncreases);
  if (free.length !== 4)
    diagnostics.push({
      level: "error",
      step: "attributes",
      message:
        "Le palier de création exige quatre augmentations libres dans quatre Attributs distincts.",
    });
  changes.push(...free.map((key) => [key, 1] as [AttributeKey, number]));
  for (const [key, amount] of changes) attributes[key] += amount;

  const ancestryHp = selectedHitPoints(draft);
  if (draft.body.ancestry && ancestryHp === null)
    diagnostics.push({
      level: "error",
      step: "resources",
      message: "Le profil de PV d’Ascendance doit être choisi.",
    });
  const pathHp = Number(draft.path.path?.catalog.hitPointsPerLevel);
  const level = Math.max(1, Math.trunc(Number(draft.frame.level) || 1));
  const hitPoints =
    ancestryHp !== null && Number.isFinite(pathHp)
      ? ancestryHp + level * (pathHp + attributes.vigor)
      : null;

  const energy = selectedEnergyProfile(draft);
  if (draft.body.ancestry?.catalog.energySelectionRequired === true && !energy)
    diagnostics.push({
      level: "error",
      step: "resources",
      message:
        "Choisissez le profil énergétique ou la dominance de l’Ascendance.",
    });
  const energyPools = energy
    ? [
        ["mana", Number(energy.mana ?? 0)],
        ["prana", Number(energy.prana ?? 0)],
        ["flux", Number(energy.flux ?? 0)],
      ].map(([key, maximum]) => ({
        key: String(key),
        current: Number(maximum),
        maximum: Number(maximum),
        reserved: 0,
        debt: 0,
        unit: "points",
      }))
    : [];

  const qualified = distinct(draft.skills.qualified);
  const required = requiredQualifiedSkillCount(draft, attributes.intelligence);
  if (required !== null && qualified.length !== required)
    diagnostics.push({
      level: "error",
      step: "skills",
      message: `La création exige ${required} compétences Qualifiées ; ${qualified.length} sont sélectionnées.`,
    });
  const pathRequired = catalogChoiceLabels(
    draft.path.path?.catalog.requiredSkills,
  )
    .map(skillKey)
    .filter((key): key is SkillKey => Boolean(key));
  if (pathRequired.some((key) => !qualified.includes(key)))
    diagnostics.push({
      level: "error",
      step: "skills",
      message:
        "Les compétences obligatoires de la Voie doivent être Qualifiées.",
    });
  const pathOptions = distinct([
    ...pathRequired,
    ...catalogChoiceLabels(draft.path.path?.catalog.skillChoices)
      .map(skillKey)
      .filter((key): key is SkillKey => Boolean(key)),
  ]);
  const pathTotal = Number(draft.path.path?.catalog.qualifiedSkillTotal);
  if (
    Number.isFinite(pathTotal) &&
    qualified.filter((key) => pathOptions.includes(key)).length < pathTotal
  )
    diagnostics.push({
      level: "error",
      step: "skills",
      message: `La Voie exige ${pathTotal} compétences choisies dans son propre catalogue.`,
    });
  const profileOptions = catalogChoiceLabels(
    draft.profile.profile?.catalog.skillChoices,
  )
    .map(skillKey)
    .filter((key): key is SkillKey => Boolean(key));
  if (
    draft.profile.profile &&
    qualified.filter((key) => profileOptions.includes(key)).length < 2
  )
    diagnostics.push({
      level: "error",
      step: "skills",
      message: "Le Profil exige deux compétences choisies dans sa liste.",
    });

  const secondaryExpected = secondarySpecializationCount(
    draft.path.secondaryScheme,
  );
  if (draft.path.secondarySpecializations.length > secondaryExpected)
    diagnostics.push({
      level: "error",
      step: "path",
      message: `Le schéma choisi autorise ${secondaryExpected} Spécialisations secondaires.`,
    });
  const secondarySpecializationIds = draft.path.secondarySpecializations.map(
    (entry) => entry.relisId,
  );
  if (
    distinct(secondarySpecializationIds).length !==
      secondarySpecializationIds.length ||
    secondarySpecializationIds.includes(
      draft.path.primarySpecialization?.relisId ?? "",
    )
  )
    diagnostics.push({
      level: "error",
      step: "path",
      message:
        "Une branche ne peut pas occuper deux emplacements de Spécialisation ni être à la fois principale et secondaire.",
    });
  if (draft.path.primarySpecialization && draft.path.path) {
    const pathName = String(draft.path.path.name);
    if (draft.path.primarySpecialization.catalog.pathName !== pathName)
      diagnostics.push({
        level: "error",
        step: "path",
        message:
          "La Spécialisation Principale doit appartenir à la Voie principale.",
      });
  }

  const ancestryTalentCatalogs = new Set([
    draft.body.ancestry?.name,
    ...(draft.body.ancestry?.catalog.talentCatalogs ?? []),
    "Universel",
  ]);
  if (
    draft.talents.ancestryTalent &&
    (draft.talents.ancestryTalent.level !== 1 ||
      !ancestryTalentCatalogs.has(
        String(draft.talents.ancestryTalent.catalog.ancestry),
      ))
  )
    diagnostics.push({
      level: "error",
      step: "talents",
      message:
        "Le Talent d’Ascendance doit être de niveau 1 et appartenir à un catalogue autorisé par l’Ascendance.",
    });
  if (
    draft.talents.profileTalent &&
    (draft.talents.profileTalent.level !== 1 ||
      !catalogChoiceLabels(
        draft.profile.profile?.catalog.skillChoices,
      ).includes(String(draft.talents.profileTalent.catalog.skill)))
  )
    diagnostics.push({
      level: "error",
      step: "talents",
      message:
        "Le Talent de Profil doit être de niveau 1 et relever d’une Compétence proposée par le Profil.",
    });
  if (
    draft.talents.primaryTalent &&
    (draft.talents.primaryTalent.level !== 1 ||
      draft.talents.primaryTalent.catalog.specializationRef?.relisId !==
        draft.path.primarySpecialization?.relisId)
  )
    diagnostics.push({
      level: "error",
      step: "talents",
      message:
        "Le Talent principal doit être de niveau 1 et provenir de la Spécialisation Principale.",
    });
  const secondaryIds = new Set(
    draft.path.secondarySpecializations.map((entry) => entry.relisId),
  );
  const secondaryTalentSources = draft.talents.secondaryTalents.map((talent) =>
    String(talent.catalog.specializationRef?.relisId ?? ""),
  );
  if (
    draft.talents.secondaryTalents.some(
      (talent, index) =>
        talent.level !== 1 ||
        !secondaryIds.has(secondaryTalentSources[index] ?? ""),
    ) ||
    distinct(secondaryTalentSources).length !== secondaryTalentSources.length
  )
    diagnostics.push({
      level: "error",
      step: "talents",
      message:
        "Chaque Talent secondaire doit être de niveau 1, provenir d’une Spécialisation secondaire choisie et rester unique dans sa branche.",
    });

  const unresolvedValues = [
    ...draft.profile.advantages,
    ...draft.profile.drawbacks,
  ].filter((entry) => selectedCreationValue(entry) === null);
  if (unresolvedValues.length)
    diagnostics.push({
      level: "error",
      step: "profile",
      message: `Choisissez la valeur de ${unresolvedValues.map((entry) => entry.name).join(", ")}.`,
    });
  const advantageValue = draft.profile.advantages.reduce(
    (sum, entry) => sum + Math.max(0, selectedCreationValue(entry) ?? 0),
    0,
  );
  const drawbackValue = draft.profile.drawbacks.reduce(
    (sum, entry) => sum + Math.min(0, selectedCreationValue(entry) ?? 0),
    0,
  );
  if (draft.profile.advantages.length > 3)
    diagnostics.push({
      level: "error",
      step: "profile",
      message: "La création autorise au maximum trois Atouts.",
    });
  if (advantageValue + drawbackValue !== 0)
    diagnostics.push({
      level: "error",
      step: "profile",
      message: `La balance Atouts / Handicaps doit être nulle (actuellement ${advantageValue + drawbackValue}).`,
    });
  const selectedIds = new Set(
    [...draft.profile.advantages, ...draft.profile.drawbacks].map(
      (entry) => entry.relisId,
    ),
  );
  for (const selection of [
    ...draft.profile.advantages,
    ...draft.profile.drawbacks,
  ]) {
    const constraints = selection.catalog.creationConstraints ?? {};
    for (const required of constraints.requires ?? [])
      if (!selectedIds.has(String(required.relisId ?? "")))
        diagnostics.push({
          level: "error",
          step: "profile",
          message: `${selection.name} requiert ${String(required.label ?? required.relisId)}.`,
        });
    for (const incompatible of constraints.incompatible ?? [])
      if (selectedIds.has(String(incompatible.relisId ?? "")))
        diagnostics.push({
          level: incompatible.sameSubjectOnly ? "warning" : "error",
          step: "profile",
          message: incompatible.sameSubjectOnly
            ? `${selection.name} ne peut viser le même sujet que ${String(incompatible.label ?? incompatible.relisId)} ; vérifiez que les éléments concernés sont distincts.`
            : `${selection.name} est incompatible avec ${String(incompatible.label ?? incompatible.relisId)}.`,
        });
  }
  for (const automatic of draft.body.ancestry?.catalog.automaticDrawbacks ?? [])
    if (!selectedIds.has(String(automatic.relisId ?? "")))
      diagnostics.push({
        level: "error",
        step: "profile",
        message: `${draft.body.ancestry?.name} reçoit automatiquement ${String(automatic.label ?? automatic.relisId)}.`,
      });

  for (const [step, missing, message] of [
    [
      "identity",
      !draft.identity.primaryName.trim(),
      "Le nom principal est obligatoire.",
    ],
    ["body", !draft.body.ancestry, "Une Ascendance doit être choisie."],
    ["profile", !draft.profile.profile, "Un Profil doit être choisi."],
    ["profile", !draft.profile.origin, "Une Origine doit être choisie."],
    ["path", !draft.path.path, "Une Voie principale doit être choisie."],
    [
      "path",
      !draft.path.primarySpecialization,
      "Une Spécialisation Principale doit être choisie.",
    ],
    [
      "assignments",
      !draft.assignments.primaryPost,
      "Un Poste principal doit être choisi.",
    ],
  ] as const)
    if (missing) diagnostics.push({ level: "error", step, message });

  if (!draft.talents.ancestryTalent)
    diagnostics.push({
      level: "warning",
      step: "talents",
      message: "Talent d’Ascendance laissé en attente.",
    });
  if (!draft.talents.profileTalent)
    diagnostics.push({
      level: "warning",
      step: "talents",
      message: "Talent de compétence du Profil laissé en attente.",
    });
  if (!draft.talents.primaryTalent)
    diagnostics.push({
      level: "warning",
      step: "talents",
      message: "Talent de Spécialisation Principale laissé en attente.",
    });
  const secondaryWithoutTalent = draft.path.secondarySpecializations.filter(
    (specialization) =>
      !draft.talents.secondaryTalents.some(
        (talent) =>
          talent.catalog.specializationRef?.relisId === specialization.relisId,
      ),
  );
  if (secondaryWithoutTalent.length)
    diagnostics.push({
      level: "warning",
      step: "talents",
      message: `${secondaryWithoutTalent.length} Talent${secondaryWithoutTalent.length > 1 ? "s" : ""} secondaire${secondaryWithoutTalent.length > 1 ? "s" : ""} de niveau 1 reste${secondaryWithoutTalent.length > 1 ? "nt" : ""} en attente.`,
    });
  if (draft.resources.creditsPending)
    diagnostics.push({
      level: "warning",
      step: "resources",
      message: "Crédits initiaux conservés comme choix en attente.",
    });
  if (draft.resources.equipmentPending)
    diagnostics.push({
      level: "warning",
      step: "resources",
      message: "Équipement initial conservé comme choix en attente.",
    });

  return {
    attributes,
    hitPoints,
    hitPointSources: [
      ancestryHp === null
        ? "Ascendance non résolue"
        : `Ascendance ${ancestryHp}`,
      Number.isFinite(pathHp) ? `Voie ${pathHp}/niveau` : "Voie non résolue",
      `Vigueur ${attributes.vigor}/niveau`,
    ],
    energyPools,
    qualifiedSkillCount: qualified.length,
    requiredQualifiedSkills: required,
    diagnostics,
  };
}

export function creationStepState(
  draft: CharacterCreationDraft,
  step: CharacterCreationStepId,
): "not-started" | "in-progress" | "complete" | "warning" | "blocked" {
  const diagnostics = deriveCharacterCreation(draft).diagnostics.filter(
    (entry) => entry.step === step,
  );
  if (diagnostics.some((entry) => entry.level === "error")) return "blocked";
  if (diagnostics.some((entry) => entry.level === "warning")) return "warning";
  const index = CHARACTER_CREATION_STEPS.findIndex(
    (entry) => entry.id === step,
  );
  const current = CHARACTER_CREATION_STEPS.findIndex(
    (entry) => entry.id === draft.currentStep,
  );
  if (index < current) return "complete";
  if (index === current) return "in-progress";
  return "not-started";
}

export function characterActorSource(
  draft: CharacterCreationDraft,
): Record<string, any> {
  const derived = deriveCharacterCreation(draft);
  const pendingMessages = derived.diagnostics
    .filter((entry) => entry.level === "warning")
    .map((entry, index) => ({
      id: `creation-${index + 1}`,
      sort: index,
      status: "active",
      value: entry.message,
      visibility: "owner",
    }));
  const attributes = Object.fromEntries(
    Object.entries(derived.attributes).map(([key, base]) => [
      key,
      { base, partial: false, modifiers: [] },
    ]),
  );
  const qualified = new Set(draft.skills.qualified);
  const favorites = new Set(draft.skills.favorites);
  const skills = Object.fromEntries(
    Object.entries(SKILL_DEFINITIONS).map(([key, [, defaultAttribute]]) => [
      key,
      {
        rank: qualified.has(key as SkillKey) ? "trained" : "untrained",
        defaultAttribute,
        favorite: favorites.has(key as SkillKey),
        modifiers: [],
      },
    ]),
  );
  const reference = selectionReference;
  return {
    name: draft.identity.primaryName.trim(),
    type: "character",
    img: draft.appearance.actorImage || "icons/svg/mystery-man.svg",
    ownership: draft.frame.ownerId
      ? { default: 0, [draft.frame.ownerId]: 3 }
      : { default: 0 },
    prototypeToken: draft.appearance.tokenImage
      ? { texture: { src: draft.appearance.tokenImage } }
      : undefined,
    flags: {
      relis: {
        characterCreation: {
          draftId: draft.id,
          version: draft.version,
          revision: draft.revision,
          completedAt: Date.now(),
          selections: {
            ancestryAttributeChoices: draft.body.ancestryAttributeChoices,
            ancestryProfileId: draft.body.ancestryProfileId,
            profileMode: draft.profile.profileMode,
            profileAttributeChoices: draft.profile.profileAttributeChoices,
            profilePenalty: draft.profile.profilePenalty,
            advantageAttributeChoices: draft.profile.advantageAttributeChoices,
            pathAttribute: draft.attributes.pathAttribute,
            freeIncreases: draft.attributes.freeIncreases,
            qualifiedSkills: draft.skills.qualified,
            favoriteSkills: draft.skills.favorites,
            energyProfileId: draft.resources.energyProfileId,
            secondaryScheme: draft.path.secondaryScheme,
          },
        },
      },
    },
    system: {
      identity: {
        primaryName: draft.identity.primaryName,
        publicName: draft.identity.publicName,
        pronouns: draft.identity.pronouns,
        gender: draft.identity.gender,
        callsign: draft.identity.callsign,
        biography: draft.appearance.description,
        memory: draft.identity.memorableMemory,
      },
      age: {
        earthBirthDate: draft.identity.earthBirthDate,
        chronological: {
          value: draft.identity.chronologicalAge,
          unit: "years",
          precision: "exact",
        },
        biological: {
          value: draft.identity.biologicalAge,
          unit: "years",
          precision: "exact",
        },
        apparent: {
          value: draft.identity.apparentAge,
          unit: "years",
          precision: "exact",
        },
      },
      level: draft.frame.level,
      attributes,
      skills,
      bodies: [
        {
          id: "primary",
          name: "Corps principal",
          nature: draft.body.nature,
          size: draft.body.size,
        },
      ],
      activeBodyId: "primary",
      build: {
        ancestryRef: reference(draft.body.ancestry),
        profileRef: reference(draft.profile.profile),
        originRef: reference(draft.profile.origin),
        pathRef: reference(draft.path.path),
        primarySpecializationRef: reference(draft.path.primarySpecialization),
        secondarySpecializations: draft.path.secondarySpecializations.map(
          (selection) => ({
            ref: reference(selection),
            rank: "1",
            sourceRef: reference(draft.path.path),
          }),
        ),
        advantageRefs: draft.profile.advantages.map(reference),
        drawbackRefs: draft.profile.drawbacks.map(reference),
      },
      post: {
        primaryRef: reference(draft.assignments.primaryPost),
        secondaryRefs: draft.assignments.secondaryPosts.map(reference),
      },
      health: {
        hitPoints: {
          key: "hitPoints",
          current: Math.max(0, derived.hitPoints ?? 0),
          maximum: Math.max(0, derived.hitPoints ?? 0),
          reserved: 0,
          debt: 0,
          unit: "pv",
        },
      },
      energyPools: derived.energyPools,
      progression: {
        pendingChoices: pendingMessages,
        automaticGrants: [
          {
            id: "creation-attributes",
            sort: 0,
            status: "active",
            value:
              "Attributs de création calculés depuis l’Ascendance, le Profil, la Voie et le palier libre.",
            visibility: "owner",
          },
          {
            id: "creation-resources",
            sort: 1,
            status: "active",
            value:
              "PV et réserves naturelles calculés depuis les catalogues canoniques.",
            visibility: "owner",
          },
        ],
        historyRefs: [],
        mythicStars: 0,
      },
    },
  };
}

export function draftSelections(
  draft: CharacterCreationDraft,
): CatalogSelection[] {
  return [
    draft.body.ancestry,
    draft.profile.profile,
    draft.profile.origin,
    ...draft.profile.advantages,
    ...draft.profile.drawbacks,
    draft.path.path,
    draft.path.primarySpecialization,
    ...draft.path.secondarySpecializations,
    draft.talents.ancestryTalent,
    draft.talents.profileTalent,
    draft.talents.primaryTalent,
    ...draft.talents.secondaryTalents,
    draft.assignments.primaryPost,
    ...draft.assignments.secondaryPosts,
  ].filter((entry): entry is CatalogSelection => Boolean(entry));
}

export function initialPhysicalCredits(draft: CharacterCreationDraft): number {
  const ids = new Set(
    [...draft.profile.advantages, ...draft.profile.drawbacks].map(
      (entry) => entry.relisId,
    ),
  );
  if (ids.has("CRE-HCP-004-SANS-LE-SOU")) return 0;
  if (ids.has("CRE-AVT-016-TRES-RICHE")) return 150_000;
  if (ids.has("CRE-AVT-015-RICHE")) return 50_000;
  if (ids.has("CRE-HCP-003-TRES-PAUVRE")) return 1_250;
  if (ids.has("CRE-HCP-002-PAUVRE")) return 2_500;
  return 5_000;
}
