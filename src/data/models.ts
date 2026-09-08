import {
  ACTOR_TYPES,
  ATTRIBUTE_LABELS,
  CONTENT_VERSION,
  ITEM_TYPES,
  JOURNAL_PAGE_TYPES,
  RULES_VERSION,
  SCHEMA_VERSION,
  SKILL_DEFINITIONS,
} from "../config";
import { masteryBonus } from "../rules/check";

const fields = foundry.data.fields;

function metaField(): any {
  return new fields.SchemaField({
    schemaVersion: new fields.StringField({
      required: true,
      blank: false,
      initial: SCHEMA_VERSION,
    }),
    rulesVersion: new fields.StringField({
      required: true,
      blank: false,
      initial: RULES_VERSION,
    }),
    contentVersion: new fields.StringField({
      required: true,
      blank: false,
      initial: CONTENT_VERSION,
    }),
    relisId: new fields.StringField({
      required: true,
      blank: true,
      initial: "",
    }),
    revision: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      initial: 0,
    }),
    status: new fields.StringField({
      required: true,
      blank: false,
      initial: "draft",
    }),
  });
}

function attributeField(): any {
  return new fields.SchemaField({
    base: new fields.NumberField({
      required: true,
      integer: true,
      min: -5,
      max: 8,
      initial: 0,
    }),
    partial: new fields.BooleanField({ required: true, initial: false }),
  });
}

function skillField(defaultAttribute: string): any {
  return new fields.SchemaField({
    rank: new fields.StringField({
      required: true,
      blank: false,
      initial: "untrained",
    }),
    defaultAttribute: new fields.StringField({
      required: true,
      blank: false,
      initial: defaultAttribute,
    }),
    favorite: new fields.BooleanField({ required: true, initial: false }),
  });
}

function resourcePoolField(): any {
  return new fields.SchemaField({
    key: new fields.StringField({ required: true, blank: false }),
    current: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    maximum: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    reserved: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    debt: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    unit: new fields.StringField({
      required: true,
      blank: false,
      initial: "count",
    }),
  });
}

export class ReservedData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, any> {
    return {
      meta: metaField(),
      description: new fields.HTMLField({
        required: true,
        blank: true,
        initial: "",
      }),
    };
  }
}

export class CharacterData extends ReservedData {
  declare derived: Record<string, any>;

  static defineSchema(): Record<string, any> {
    const attributes = Object.fromEntries(
      Object.keys(ATTRIBUTE_LABELS).map((key) => [key, attributeField()]),
    );
    const skills = Object.fromEntries(
      Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => [
        key,
        skillField(definition[1]),
      ]),
    );

    return {
      ...super.defineSchema(),
      identity: new fields.SchemaField({
        primaryName: new fields.StringField({
          required: true,
          blank: true,
          initial: "",
        }),
        publicName: new fields.StringField({
          required: true,
          blank: true,
          initial: "",
        }),
        biography: new fields.HTMLField({
          required: true,
          blank: true,
          initial: "",
        }),
        memory: new fields.HTMLField({
          required: true,
          blank: true,
          initial: "",
        }),
      }),
      level: new fields.NumberField({
        required: true,
        integer: true,
        min: 1,
        max: 30,
        initial: 1,
      }),
      attributes: new fields.SchemaField(attributes),
      skills: new fields.SchemaField(skills),
      health: new fields.SchemaField({
        hitPoints: new fields.SchemaField({
          current: new fields.NumberField({
            required: true,
            integer: true,
            min: 0,
            initial: 10,
          }),
          maximum: new fields.NumberField({
            required: true,
            integer: true,
            min: 1,
            initial: 10,
          }),
        }),
      }),
      energyPools: new fields.ArrayField(resourcePoolField(), {
        required: true,
        initial: [],
      }),
    };
  }

  prepareDerivedData(): void {
    super.prepareDerivedData();
    const attributes = Object.fromEntries(
      Object.entries(this.attributes).map(([key, score]: [string, any]) => [
        key,
        Number(score.base ?? 0),
      ]),
    );
    const skills = Object.fromEntries(
      Object.entries(this.skills).map(([key, score]: [string, any]) => [
        key,
        {
          masteryBonus: masteryBonus(String(score.rank)),
          total: masteryBonus(String(score.rank)),
        },
      ]),
    );
    const maximum = Math.max(1, Number(this.health.hitPoints.maximum ?? 1));
    const value = Math.max(
      0,
      Math.min(maximum, Number(this.health.hitPoints.current ?? 0)),
    );

    this.derived = {
      attributes,
      skills,
      trackables: {
        hitPoints: { value, max: maximum },
      },
    };
  }
}

