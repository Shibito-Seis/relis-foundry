import { CONTENT_VERSION, RULES_VERSION, SCHEMA_VERSION } from "../config";
import {
  EQUIP_STATES,
  ITEM_CONDITIONS,
  LEGALITY_STATES,
  QUANTITY_UNITS,
  UPGRADE_STATES,
  physicalTotals,
} from "./item-defaults";

const fields = foundry.data.fields;

function optionalStringField(initial = ""): any {
  return new fields.StringField({ required: true, blank: true, initial });
}

function optionalNumberField(minimum = 0, maximum?: number): any {
  return new fields.NumberField({
    required: false,
    nullable: true,
    min: minimum,
    max: maximum,
    initial: null,
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

function itemMetaField(): any {
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
    relisId: optionalStringField(),
    sourceRef: referenceField(),
    sourceVersion: optionalStringField(),
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
    causeRefs: referenceArrayField(),
    tags: new fields.ArrayField(new fields.StringField(), {
      required: true,
      initial: [],
    }),
  });
}

function provenanceField(): any {
  return new fields.SchemaField({
    acquisitionKind: new fields.StringField({
      required: true,
      blank: false,
      initial: "unknown",
    }),
    acquiredFromRef: referenceField(),
    acquiredAt: optionalNumberField(),
    lotId: optionalStringField(),
    localRevision: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      initial: 0,
    }),
    manualOverrides: new fields.ArrayField(new fields.StringField(), {
      required: true,
      initial: [],
    }),
    upgradeState: new fields.StringField({
      required: true,
      blank: false,
      choices: UPGRADE_STATES,
      initial: "unknown",
    }),
  });
}

function physicalField(): any {
  return new fields.SchemaField({
    quantity: new fields.NumberField({ required: true, min: 0, initial: 1 }),
    unit: new fields.StringField({
      required: true,
      blank: false,
      choices: QUANTITY_UNITS,
      initial: "count",
    }),
    massEach: optionalNumberField(),
    volumeEach: optionalNumberField(),
    bulkEach: optionalNumberField(),
    containerRef: referenceField(),
    locationKey: optionalStringField(),
    custodianRef: referenceField(),
    equipState: new fields.StringField({
      required: true,
      blank: false,
      choices: EQUIP_STATES,
      initial: "stored",
    }),
    condition: new fields.StringField({
      required: true,
      blank: false,
      choices: ITEM_CONDITIONS,
      initial: "intact",
    }),
    wear: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      max: 6,
      initial: 0,
    }),
    charges: new fields.SchemaField({
      current: optionalNumberField(),
      maximum: optionalNumberField(),
      unit: new fields.StringField({
        required: true,
        blank: false,
        initial: "charge",
      }),
    }),
    identified: new fields.BooleanField({ required: true, initial: true }),
  });
}

export class RelisItemData extends foundry.abstract.TypeDataModel {
  static isPhysical = false;

  declare derived: Record<string, any>;

  static defineSchema(): Record<string, any> {
    return {
      meta: itemMetaField(),
      description: new fields.HTMLField({
        required: true,
        blank: true,
        initial: "",
      }),
      traits: new fields.ArrayField(new fields.StringField(), {
        required: true,
        initial: [],
      }),
      requirementRefs: referenceArrayField(),
      effectRefs: referenceArrayField(),
      level: optionalNumberField(1, 30),
      quality: optionalNumberField(0, 5),
      rarity: optionalNumberField(0, 6),
      legality: new fields.StringField({
        required: true,
        blank: true,
        choices: ["", ...LEGALITY_STATES],
        initial: "",
      }),
      referencePrice: new fields.SchemaField({
        amount: optionalNumberField(),
        currencyRef: referenceField(),
        unit: new fields.StringField({
          required: true,
          blank: false,
          initial: "count",
        }),
        quantityBasis: new fields.NumberField({
          required: true,
          min: Number.EPSILON,
          initial: 1,
        }),
        sourceRefs: referenceArrayField(),
      }),
      manufacturerRef: referenceField(),
      permissions: new fields.SchemaField({
        playerEditableDescription: new fields.BooleanField({
          required: true,
          initial: false,
        }),
      }),
      provenance: provenanceField(),
    };
  }

  prepareDerivedData(): void {
    super.prepareDerivedData();
    const physical = (this.constructor as typeof RelisItemData).isPhysical;
    this.derived = {
      physical: physical ? physicalTotals((this as any).physical) : null,
    };
  }
}

export class PhysicalItemData extends RelisItemData {
  static isPhysical = true;

  static defineSchema(): Record<string, any> {
    return { ...super.defineSchema(), physical: physicalField() };
  }
}

export class ActionData extends RelisItemData {
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
        resourceKey: optionalStringField(),
        cost: new fields.NumberField({
          required: true,
          integer: true,
          min: 0,
          initial: 0,
        }),
      }),
      effect: new fields.SchemaField({
        conditionKey: optionalStringField(),
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

export class EquipmentData extends PhysicalItemData {}
