import { describe, expect, it } from "vitest";

import {
  resourcePoolPresentation,
  updateResourcePoolCurrent,
} from "../src/rules/resources";

describe("réserves de la fiche 10-D1", () => {
  const pools = [
    {
      key: "ce",
      current: 0,
      maximum: 3,
      reserved: 0,
      debt: 0,
      unit: "test",
    },
  ];

  it("distingue explicitement la CE de démonstration", () => {
    expect(resourcePoolPresentation("ce")).toEqual({
      label: "CE — démo",
      isDemo: true,
    });
    expect(resourcePoolPresentation("mana")).toEqual({
      label: "Mana",
      isDemo: false,
    });
  });

  it("remplace la collection complète pour rendre la modification persistante", () => {
    const updated = updateResourcePoolCurrent(pools, 0, 2);

    expect(updated).not.toBe(pools);
    expect(updated[0]?.current).toBe(2);
    expect(pools[0]?.current).toBe(0);
  });

  it("borne la valeur actuelle entre zéro et le maximum", () => {
    expect(updateResourcePoolCurrent(pools, 0, 12)[0]?.current).toBe(3);
    expect(updateResourcePoolCurrent(pools, 0, -2)[0]?.current).toBe(0);
  });
});
