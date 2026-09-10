export interface HitPoints {
  current: number;
  maximum: number;
}

const CURRENT_PATH = "system.health.hitPoints.current";
const MAXIMUM_PATH = "system.health.hitPoints.maximum";
const STRESS_CURRENT_PATH = "system.health.stress.current";

function finiteInteger(value: unknown, fallback: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : fallback;
}

function readPath(source: Record<string, any>, path: string): unknown {
  if (Object.hasOwn(source, path)) return source[path];
  return path.split(".").reduce<any>((value, key) => value?.[key], source);
}

function hasPath(source: Record<string, any>, path: string): boolean {
  if (Object.hasOwn(source, path)) return true;
  const keys = path.split(".");
  let value: any = source;
  for (const key of keys) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.hasOwn(value, key)
    )
      return false;
    value = value[key];
  }
  return true;
}

function writePath(
  source: Record<string, any>,
  path: string,
  value: number,
): void {
  const flatUpdate = Object.keys(source).some((key) => key.includes("."));
  if (flatUpdate) {
    source[path] = value;
    return;
  }

  const keys = path.split(".");
  let target: Record<string, any> = source;
  for (const key of keys.slice(0, -1)) {
    const child = target[key];
    if (child === null || typeof child !== "object" || Array.isArray(child))
      target[key] = {};
    target = target[key];
  }
  target[keys.at(-1) ?? path] = value;
}

export function clampHitPoints(current: unknown, maximum: unknown): HitPoints {
  const safeMaximum = Math.max(1, finiteInteger(maximum, 1));
  const safeCurrent = Math.max(
    0,
    Math.min(safeMaximum, finiteInteger(current, 0)),
  );
  return { current: safeCurrent, maximum: safeMaximum };
}

export function constrainHitPointUpdate(
  existing: HitPoints,
  change: Record<string, any>,
): void {
  const currentChanged = hasPath(change, CURRENT_PATH);
  const maximumChanged = hasPath(change, MAXIMUM_PATH);
  if (!currentChanged && !maximumChanged) return;

  const next = clampHitPoints(
    currentChanged ? readPath(change, CURRENT_PATH) : existing.current,
    maximumChanged ? readPath(change, MAXIMUM_PATH) : existing.maximum,
  );

  if (maximumChanged) writePath(change, MAXIMUM_PATH, next.maximum);
  if (currentChanged || next.current !== existing.current)
    writePath(change, CURRENT_PATH, next.current);
}

export function constrainStressUpdate(
  existingCurrent: number,
  maximum: number,
  change: Record<string, any>,
): void {
  if (!hasPath(change, STRESS_CURRENT_PATH)) return;
  const safeMaximum = Math.max(0, finiteInteger(maximum, 0));
  const nextCurrent = Math.max(
    0,
    Math.min(
      safeMaximum,
      finiteInteger(readPath(change, STRESS_CURRENT_PATH), existingCurrent),
    ),
  );
  writePath(change, STRESS_CURRENT_PATH, nextCurrent);
}
