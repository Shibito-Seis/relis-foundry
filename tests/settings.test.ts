import { describe, expect, it } from "vitest";
import { SETTING_DEFINITIONS } from "../src/settings";

describe("registre gelé des Settings", () => {
  it("déclare exactement les 32 clés uniques de B11/B12", () => {
    expect(SETTING_DEFINITIONS).toHaveLength(32);
    expect(
      new Set(SETTING_DEFINITIONS.map((setting) => setting.key)).size,
    ).toBe(32);
  });

  it("conserve les quatre groupes de portée", () => {
    const counts = SETTING_DEFINITIONS.reduce<Record<string, number>>(
      (result, setting) => {
        result[setting.scope] = (result[setting.scope] ?? 0) + 1;
        return result;
      },
      {},
    );
    expect(counts).toEqual({ world: 16, user: 8, client: 8 });
  });
});