export class ActionData extends ReservedData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      test: new fields.SchemaField({
        attributeKey: new fields.StringField({
          required: true,
          blank: false,
          initial: "dexterity",
        }),
        skillKey: new fields.StringField({
          required: true,
          blank: false,
          initial: "shooting",
        }),
        difficulty: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 15,
        }),
        resourceKey: new fields.StringField({
          required: true,
          blank: true,
          initial: "",
        }),
        cost: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
      }),
      effect: new fields.SchemaField({
        conditionKey: new fields.StringField({
          required: true,
          blank: true,
          initial: "",
        }),
        intensity: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 1,
        }),
        durationRounds: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 1,
        }),
      }),
    };
  }
}

export class EquipmentData extends ReservedData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      physical: new fields.SchemaField({
        quantity: new fields.NumberField({
          required: true,
          min: 0,
          initial: 1,
        }),
        massEach: new fields.NumberField({
          required: true,
          min: 0,
          initial: 0,
        }),
        bulkEach: new fields.NumberField({
          required: true,
          min: 0,
          initial: 0,
        }),
        equipState: new fields.StringField({
          required: true,
          blank: false,
          initial: "stored",
        }),
        condition: new fields.StringField({
          required: true,
          blank: false,
          initial: "intact",
        }),
      }),
    };
  }
}

export class RelisEffectData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, any> {
    return {
      meta: metaField(),
      sourceRef: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      conditionKey: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      intensity: new fields.NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 1,
      }),
      visibility: new fields.StringField({
        required: true,
        blank: false,
        initial: "document",
      }),
    };
  }
}

export class RelisCombatData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, any> {
    return {
      meta: metaField(),
      encounterGroupId: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      state: new fields.StringField({
        required: true,
        blank: false,
        initial: "preparing",
      }),
    };
  }
}

export class RelisParticipantData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, any> {
    return {
      meta: metaField(),
      presenceId: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      bodyId: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      actionsSpent: new fields.NumberField({
        required: true,
        integer: true,
        min: 0,
        initial: 0,
      }),
      reactionState: new fields.StringField({
        required: true,
        blank: false,
        initial: "available",
      }),
    };
  }
}

export class RelisCardData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, any> {
    return {
      meta: metaField(),
      cardId: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      family: new fields.StringField({
        required: true,
        blank: false,
        initial: "check",
      }),
      rulesVersion: new fields.StringField({
        required: true,
        blank: false,
        initial: RULES_VERSION,
      }),
      degree: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
      }),
      rollBreakdown: new fields.ArrayField(new fields.StringField(), {
        required: true,
        initial: [],
      }),
    };
  }
}

export function registerDataModels(): void {
  for (const type of ACTOR_TYPES)
    CONFIG.Actor.dataModels[type] =
      type === "character" ? CharacterData : ReservedData;
  for (const type of ITEM_TYPES) {
    CONFIG.Item.dataModels[type] =
      type === "action"
        ? ActionData
        : type === "equipment"
          ? EquipmentData
          : ReservedData;
  }
  for (const type of JOURNAL_PAGE_TYPES)
    CONFIG.JournalEntryPage.dataModels[type] = ReservedData;
  CONFIG.ActiveEffect.dataModels.relisEffect = RelisEffectData;
  for (const type of ["personal", "spatial", "crisis"])
    CONFIG.Combat.dataModels[type] = RelisCombatData;
  CONFIG.Combatant.dataModels.participant = RelisParticipantData;
  CONFIG.ChatMessage.dataModels.relisCard = RelisCardData;

  CONFIG.Actor.trackableAttributes = Object.fromEntries(
    ACTOR_TYPES.map((type) => [
      type,
      type === "character"
        ? { bar: ["derived.trackables.hitPoints"], value: ["level"] }
        : { bar: [], value: [] },
    ]),
  );
}
