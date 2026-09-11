import { beforeEach, describe, expect, it, vi } from "vitest";

class MockField {
  constructor(..._args: unknown[]) {}
}

class MockTypeDataModel {
  static defineSchema(): Record<string, unknown> {
    return {};
  }

  prepareDerivedData(): void {}
}

class MockActorSheetV2 {
  static DEFAULT_OPTIONS = {};
  static PARTS = {};
  async _prepareContext(): Promise<Record<string, unknown>> {
    return {};
  }
  async _onRender(): Promise<void> {}
}

class MockItemSheetV2 extends MockActorSheetV2 {}
class MockActor {}
class MockItem {}

describe("amorçage Foundry 10-C", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("enregistre modèles, Settings, feuilles et identités pendant init", async () => {
    const onceCallbacks = new Map<string, () => void>();
    const hookNames: string[] = [];
    const registeredSettings: string[] = [];
    const registeredSheets: string[] = [];

    (globalThis as any).Actor = MockActor;
    (globalThis as any).Item = MockItem;
    (globalThis as any).Hooks = {
      once: (name: string, callback: () => void) => {
        onceCallbacks.set(name, callback);
        return 1;
      },
      on: (name: string) => {
        hookNames.push(name);
        return 1;
      },
    };
    (globalThis as any).CONFIG = {
      Actor: { dataModels: {} },
      Item: { dataModels: {} },
      JournalEntryPage: { dataModels: {} },
      ActiveEffect: { dataModels: {} },
      Combat: { dataModels: {} },
      Combatant: { dataModels: {} },
      ChatMessage: { dataModels: {} },
    };
    (globalThis as any).foundry = {
      abstract: { TypeDataModel: MockTypeDataModel },
      data: {
        fields: {
          SchemaField: MockField,
          StringField: MockField,
          NumberField: MockField,
          BooleanField: MockField,
          HTMLField: MockField,
          ArrayField: MockField,
        },
      },
      applications: {
        api: { HandlebarsApplicationMixin: (Base: unknown) => Base },
        sheets: {
          ActorSheetV2: MockActorSheetV2,
          ItemSheetV2: MockItemSheetV2,
        },
      },
      documents: {
        collections: {
          Actors: { registerSheet: () => registeredSheets.push("Actor") },
          Items: { registerSheet: () => registeredSheets.push("Item") },
        },
      },
    };
    (globalThis as any).game = {
      settings: {
        register: (_namespace: string, key: string) =>
          registeredSettings.push(key),
      },
    };
    (globalThis as any).ui = { notifications: { info: vi.fn() } };

    await import("../src/relis");
    expect(onceCallbacks.has("init")).toBe(true);
    onceCallbacks.get("init")?.();

    const modelCount = [
      "Actor",
      "Item",
      "JournalEntryPage",
      "ActiveEffect",
      "Combat",
      "Combatant",
      "ChatMessage",
    ].reduce(
      (sum, documentName) =>
        sum +
        Object.keys((globalThis as any).CONFIG[documentName].dataModels).length,
      0,
    );
    expect(modelCount).toBe(64);
    const labelCount = [
      "Actor",
      "Item",
      "JournalEntryPage",
      "ActiveEffect",
      "Combat",
      "Combatant",
      "ChatMessage",
    ].reduce(
      (sum, documentName) =>
        sum +
        Object.keys((globalThis as any).CONFIG[documentName].typeLabels).length,
      0,
    );
    expect(labelCount).toBe(64);
    expect((globalThis as any).CONFIG.Actor.typeLabels.character).toBe(
      "TYPES.Actor.character",
    );
    expect(registeredSettings).toHaveLength(32);
    expect(registeredSheets).toEqual(["Actor", "Item"]);
    expect(hookNames).toHaveLength(10);
    expect((globalThis as any).CONFIG.Actor.documentClass.name).toBe(
      "RelisActor",
    );
    expect((globalThis as any).CONFIG.Item.documentClass.name).toBe(
      "RelisItem",
    );
    expect((globalThis as any).CONFIG.ActiveEffect.expiryAction).toBe("delete");
    expect(
      Object.keys(
        (
          globalThis as any
        ).CONFIG.ActiveEffect.dataModels.relisEffect.defineSchema(),
      ),
    ).toContain("changes");
    expect((globalThis as any).CONFIG.Actor.dataModels.npc.name).toBe(
      "NpcData",
    );
    expect(
      Object.keys(
        (globalThis as any).CONFIG.Actor.dataModels.character.defineSchema(),
      ),
    ).toEqual(
      expect.arrayContaining([
        "identity",
        "age",
        "bodies",
        "presentations",
        "health",
        "needs",
        "progression",
      ]),
    );
    expect(
      Object.keys(
        (globalThis as any).CONFIG.Actor.dataModels.npc.defineSchema(),
      ),
    ).toEqual(
      expect.arrayContaining([
        "identity",
        "bodies",
        "health",
        "detailLevel",
        "behavior",
      ]),
    );
    expect(
      (globalThis as any).CONFIG.Actor.trackableAttributes.npc.bar,
    ).toEqual(["derived.trackables.hitPoints"]);
    expect(
      Object.keys(
        (globalThis as any).CONFIG.Item.dataModels.ancestry.defineSchema(),
      ),
    ).toEqual(
      expect.arrayContaining([
        "meta",
        "description",
        "traits",
        "requirementRefs",
        "effectRefs",
        "permissions",
        "provenance",
      ]),
    );
    expect(
      Object.hasOwn(
        (globalThis as any).CONFIG.Item.dataModels.ancestry,
        "migrateData",
      ),
    ).toBe(false);
    expect(
      Object.keys(
        (globalThis as any).CONFIG.Item.dataModels.weapon.defineSchema(),
      ),
    ).toContain("physical");
    expect(
      Object.keys(
        (globalThis as any).CONFIG.Item.dataModels.ancestry.defineSchema(),
      ),
    ).not.toContain("physical");
  });
});
