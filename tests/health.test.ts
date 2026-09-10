import { describe, expect, it } from "vitest";
import {
  clampHitPoints,
  constrainHitPointUpdate,
  constrainStressUpdate,
} from "../src/rules/health";

describe("intégrité des points de vie", () => {
  it("borne les PV actuels entre zéro et le maximum", () => {
    expect(clampHitPoints(75, 60)).toEqual({ current: 60, maximum: 60 });
    expect(clampHitPoints(-3, 60)).toEqual({ current: 0, maximum: 60 });
  });

  it("réduit les PV actuels lorsque le maximum diminue", () => {
    const change = { "system.health.hitPoints.maximum": 40 };
    constrainHitPointUpdate({ current: 50, maximum: 60 }, change);
    expect(change).toEqual({
      "system.health.hitPoints.maximum": 40,
      "system.health.hitPoints.current": 40,
    });
  });

  it("accepte aussi les mises à jour Foundry imbriquées", () => {
    const change = {
      system: { health: { hitPoints: { current: 90, maximum: 70 } } },
    };
    constrainHitPointUpdate({ current: 10, maximum: 10 }, change);
    expect(change.system.health.hitPoints).toEqual({
      current: 70,
      maximum: 70,
    });
  });

  it("borne le Stress au maximum dérivé du personnage ou du PNJ", () => {
    const change = { "system.health.stress.current": 40 };
    constrainStressUpdate(3, 14, change);
    expect(change["system.health.stress.current"]).toBe(14);
  });
});
