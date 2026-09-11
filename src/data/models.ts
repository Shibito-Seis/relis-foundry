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
import { clampHitPoints } from "../rules/health";
import {
  initialBody,
  initialPresentation,
  normalizePersonSource,
} from "./person-defaults";
import {
  ActionData,
  EquipmentData,
  PhysicalItemData,
  RelisItemData,
} from "./item-models";
import { isPhysicalItemType } from "./item-defaults";

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
    modifiers: new fields.ArrayField(modifierField(), {
      required: true,
      initial: [],
    }),
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
    modifiers: new fields.ArrayField(modifierField(), {
      required: true,
      initial: [],
    }),
  });
}

function optionalStringField(initial = ""): any {
  return new fields.StringField({ required: true, blank: true, initial });
}

function modifierField(): any {
  return new fields.SchemaField({
    id: optionalStringField(),
    sourceRef: optionalStringField(),
    value: new fields.NumberField({ required: true, initial: 0 }),
    mode: new fields.StringField({
      required: true,
      blank: false,
      initial: "add",
    }),
    priority: new fields.NumberField({
      required: true,
      integer: true,
      initial: 0,
    }),
    conditionKey: optionalStringField(),
    enabled: new fields.BooleanField({ required: true, initial: true }),
    labelKey: optionalStringField(),
  });
}

function stableTextEntryField(): any {
  return new fields.SchemaField({
    id: optionalStringField(),
    sort: new fields.NumberField({
      required: true,
      integer: true,
      initial: 0,
    }),
    status: new fields.StringField({
      required: true,
      blank: false,
      initial: "active",
    }),
    value: optionalStringField(),
    visibility: new fields.StringField({
      required: true,
      blank: false,
      initial: "owner",
    }),
  });
}

function referenceField(): any {
  return new fields.SchemaField({
    relisId: optionalStringField(),
    uuid: optionalStringField(),
    documentName: optionalStringField(),
    type: optionalStringField(),
    state: new fields.StringField({
      required: true,
      blank: false,
      initial: "unresolved",
    }),
    labelSnapshot: optionalStringField(),
    missingPolicy: new fields.StringField({
      required: true,
      blank: false,
      initial: "diagnose",
    }),
  });
}

function referenceArrayField(): any {
  return new fields.ArrayField(referenceField(), {
    required: true,
    initial: [],
  });
}

function measurementField(unit = "count"): any {
  return new fields.SchemaField({
    value: new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
    }),
    unit: new fields.StringField({
      required: true,
      blank: false,
      initial: unit,
    }),
    precision: new fields.StringField({
      required: true,
      blank: false,
      initial: "exact",
    }),
    minimum: new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
    }),
    maximum: new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
    }),
  });
}

function fictionStampField(): any {
  return new fields.SchemaField({
    worldTime: new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
    }),
    calendarId: optionalStringField(),
    displayOverride: optionalStringField(),
    precision: new fields.StringField({
      required: true,
      blank: false,
      initial: "exact",
    }),
  });
}

function mediaRefField(kind = "image"): any {
  return new fields.SchemaField({
    path: optionalStringField(),
    kind: new fields.StringField({
      required: true,
      blank: false,
      initial: kind,
    }),
    alt: optionalStringField(),
    caption: optionalStringField(),
    source: optionalStringField(),
    visibility: new fields.StringField({
      required: true,
      blank: false,
      initial: "document",
    }),
  });
}

function resourcePoolField(
  key = "resource",
  current = 0,
  maximum = 0,
  unit = "count",
): any {
  return new fields.SchemaField({
    key: new fields.StringField({
      required: true,
      blank: false,
      initial: key,
    }),
    current: new fields.NumberField({
      required: true,
      min: 0,
      initial: current,
    }),
    maximum: new fields.NumberField({
      required: true,
      min: 0,
      initial: maximum,
    }),
    reserved: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    debt: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    unit: new fields.StringField({
      required: true,
      blank: false,
      initial: unit,
    }),
  });
}

function healthField(): any {
  return new fields.SchemaField({
    hitPoints: resourcePoolField("hitPoints", 10, 10, "pv"),
    stress: resourcePoolField("stress", 0, 10, "points"),
    fatigue: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      max: 5,
      initial: 0,
    }),
    agony: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      initial: 0,
    }),
    stability: new fields.StringField({
      required: true,
      blank: false,
      initial: "stable",
    }),
    overexertion: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      initial: 0,
    }),
    backlash: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      initial: 0,
    }),
    injuryRefs: referenceArrayField(),
    conditionRefs: referenceArrayField(),
    medicalRecordRefs: referenceArrayField(),
  });
}

