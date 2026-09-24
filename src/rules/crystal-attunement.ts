export interface AttunementAxis {
  id: string;
  label: string;
  description: string;
}

export interface AttunementColor {
  id: string;
  label: string;
  hex: string;
  kind: "dominant" | "conjunction" | "equilibrium";
  axes: string[];
  meaning: string;
}

export interface AttunementOption {
  id: string;
  label: string;
  weights: Record<string, number>;
}

export interface AttunementQuestion {
  id: string;
  prompt: string;
  difficulty?: "simple" | "intermediate" | "complex";
  options: AttunementOption[];
}

export interface AttunementContract {
  contentVersion: string;
  name: string;
  axes: AttunementAxis[];
  palette: AttunementColor[];
  questions: AttunementQuestion[];
  questionSelection?: {
    count: number;
    difficultyCounts: Record<"simple" | "intermediate" | "complex", number>;
    stableForItem: boolean;
  };
  tieBreaker: {
    prompt: string;
    showOnlyTiedAxes: boolean;
    options: Array<{ axis: string; label: string }>;
  };
}

export interface AttunementResolution {
  answers: Record<string, string>;
  scores: Record<string, number>;
  topAxes: string[];
  color: AttunementColor | null;
  needsTieBreaker: boolean;
}

export const ATTUNEMENT_CONTRACT_URL =
  "systems/relis/content/personal/crystal-attunement.json";

let cachedContract: AttunementContract | null = null;

function stringSeed(value: string): number {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shuffled<T>(values: T[], seedText: string): T[] {
  let seed = stringSeed(seedText) || 1;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4_294_967_296;
  };
  const output = [...values];
  for (let index = output.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1));
    const current = output[index]!;
    output[index] = output[selected]!;
    output[selected] = current;
  }
  return output;
}

export function selectAttunementQuestions(
  contract: AttunementContract,
  itemSeed: string,
): AttunementQuestion[] {
  const policy = contract.questionSelection;
  if (!policy) return [...contract.questions];
  const selected = Object.entries(policy.difficultyCounts).flatMap(
    ([difficulty, count]) =>
      shuffled(
        contract.questions.filter(
          (question) => question.difficulty === difficulty,
        ),
        `${contract.contentVersion}:${itemSeed}:${difficulty}`,
      ).slice(0, count),
  );
  return shuffled(
    selected,
    `${contract.contentVersion}:${itemSeed}:presentation`,
  ).slice(0, policy.count);
}

export function attunementSessionContract(
  contract: AttunementContract,
  itemSeed: string,
): AttunementContract {
  return {
    ...contract,
    questions: selectAttunementQuestions(contract, itemSeed),
  };
}

export async function loadAttunementContract(): Promise<AttunementContract> {
  if (cachedContract) return cachedContract;
  const response = await fetch(ATTUNEMENT_CONTRACT_URL);
  if (!response.ok)
    throw new Error(
      `Questionnaire d’Écarlithe indisponible (${response.status}).`,
    );
  cachedContract = (await response.json()) as AttunementContract;
  return cachedContract;
}

export function clearAttunementContractCache(): void {
  cachedContract = null;
}

function axesKey(axes: string[]): string {
  return [...axes].sort().join("+");
}

export function resolveAttunement(
  contract: AttunementContract,
  answers: Record<string, string>,
  tieAxis = "",
): AttunementResolution {
  const scores = Object.fromEntries(contract.axes.map(({ id }) => [id, 0]));
  for (const question of contract.questions) {
    const answerId = answers[question.id];
    const option = question.options.find(({ id }) => id === answerId);
    if (!option)
      throw new Error(`Réponse absente ou invalide : ${question.prompt}`);
    for (const [axis, weight] of Object.entries(option.weights)) {
      if (!Object.hasOwn(scores, axis))
        throw new Error(`Axe inconnu dans le questionnaire : ${axis}`);
      scores[axis] = Number(scores[axis]) + Number(weight);
    }
  }
  const maximum = Math.max(...Object.values(scores));
  const topAxes = contract.axes
    .map(({ id }) => id)
    .filter((axis) => scores[axis] === maximum);
  const mapped = contract.palette.find(
    ({ axes }) => axesKey(axes) === axesKey(topAxes),
  );
  if (mapped)
    return {
      answers: { ...answers },
      scores,
      topAxes,
      color: mapped,
      needsTieBreaker: false,
    };
  const selectedAxis = topAxes.includes(tieAxis) ? tieAxis : "";
  const dominant = selectedAxis
    ? contract.palette.find(
        ({ kind, axes }) => kind === "dominant" && axes[0] === selectedAxis,
      )
    : null;
  return {
    answers: { ...answers },
    scores,
    topAxes,
    color: dominant ?? null,
    needsTieBreaker: !dominant,
  };
}

export function canAnswerAttunement(
  item: { isOwner?: boolean; parent?: { type?: string } | null },
  isGM: boolean,
): boolean {
  if (!item.parent) return false;
  if (isGM) return true;
  return Boolean(item.isOwner && item.parent.type === "character");
}

export function canManageAttunement(
  item: { parent?: unknown },
  isGM: boolean,
): boolean {
  return Boolean(isGM && item.parent);
}

export function attunementHistoryEntry(
  operation: "answer" | "override" | "reset",
  previous: Record<string, unknown>,
  changedAt: string,
): Record<string, unknown> {
  return {
    operation,
    changedAt,
    state: String(previous.state ?? "unattuned"),
    questionnaireVersion: String(previous.questionnaireVersion ?? ""),
    answers: { ...(previous.answers as Record<string, unknown> | undefined) },
    scores: { ...(previous.scores as Record<string, unknown> | undefined) },
    colorId: String(previous.colorId ?? ""),
    axisIds: Array.from(
      (previous.axisIds as string[] | undefined) ?? [],
      String,
    ),
    subjectUuid: String(previous.subjectUuid ?? ""),
    subjectName: String(previous.subjectName ?? ""),
    completedAt: String(previous.completedAt ?? ""),
  };
}
