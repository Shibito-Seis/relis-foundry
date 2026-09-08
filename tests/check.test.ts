import { describe, expect, it } from "vitest";
import { masteryBonus, resolveCheck, shiftDegree } from "../src/rules/check";

describe("quatre degrés de résultat", () => {
  it("résout les quatre seuils par rapport au DD", () => {
    expect(
      resolveCheck({ natural: 10, total: 25, difficulty: 15 }).degree,
    ).toBe("criticalSuccess");
    expect(
      resolveCheck({ natural: 10, total: 15, difficulty: 15 }).degree,
    ).toBe("success");
    expect(
      resolveCheck({ natural: 10, total: 14, difficulty: 15 }).degree,
    ).toBe("failure");
    expect(resolveCheck({ natural: 10, total: 5, difficulty: 15 }).degree).toBe(
      "criticalFailure",
    );
  });

  it("améliore un 20 naturel et dégrade un 1 naturel d’un cran", () => {
    expect(
      resolveCheck({ natural: 20, total: 14, difficulty: 15 }).degree,
    ).toBe("success");
    expect(resolveCheck({ natural: 1, total: 15, difficulty: 15 }).degree).toBe(
      "failure",
    );
  });

  it("borne le déplacement de degré", () => {
    expect(shiftDegree("criticalSuccess", 1)).toBe("criticalSuccess");
    expect(shiftDegree("criticalFailure", -1)).toBe("criticalFailure");
  });
});

describe("maîtrises", () => {
  it("applique la table canonique", () => {
    expect(
      ["untrained", "trained", "expert", "master", "legendary", "mythic"].map(
        masteryBonus,
      ),
    ).toEqual([0, 2, 4, 6, 8, 12]);
  });

  it("neutralise un rang inconnu", () => {
    expect(masteryBonus("inconnu")).toBe(0);
  });
});
