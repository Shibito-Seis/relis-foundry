/** Explicit catalogue mass wins; unknown mass is never silently zero. */
export function physicalUnitMass(p: Record<string, any>): number | null {
  if (p.massEach !== null && p.massEach !== undefined && p.massEach !== "") {
    const mass = Number(p.massEach);
    return Number.isFinite(mass) && mass >= 0 ? mass : null;
  }
  if (p.unit === "kg") return 1;
  if (p.unit === "g") return 0.001;
  if (p.equipmentProfile?.ordinaryLiquid === true) {
    if (p.unit === "l") return 1;
    if (p.unit === "ml") return 0.001;
  }
  return null;
}
