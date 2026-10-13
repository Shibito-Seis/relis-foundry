export const TALENT_ACTIVATION_KINDS = [
  "passive",
  "freeAction",
  "reaction",
  "oneAction",
  "twoActions",
  "threeActions",
  "activity",
] as const;

export interface ProjectedTalentAction {
  sourceId: string;
  sourceName: string;
  specializationId: string;
  activation: Record<string, unknown>;
  ruleElements: Array<Record<string, unknown>>;
}

export interface ProjectedTalentPassive {
  sourceId: string;
  sourceName: string;
  specializationId: string;
  ruleElements: Array<Record<string, unknown>>;
}

export interface TalentProjection {
  action: ProjectedTalentAction | null;
  passive: ProjectedTalentPassive | null;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) && value.every(isRecord) ? value : [];
}

/**
 * Projects a Talent owned by an Actor into its usable Action or passive rule.
 * The Talent remains the only stored Item: projection never creates a second
 * embedded Action Item and therefore cannot duplicate provenance or effects.
 */
export function projectOwnedSpecializationTalent(
  item: Record<string, any>,
): TalentProjection | null {
  const catalog = item?.system?.catalog;
  if (item?.type !== "talent" || catalog?.kind !== "talent-specialization")
    return null;
  const projection = catalog.projection;
  const activation = catalog.activation;
  const specializationId = String(catalog.specializationRef?.relisId ?? "");
  const sourceId = String(
    item.id ?? item._id ?? item.system?.meta?.relisId ?? item.relisId ?? "",
  );
  if (
    !isRecord(projection) ||
    projection.automaticWhenOwned !== true ||
    projection.duplicateItem !== false ||
    projection.source !== "ownedTalent" ||
    !isRecord(activation) ||
    !TALENT_ACTIVATION_KINDS.includes(activation.kind)
  )
    return null;
  const ruleElements = recordArray(catalog.ruleElements);
  const sourceName = String(item.name ?? "Talent sans nom");

  if (projection.target === "actions" && activation.kind !== "passive")
    return {
      action: {
        sourceId,
        sourceName,
        specializationId,
        activation,
        ruleElements,
      },
      passive: null,
    };
  if (projection.target === "passiveRules" && activation.kind === "passive")
    return {
      action: null,
      passive: {
        sourceId,
        sourceName,
        specializationId,
        ruleElements,
      },
    };
  return null;
}

export function collectOwnedTalentProjections(
  items: Array<Record<string, any>>,
): {
  actions: ProjectedTalentAction[];
  passives: ProjectedTalentPassive[];
} {
  const actions: ProjectedTalentAction[] = [];
  const passives: ProjectedTalentPassive[] = [];
  for (const item of items) {
    const projection = projectOwnedSpecializationTalent(item);
    if (projection?.action) actions.push(projection.action);
    if (projection?.passive) passives.push(projection.passive);
  }
  return { actions, passives };
}