function identityField(): any {
  return new fields.SchemaField({
    primaryName: optionalStringField(),
    publicName: optionalStringField(),
    pronouns: optionalStringField(),
    gender: optionalStringField(),
    callsign: optionalStringField(),
    aliases: new fields.ArrayField(stableTextEntryField(), {
      required: true,
      initial: [],
    }),
    languages: referenceArrayField(),
    cultureRefs: referenceArrayField(),
    affiliationRefs: referenceArrayField(),
    appearance: new fields.SchemaField({
      apparentAge: optionalStringField(),
      height: measurementField("m"),
      build: optionalStringField(),
      skin: optionalStringField(),
      hair: optionalStringField(),
      eyes: optionalStringField(),
      distinctiveMarks: optionalStringField(),
      voice: optionalStringField(),
      posture: optionalStringField(),
      description: optionalStringField(),
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
    goals: new fields.ArrayField(stableTextEntryField(), {
      required: true,
      initial: [],
    }),
    anchors: referenceArrayField(),
  });
}

function buildField(): any {
  return new fields.SchemaField({
    ancestryRef: referenceField(),
    secondaryAncestryRef: referenceField(),
    profileRef: referenceField(),
    originRef: referenceField(),
    pathRef: referenceField(),
    primarySpecializationRef: referenceField(),
    secondarySpecializations: new fields.ArrayField(
      new fields.SchemaField({
        ref: referenceField(),
        rank: optionalStringField(),
        sourceRef: referenceField(),
      }),
      { required: true, initial: [] },
    ),
    advantageRefs: referenceArrayField(),
    drawbackRefs: referenceArrayField(),
  });
}

function ageField(): any {
  return new fields.SchemaField({
    earthBirthDate: optionalStringField(),
    universalEquivalent: fictionStampField(),
    chronological: measurementField("years"),
    biological: measurementField("years"),
    apparent: measurementField("years"),
    category: optionalStringField(),
    profileRef: referenceField(),
    updatedAt: fictionStampField(),
  });
}

function bodyField(): any {
  return new fields.SchemaField({
    id: new fields.StringField({
      required: true,
      blank: false,
      initial: "primary",
    }),
    name: new fields.StringField({
      required: true,
      blank: false,
      initial: "Corps principal",
    }),
    nature: new fields.StringField({
      required: true,
      blank: false,
      initial: "biological",
    }),
    architecture: optionalStringField(),
    size: new fields.StringField({
      required: true,
      blank: false,
      initial: "medium",
    }),
    criticalFunctions: new fields.ArrayField(stableTextEntryField(), {
      required: true,
      initial: [],
    }),
    locations: new fields.ArrayField(stableTextEntryField(), {
      required: true,
      initial: [
        {
          id: "core",
          sort: 0,
          status: "active",
          value: "Zone centrale",
          visibility: "document",
        },
      ],
    }),
    needs: new fields.ArrayField(needField(), {
      required: true,
      initial: [],
    }),
    integratedItemRefs: referenceArrayField(),
  });
}

function presentationField(): any {
  return new fields.SchemaField({
    id: new fields.StringField({
      required: true,
      blank: false,
      initial: "identity",
    }),
    name: new fields.StringField({
      required: true,
      blank: false,
      initial: "Portrait identitaire",
    }),
    category: optionalStringField("identity"),
    portrait: mediaRefField("portrait"),
    token: mediaRefField("token"),
    bodyIds: new fields.ArrayField(new fields.StringField(), {
      required: true,
      initial: ["primary"],
    }),
    availability: new fields.StringField({
      required: true,
      blank: false,
      initial: "available",
    }),
    sourceRef: referenceField(),
    associatedPresentationId: optionalStringField(),
    active: new fields.BooleanField({ required: true, initial: true }),
    favorite: new fields.BooleanField({ required: true, initial: true }),
    notes: optionalStringField(),
  });
}

function outfitField(): any {
  return new fields.SchemaField({
    id: optionalStringField(),
    sort: new fields.NumberField({
      required: true,
      integer: true,
      initial: 0,
    }),
    status: new fields.StringField({
      required: true,
      blank: false,
      initial: "active",
    }),
    name: optionalStringField(),
    function: optionalStringField(),
    bodyIds: new fields.ArrayField(new fields.StringField(), {
      required: true,
      initial: [],
    }),
    itemRefs: referenceArrayField(),
    containerRefs: referenceArrayField(),
    presentationId: optionalStringField(),
    storageRef: referenceField(),
    readiness: new fields.StringField({
      required: true,
      blank: false,
      initial: "incomplete",
    }),
    conflicts: new fields.ArrayField(new fields.StringField(), {
      required: true,
      initial: [],
    }),
  });
}

function movementField(): any {
  return new fields.SchemaField({
    id: optionalStringField(),
    kind: new fields.StringField({
      required: true,
      blank: false,
      initial: "ground",
    }),
    speed: new fields.NumberField({ required: true, min: 0, initial: 0 }),
    unit: new fields.StringField({
      required: true,
      blank: false,
      initial: "mPerRound",
    }),
    maneuverability: new fields.NumberField({
      required: false,
      nullable: true,
      integer: true,
      initial: null,
    }),
  });
}

function defensesField(): any {
  return new fields.SchemaField({
    cap: new fields.NumberField({
      required: false,
      nullable: true,
      integer: true,
      initial: null,
    }),
    cae: new fields.NumberField({
      required: false,
      nullable: true,
      integer: true,
      initial: null,
    }),
    resistances: new fields.ArrayField(stableTextEntryField(), {
      required: true,
      initial: [],
    }),
  });
}

function needField(): any {
  return new fields.SchemaField({
    key: new fields.StringField({ required: true, blank: false }),
    current: new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
    }),
    maximum: new fields.NumberField({
      required: false,
      nullable: true,
      initial: null,
    }),
    unit: new fields.StringField({
      required: true,
      blank: false,
      initial: "count",
    }),
    lastSatisfiedAt: fictionStampField(),
    nextThresholdAt: fictionStampField(),
    state: new fields.StringField({
      required: true,
      blank: false,
      initial: "normal",
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

export class PersonData extends ReservedData {
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
      identity: identityField(),
      build: buildField(),
      age: ageField(),
      level: new fields.NumberField({
        required: true,
        integer: true,
        min: 1,
        max: 30,
        initial: 1,
      }),
      attributes: new fields.SchemaField(attributes),
      skills: new fields.SchemaField(skills),
      bodies: new fields.ArrayField(bodyField(), {
        required: true,
        initial: [initialBody()],
      }),
      activeBodyId: new fields.StringField({
        required: true,
        blank: false,
        initial: "primary",
      }),
      presentations: new fields.ArrayField(presentationField(), {
        required: true,
        initial: [initialPresentation()],
      }),
      outfits: new fields.ArrayField(outfitField(), {
        required: true,
        initial: [],
      }),
      defenses: defensesField(),
      movements: new fields.ArrayField(movementField(), {
        required: true,
        initial: [],
      }),
      turn: new fields.SchemaField({
        actionsCurrent: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
        reactionAvailable: new fields.BooleanField({
          required: true,
          initial: false,
        }),
      }),
      health: healthField(),
      needs: new fields.ArrayField(needField(), {
        required: true,
        initial: [],
      }),
      energyPools: new fields.ArrayField(resourcePoolField(), {
        required: true,
        initial: [],
      }),
      biometricSummary: new fields.SchemaField({
        state: optionalStringField(),
        alerts: new fields.ArrayField(new fields.StringField(), {
          required: true,
          initial: [],
        }),
        limitations: new fields.ArrayField(new fields.StringField(), {
          required: true,
          initial: [],
        }),
        updatedAt: fictionStampField(),
      }),
      post: new fields.SchemaField({
        primaryRef: referenceField(),
        secondaryRefs: referenceArrayField(),
      }),
      relationshipRefs: referenceArrayField(),
      organizationRefs: referenceArrayField(),
      accountRefs: referenceArrayField(),
      personalJournalRefs: referenceArrayField(),
    };
  }

  static migrateData(
    source: Record<string, any>,
    options: Readonly<{ partial?: boolean }> = {},
  ): Record<string, any> {
    if (options.partial) return source;
    normalizePersonSource(source);
    source.meta ??= {};
    source.meta.schemaVersion = SCHEMA_VERSION;
    source.health ??= {};
    source.health.hitPoints ??= { current: 10, maximum: 10 };
    source.health.hitPoints.key ??= "hitPoints";
    source.health.hitPoints.reserved ??= 0;
    source.health.hitPoints.debt ??= 0;
    source.health.hitPoints.unit ??= "pv";
    return source;
  }

  prepareDerivedData(): void {
    super.prepareDerivedData();
    const attributes = Object.fromEntries(
      Object.entries(this.attributes).map(([key, score]: [string, any]) => {
        const modifiers = Array.from(score.modifiers ?? []).reduce(
          (sum: number, modifier: any) =>
            modifier.enabled !== false && modifier.mode === "add"
              ? sum + Number(modifier.value ?? 0)
              : sum,
          0,
        );
        return [key, Number(score.base ?? 0) + modifiers];
      }),
    );
    const skills = Object.fromEntries(
      Object.entries(this.skills).map(([key, score]: [string, any]) => {
        const attributeKey = String(score.defaultAttribute ?? "");
        const mastery = masteryBonus(String(score.rank));
        const modifiers = Array.from(score.modifiers ?? []).reduce(
          (sum: number, modifier: any) =>
            modifier.enabled !== false && modifier.mode === "add"
              ? sum + Number(modifier.value ?? 0)
              : sum,
          0,
        );
        return [
          key,
          {
            masteryBonus: mastery,
            total: Number(attributes[attributeKey] ?? 0) + mastery + modifiers,
          },
        ];
      }),
    );
    const hitPoints = clampHitPoints(
      this.health.hitPoints.current,
      this.health.hitPoints.maximum,
    );
    const stressMaximum = Math.max(0, 10 + Number(attributes.willpower ?? 0));
    const stressCurrent = Math.min(
      stressMaximum,
      Math.max(0, Number(this.health.stress?.current ?? 0)),
    );
    const activeBody = Array.from(this.bodies ?? []).find(
      (body: any) => body.id === this.activeBodyId,
    );
    const primaryMovement = Array.from(this.movements ?? [])[0] as any;

    this.derived = {
      attributes,
      skills,
      activeBody: activeBody ?? Array.from(this.bodies ?? [])[0] ?? null,
      primaryMovement: primaryMovement ?? null,
      trackables: {
        hitPoints: { value: hitPoints.current, max: hitPoints.maximum },
        stress: { value: stressCurrent, max: stressMaximum },
      },
    };
  }
}

export class CharacterData extends PersonData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      progression: new fields.SchemaField({
        pendingChoices: new fields.ArrayField(stableTextEntryField(), {
          required: true,
          initial: [],
        }),
        automaticGrants: new fields.ArrayField(stableTextEntryField(), {
          required: true,
          initial: [],
        }),
        historyRefs: referenceArrayField(),
        mythicStars: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
      }),
    };
  }
}

