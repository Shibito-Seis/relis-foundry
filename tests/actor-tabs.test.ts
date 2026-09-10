import { describe, expect, it } from "vitest";

import {
  CHARACTER_TABS,
  NPC_TABS,
  actorTabsForType,
  normalizeActorTab,
} from "../src/ui/actor-tabs";

describe("navigation des fiches 10-D1", () => {
  it("fige les huit onglets du Personnage dans l’ordre validé", () => {
    expect(CHARACTER_TABS.map((tab) => tab.id)).toEqual([
      "summary",
      "identity",
      "attributes",
      "progression",
      "capabilities",
      "inventory",
      "health",
      "relations",
    ]);
    expect(new Set(CHARACTER_TABS.map((tab) => tab.id)).size).toBe(8);
  });

  it("réserve au PNJ une navigation condensée en six onglets", () => {
    expect(actorTabsForType("npc")).toBe(NPC_TABS);
    expect(NPC_TABS.map((tab) => tab.id)).toEqual([
      "summary",
      "identity",
      "mechanics",
      "capabilities",
      "health",
      "relations",
    ]);
  });

  it("adapte le nombre d’onglets à la densité PNJ sans changer les données", () => {
    expect(actorTabsForType("npc", "condensed").map((tab) => tab.id)).toEqual([
      "summary",
      "identity",
      "capabilities",
    ]);
    expect(actorTabsForType("npc", "standard").map((tab) => tab.id)).toEqual([
      "summary",
      "identity",
      "mechanics",
      "capabilities",
      "health",
    ]);
    expect(actorTabsForType("npc", "complete")).toBe(NPC_TABS);
  });

  it("ramène toute cible inconnue vers la Synthèse du type concerné", () => {
    expect(normalizeActorTab("character", "inventory")).toBe("inventory");
    expect(normalizeActorTab("npc", "attributes")).toBe("summary");
    expect(normalizeActorTab("character", undefined)).toBe("summary");
    expect(normalizeActorTab("npc", "relations", "standard")).toBe("summary");
  });
});
