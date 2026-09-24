import { describe, expect, it } from "vitest";
import {
  attunementHistoryEntry,
  canAnswerAttunement,
  canManageAttunement,
  resolveAttunement,
  selectAttunementQuestions,
  type AttunementContract,
} from "../src/rules/crystal-attunement";

const axisIds = ["guard", "drive", "insight", "harmony", "creation", "freedom"];

function contract(weights: Record<string, number>): AttunementContract {
  const dominant = axisIds.map((axis) => ({
    id: `${axis}-dominant`,
    label: axis,
    hex: "#000000",
    kind: "dominant" as const,
    axes: [axis],
    meaning: axis,
  }));
  return {
    contentVersion: "1.1.0",
    name: "Recette",
    axes: axisIds.map((id) => ({ id, label: id, description: id })),
    palette: [
      ...dominant,
      {
        id: "sapphire",
        label: "Saphir",
        hex: "#3156D9",
        kind: "conjunction",
        axes: ["guard", "insight"],
        meaning: "Vigilance lucide.",
      },
      {
        id: "opal-white",
        label: "Blanc opalin",
        hex: "#F3F0FF",
        kind: "equilibrium",
        axes: ["guard", "creation"],
        meaning: "Préserver et transformer.",
      },
    ],
    questions: [
      {
        id: "situation",
        prompt: "Choix",
        options: [{ id: "answer", label: "Réponse", weights }],
      },
    ],
    tieBreaker: {
      prompt: "Départage",
      showOnlyTiedAxes: true,
      options: axisIds.map((axis) => ({ axis, label: axis })),
    },
  };
}

describe("accord d’un Cœur d’Écarlithe", () => {
  it.each([
    [{ guard: 2, insight: 1 }, "guard-dominant"],
    [{ guard: 2, insight: 2 }, "sapphire"],
    [{ guard: 2, creation: 2 }, "opal-white"],
  ])("résout les dominantes et paires canoniques", (weights, colorId) => {
    const result = resolveAttunement(contract(weights), {
      situation: "answer",
    });
    expect(result.color?.id).toBe(colorId);
    expect(result.needsTieBreaker).toBe(false);
  });

  it("exige un départage borné pour une égalité non cartographiée", () => {
    const source = contract({ guard: 2, drive: 2, insight: 2 });
    expect(
      resolveAttunement(source, { situation: "answer" }).needsTieBreaker,
    ).toBe(true);
    const resolved = resolveAttunement(
      source,
      { situation: "answer" },
      "drive",
    );
    expect(resolved.color?.id).toBe("drive-dominant");
    expect(resolved.needsTieBreaker).toBe(false);
  });

  it("refuse une réponse absente ou inconnue", () => {
    expect(() => resolveAttunement(contract({ guard: 2 }), {})).toThrow(
      /Réponse absente ou invalide/,
    );
  });

  it("réserve le PNJ au MJ et autorise le propriétaire d’un PJ", () => {
    expect(
      canAnswerAttunement(
        { isOwner: true, parent: { type: "character" } },
        false,
      ),
    ).toBe(true);
    expect(
      canAnswerAttunement({ isOwner: true, parent: { type: "npc" } }, false),
    ).toBe(false);
    expect(
      canAnswerAttunement({ isOwner: false, parent: { type: "npc" } }, true),
    ).toBe(true);
    expect(canManageAttunement({ parent: {} }, false)).toBe(false);
    expect(canManageAttunement({ parent: {} }, true)).toBe(true);
  });

  it("fige un instantané indépendant dans l’historique", () => {
    const previous = {
      state: "attuned",
      answers: { situation: "answer" },
      scores: { guard: 2 },
      axisIds: ["guard"],
      colorId: "azure",
    };
    const snapshot = attunementHistoryEntry(
      "reset",
      previous,
      "2026-09-24T00:00:00.000Z",
    );
    previous.answers.situation = "changed";
    previous.axisIds.push("drive");
    expect(snapshot.answers).toEqual({ situation: "answer" });
    expect(snapshot.axisIds).toEqual(["guard"]);
  });

  it("tire un questionnaire stable de 20 situations équilibrées", () => {
    const source = contract({ guard: 2 });
    source.questionSelection = {
      count: 20,
      difficultyCounts: { simple: 8, intermediate: 8, complex: 4 },
      stableForItem: true,
    };
    source.questions = [
      ...Array.from({ length: 16 }, (_, index) => ({
        ...source.questions[0]!,
        id: `simple-${index}`,
        difficulty: "simple" as const,
      })),
      ...Array.from({ length: 16 }, (_, index) => ({
        ...source.questions[0]!,
        id: `intermediate-${index}`,
        difficulty: "intermediate" as const,
      })),
      ...Array.from({ length: 16 }, (_, index) => ({
        ...source.questions[0]!,
        id: `complex-${index}`,
        difficulty: "complex" as const,
      })),
    ];
    const first = selectAttunementQuestions(source, "Item.stable");
    const second = selectAttunementQuestions(source, "Item.stable");
    expect(first.map(({ id }) => id)).toEqual(second.map(({ id }) => id));
    expect(first).toHaveLength(20);
    expect(
      first.reduce<Record<string, number>>((counts, question) => {
        counts[question.difficulty!] = (counts[question.difficulty!] ?? 0) + 1;
        return counts;
      }, {}),
    ).toEqual({ simple: 8, intermediate: 8, complex: 4 });
  });
});