export class NpcData extends PersonData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      detailLevel: new fields.StringField({
        required: true,
        blank: false,
        initial: "standard",
      }),
      role: optionalStringField(),
      publicIdentity: new fields.SchemaField({
        name: optionalStringField(),
        pronouns: optionalStringField(),
        presentationId: optionalStringField(),
      }),
      attitudeVisible: optionalStringField(),
      behavior: new fields.SchemaField({
        tactics: new fields.ArrayField(new fields.StringField(), {
          required: true,
          initial: [],
        }),
        retreatThreshold: new fields.NumberField({
          required: false,
          nullable: true,
          min: 0,
          initial: null,
        }),
        surrender: optionalStringField(),
        priorities: new fields.ArrayField(new fields.StringField(), {
          required: true,
          initial: [],
        }),
        limits: new fields.ArrayField(new fields.StringField(), {
          required: true,
          initial: [],
        }),
      }),
      promotion: new fields.SchemaField({
        sourceCharacterRef: referenceField(),
      }),
    };
  }
}

export class RelisEffectData extends foundry.abstract.TypeDataModel {
  static defineSchema(): Record<string, any> {
    return {
      changes: new fields.ArrayField(
        new fields.SchemaField({
          key: optionalStringField(),
          phase: optionalStringField(),
          priority: new fields.NumberField({
            required: false,
            nullable: true,
            integer: true,
            initial: null,
          }),
          type: optionalStringField(),
          value: optionalStringField(),
        }),
        { required: true, initial: [] },
      ),
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
      type === "character"
        ? CharacterData
        : type === "npc"
          ? NpcData
          : ReservedData;
  for (const type of ITEM_TYPES) {
    CONFIG.Item.dataModels[type] =
      type === "action"
        ? ActionData
        : type === "equipment"
          ? EquipmentData
          : isPhysicalItemType(type)
            ? PhysicalItemData
            : RelisItemData;
  }
  for (const type of JOURNAL_PAGE_TYPES)
    CONFIG.JournalEntryPage.dataModels[type] = ReservedData;
  CONFIG.ActiveEffect.dataModels.relisEffect = RelisEffectData;
  CONFIG.ActiveEffect.expiryAction = "delete";
  for (const type of ["personal", "spatial", "crisis"])
    CONFIG.Combat.dataModels[type] = RelisCombatData;
  CONFIG.Combatant.dataModels.participant = RelisParticipantData;
  CONFIG.ChatMessage.dataModels.relisCard = RelisCardData;

  CONFIG.Actor.trackableAttributes = Object.fromEntries(
    ACTOR_TYPES.map((type) => [
      type,
      type === "character" || type === "npc"
        ? { bar: ["derived.trackables.hitPoints"], value: ["level"] }
        : { bar: [], value: [] },
    ]),
  );
}
