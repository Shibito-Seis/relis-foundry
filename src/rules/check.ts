import { MASTERY_BONUSES, type MasteryRank } from "../config";

export const DEGREE_ORDER = [
  "criticalFailure",
  "failure",
  "success",
  "criticalSuccess",
] as const;
export type CheckDegree = (typeof DEGREE_ORDER)[number];

export interface CheckResolutionInput {
  natural: number;
  total: number;
  difficulty: number;
}

export interface CheckResolution extends CheckResolutionInput {
  baseDegree: CheckDegree;
  degree: CheckDegree;
}

export function masteryBonus(rank: string): number {
  return MASTERY_BONUSES[rank as MasteryRank] ?? 0;
}

export function shiftDegree(degree: CheckDegree, steps: number): CheckDegree {
  const current = DEGREE_ORDER.indexOf(degree);
  const shifted = Math.max(
    0,
    Math.min(DEGREE_ORDER.length - 1, current + steps),
  );
  return DEGREE_ORDER[shifted] ?? degree;
}

export function resolveCheck(input: CheckResolutionInput): CheckResolution {
  const { difficulty, natural, total } = input;
  let baseDegree: CheckDegree;

  if (total >= difficulty + 10) baseDegree = "criticalSuccess";
  else if (total >= difficulty) baseDegree = "success";
  else if (total <= difficulty - 10) baseDegree = "criticalFailure";
  else baseDegree = "failure";

  const naturalShift = natural === 20 ? 1 : natural === 1 ? -1 : 0;
  return {
    ...input,
    baseDegree,
    degree: shiftDegree(baseDegree, naturalShift),
  };
}

export function degreeLabel(degree: CheckDegree): string {
  return {
    criticalFailure: "Échec critique",
    failure: "Échec",
    success: "Réussite",
    criticalSuccess: "Réussite critique",
  }[degree];
}
