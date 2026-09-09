export interface PlainResourcePool {
  key: string;
  current: number;
  maximum: number;
  reserved: number;
  debt: number;
  unit: string;
}

export function plainResourcePool(pool: any): PlainResourcePool {
  return {
    key: String(pool.key),
    current: Number(pool.current ?? 0),
    maximum: Number(pool.maximum ?? 0),
    reserved: Number(pool.reserved ?? 0),
    debt: Number(pool.debt ?? 0),
    unit: String(pool.unit ?? "count"),
  };
}

export function resourcePoolPresentation(key: string): {
  label: string;
  isDemo: boolean;
} {
  const normalized = key.trim().toLocaleLowerCase("fr");
  if (normalized === "ce") return { label: "CE — démo", isDemo: true };
  if (normalized === "mana") return { label: "Mana", isDemo: false };
  if (normalized === "prana") return { label: "Prana", isDemo: false };
  if (normalized === "flux") return { label: "Flux", isDemo: false };
  return {
    label: normalized.toLocaleUpperCase("fr"),
    isDemo: false,
  };
}

export function updateResourcePoolCurrent(
  pools: Iterable<any>,
  index: number,
  requested: number,
): PlainResourcePool[] {
  const updated = Array.from(pools, plainResourcePool);
  const pool = updated[index];
  if (!pool) return updated;
  const finite = Number.isFinite(requested) ? requested : 0;
  pool.current = Math.min(pool.maximum, Math.max(0, finite));
  return updated;
}
