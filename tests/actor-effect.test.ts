import { beforeEach, describe, expect, it, vi } from "vitest";

class MockActor {
  name = "Personnage d’essai";
  type = "character";
  uuid = "Actor.demo";
  effects: any[] = [];
  createdEffects = 0;
  system = {
    attributes: { dexterity: { base: 2 } },
    skills: { shooting: { rank: "trained" } },
    energyPools: [],
  };

  async update(): Promise<this> {
    return this;
  }

  async createEmbeddedDocuments(
    documentName: string,
    data: Record<string, any>[],
  ): Promise<any[]> {
    expect(documentName).toBe("ActiveEffect");
    this.createdEffects += 1;
    const effect = {
      id: `effect-${this.createdEffects}`,
      ...data[0],
      update: vi.fn(async (change: Record<string, any>) => {
        Object.assign(effect, change);
        return effect;
      }),
    };
    this.effects.push(effect);
    return [effect];
  }

  async deleteEmbeddedDocuments(
    _documentName: string,
    ids: string[],
  ): Promise<any[]> {
    this.effects = this.effects.filter((effect) => !ids.includes(effect.id));
    return [];
  }
}

class MockRoll {
  total = 16;
  dice = [{ total: 12 }];

  async evaluate(): Promise<this> {
    return this;
  }
}

describe("effet temporaire de la tranche 10-C", () => {
  beforeEach(() => {
    vi.resetModules();
    (globalThis as any).Actor = MockActor;
    (globalThis as any).Roll = MockRoll;
    (globalThis as any).game = {
      combat: { round: 3, turn: 1 },
      time: { worldTime: 4200 },
      i18n: {
        localize: (key: string) =>
          key === "RELIS.Condition.calibrated.Name"
            ? "Calibré"
            : key === "RELIS.Condition.calibrated.Description"
              ? "Réglage actif."
              : key,
        format: (key: string, data: Record<string, unknown>) =>
          key === "RELIS.Duration.OneRound"
            ? `${data.rounds} round`
            : `${data.rounds} rounds`,
      },
    };
    (globalThis as any).ui = {
      notifications: { warn: vi.fn() },
    };
    (globalThis as any).foundry = {
      applications: {
        handlebars: {
          renderTemplate: vi.fn(async () => "<article />"),
        },
      },
    };
    (globalThis as any).ChatMessage = {
      implementation: { create: vi.fn(async () => ({})) },
      getSpeaker: vi.fn(() => ({})),
    };
  });

  it("rafraîchit le même effet de la même Action", async () => {
    const { RelisActor } = await import("../src/documents/actor");
    const actor = new RelisActor() as unknown as MockActor & {
      rollRelisCheck(options: Record<string, unknown>): Promise<void>;
    };
    const action = { uuid: "Actor.demo.Item.action" } as Item;
    const options = {
      attributeKey: "dexterity",
      skillKey: "shooting",
      difficulty: 15,
      label: "Tir calibré",
      effect: {
        conditionKey: "calibrated",
        intensity: 1,
        durationRounds: 1,
      },
      sourceItem: action,
    };

    await actor.rollRelisCheck(options);
    await actor.rollRelisCheck(options);

    expect(actor.effects).toHaveLength(1);
    expect(actor.createdEffects).toBe(1);
    expect(actor.effects[0].name).toBe("RE:LIS — Calibré");
    expect(actor.effects[0].system.changes).toEqual([]);
    expect(actor.effects[0].update).toHaveBeenCalledTimes(1);
    expect(actor.effects[0].duration).toMatchObject({
      rounds: 1,
      startRound: 3,
      startTurn: 1,
      startTime: 4200,
    });
    expect(
      (globalThis as any).foundry.applications.handlebars.renderTemplate,
    ).toHaveBeenCalledWith(
      "systems/relis/templates/chat/check-card.hbs",
      expect.objectContaining({ actorName: "Personnage d’essai" }),
    );
  });

  it("nettoie les doublons laissés par la version 0.1.1", async () => {
    const { RelisActor } = await import("../src/documents/actor");
    const actor = new RelisActor() as unknown as MockActor & {
      rollRelisCheck(options: Record<string, unknown>): Promise<void>;
    };
    const action = { uuid: "Actor.demo.Item.action" } as Item;
    const options = {
      attributeKey: "dexterity",
      skillKey: "shooting",
      difficulty: 15,
      label: "Tir calibré",
      effect: {
        conditionKey: "calibrated",
        intensity: 1,
        durationRounds: 1,
      },
      sourceItem: action,
    };

    await actor.rollRelisCheck(options);
    actor.effects.push({
      ...actor.effects[0],
      id: "legacy-duplicate",
      update: vi.fn(),
    });
    await actor.rollRelisCheck(options);

    expect(actor.effects.map((effect) => effect.id)).toEqual(["effect-1"]);
  });
});
