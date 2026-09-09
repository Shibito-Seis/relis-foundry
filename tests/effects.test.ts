import { describe, expect, it } from "vitest";
import { formatRoundDuration, presentCondition } from "../src/rules/effects";

const translations: Record<string, string> = {
  "RELIS.Condition.calibrated.Name": "Calibré",
  "RELIS.Condition.calibrated.Description": "Réglage actif.",
};

const i18n = {
  localize: (key: string) => translations[key] ?? key,
  format: (key: string, data: Record<string, unknown>) =>
    key === "RELIS.Duration.OneRound"
      ? `${data.rounds} round`
      : `${data.rounds} rounds`,
};

describe("présentation des effets 10-C", () => {
  it("localise une condition connue", () => {
    expect(presentCondition("calibrated", i18n)).toEqual({
      label: "Calibré",
      description: "Réglage actif.",
    });
  });

  it("conserve une clé inconnue comme repli lisible", () => {
    expect(presentCondition("unknown", i18n)).toEqual({
      label: "unknown",
      description: "unknown",
    });
  });

  it("formate et borne les durées en rounds", () => {
    expect(formatRoundDuration(1, i18n)).toBe("1 round");
    expect(formatRoundDuration(2.1, i18n)).toBe("3 rounds");
    expect(formatRoundDuration(-2, i18n)).toBe("0 rounds");
  });
});
