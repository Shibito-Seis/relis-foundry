import { BODY_SLOTS, TECHNICAL_SLOTS } from "../rules/equipment-slots";
import { CONTENT_VERSION, RULES_VERSION, SCHEMA_VERSION } from "../config";
import {
  ACCESSIBILITY_STATES,
  CONTAINER_ACCESS_RULES,
  EQUIP_STATES,
  ITEM_CONDITIONS,
  LEGALITY_STATES,
  OWNERSHIP_STATES,
  QUANTITY_UNITS,
  UPGRADE_STATES,
  physicalTotals,
} from "./item-defaults";
import {
  ACTIVATION_METHODS,
  ACOUSTIC_SIGNATURES,
  AMMUNITION_FAMILIES,
  AMMUNITION_VARIANTS,
  AREA_SHAPES,
  ARMOR_KINDS,
  BATTERY_FORMATS,
  CHAMBERINGS,
  CONSUMABLE_DOSES,
  DAMAGE_ATTRIBUTES,
  DAMAGE_DICE,
  DEFENSE_TARGETS,
  DURATIONS,
  FEED_INTERFACES,
  FEED_KINDS,
  FIRE_CADENCES,
  FIRE_MODES,
  PHYSICAL_FEED_KINDS,
  POWER_CLASSES,
  PRESSURE_CLASSES,
  RECHARGE_METHODS,
  SAFETY_STATES,
  TECHNICAL_SIZES,
  TECHNOLOGIES,
  TECHNO_BLADE_VARIANTS,
  TREATMENT_FAMILIES,
  WEAPON_ACCESS,
  WEAPON_ATTRIBUTES,
  WEAPON_FAMILIES,
  WEAPON_HANDS,
  WEAPON_SKILLS,
  WEAPON_SUPPORTS,
} from "./material-catalog";

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

function stringChoiceField(
  choices: readonly string[],
  initial = "",
  blank = initial === "",
): any {
  return new fields.StringField({
    required: true,
    blank,
    choices,
    initial,
  });
}

function stringArrayField(): any {
  return new fields.ArrayField(new fields.StringField(), {
    required: true,
    initial: () => [],
  });
}

const keys = (value: Record<string, string>): string[] => Object.keys(value);

function durabilityField(): any {
  return new fields.SchemaField({
    solidity: optionalNumberField(),
    structureCurrent: optionalNumberField(),
    structureMaximum: optionalNumberField(),
    breakingThreshold: optionalNumberField(),
    reliability: optionalNumberField(0, 5),
    serviceLife: optionalStringField(),
    maintenanceInterval: optionalStringField(),
    signature: optionalStringField(),
    heatCurrent: optionalNumberField(),
    heatMaximum: optionalNumberField(),
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
    initial: () => [],
  });
}

function fictionStampField(): any {
  return new fields.SchemaField({
    worldTime: optionalNumberField(),
    calendarId: optionalStringField(),
    displayOverride: optionalStringField(),
    precision: new fields.StringField({
      required: true,
      blank: false,
      choices: ["exact", "approximate", "range", "unknown"],
      initial: "exact",
    }),
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
      initial: () => [],
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
      initial: () => [],
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
    ownershipState: new fields.StringField({
      required: true,
      blank: false,
      choices: OWNERSHIP_STATES,
      initial: "owned",
    }),
    accessibility: new fields.StringField({
      required: true,
      blank: false,
      choices: ACCESSIBILITY_STATES,
      initial: "stored",
    }),
    maintenanceRefs: referenceArrayField(),
    equipState: new fields.StringField({
      required: true,
      blank: false,
      choices: EQUIP_STATES,
      initial: "stored",
    }),
    bodyId: optionalStringField(),
    hands: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      max: 2,
      initial: 0,
    }),
    hostRef: referenceField(),
    equipmentProfile: new fields.SchemaField({
      slotCosts: new fields.SchemaField(
        Object.fromEntries(
          Object.keys(BODY_SLOTS).map((key) => [
            key,
            new fields.NumberField({
              required: true,
              integer: true,
              min: 1,
              initial: 1,
            }),
          ]),
        ),
      ),
      wearForm: optionalStringField(),
      functionalCategory: optionalStringField(),
      piercingLocation: optionalStringField(),
      ornamental: new fields.BooleanField({ required: true, initial: false }),
      shieldHands: new fields.NumberField({
        nullable: true,
        initial: null,
        integer: true,
        min: 0,
        max: 2,
      }),
      family: new fields.StringField({
        required: true,
        blank: true,
        initial: "",
        choices: ["", "manipulable", "wearable", "resource"],
      }),
      slot: optionalStringField(),
      slotsConfigured: new fields.BooleanField({
        required: true,
        initial: false,
      }),
      bodySlots: new fields.ArrayField(new fields.StringField(), {
        required: true,
        initial: () => [],
      }),
      requiredSlots: new fields.SchemaField(
        Object.fromEntries(
          Object.keys(TECHNICAL_SLOTS).map((key) => [
            key,
            new fields.NumberField({
              required: true,
              integer: true,
              min: 0,
              initial: 0,
            }),
          ]),
        ),
      ),
      providedSlots: new fields.SchemaField(
        Object.fromEntries(
          Object.keys(TECHNICAL_SLOTS).map((key) => [
            key,
            new fields.NumberField({
              required: true,
              integer: true,
              min: 0,
              initial: 0,
            }),
          ]),
        ),
      ),
      duration: optionalStringField(),
      sizes: new fields.ArrayField(new fields.StringField(), {
        required: true,
        initial: () => [],
      }),
      natures: new fields.ArrayField(new fields.StringField(), {
        required: true,
        initial: () => [],
      }),
      hostTypes: new fields.ArrayField(new fields.StringField(), {
        required: true,
        initial: () => [],
      }),
      technology: optionalStringField(),
      technicalSize: optionalStringField(),
      technologyId: stringChoiceField(["", ...keys(TECHNOLOGIES)], ""),
      technicalSizeId: stringChoiceField(["", ...keys(TECHNICAL_SIZES)], ""),
      installationKind: stringChoiceField(
        ["", "accessory", "modification", "improvement"],
        "",
      ),
      effectSummary: optionalStringField(),
      interfaceIds: stringArrayField(),
      compatibleFamilies: stringArrayField(),
      compatibleSizes: stringArrayField(),
      compatibleTechnologies: stringArrayField(),
      compatibleInterfaces: stringArrayField(),
      installable: new fields.BooleanField({ required: true, initial: false }),
      ordinaryLiquid: new fields.BooleanField({
        required: true,
        initial: false,
      }),
    }),
    condition: new fields.StringField({
      required: true,
      blank: false,
      choices: ITEM_CONDITIONS,
      initial: "intact",
    }),
    durability: durabilityField(),
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
    expiresAt: fictionStampField(),
    identified: new fields.BooleanField({ required: true, initial: true }),
  });
}

function loadSegmentField(): any {
  return new fields.SchemaField({
    ammunitionRef: referenceField(),
    quantity: new fields.NumberField({
      required: true,
      integer: true,
      min: 1,
      initial: 1,
    }),
    massEach: optionalNumberField(),
    lotId: optionalStringField(),
    variantId: optionalStringField(),
    profile: new fields.SchemaField({
      family: optionalStringField(),
      chamberId: optionalStringField(),
      pressureClass: optionalStringField(),
      feedInterfaces: stringArrayField(),
      impactModifier: optionalStringField(),
      damageTypes: stringArrayField(),
      damageSources: stringArrayField(),
      penetrationModifier: optionalNumberField(),
      rangeModifier: optionalStringField(),
      signatureModifiers: stringArrayField(),
      effectSummary: optionalStringField(),
      specialTraits: stringArrayField(),
      recoverable: new fields.BooleanField({ required: true, initial: false }),
    }),
  });
}

function energyProfileField(): any {
  return new fields.SchemaField({
    kind: stringChoiceField(
      ["", "battery", "internal", "generator", "singleUse", "pranaCrystal"],
      "",
    ),
    format: optionalStringField(),
    powerClass: optionalStringField(),
    technology: optionalStringField(),
    formatId: stringChoiceField(["", ...keys(BATTERY_FORMATS)], ""),
    powerClassId: stringChoiceField(["", ...keys(POWER_CLASSES)], ""),
    technologyId: stringChoiceField(["", ...keys(TECHNOLOGIES)], ""),
    interfaceId: stringChoiceField(["", ...keys(FEED_INTERFACES)], ""),
    current: optionalNumberField(),
    maximum: optionalNumberField(),
    output: optionalNumberField(),
    outputClass: optionalStringField(),
    cycle: stringChoiceField(["", "rechargeable", "consumable", "hybrid"], ""),
    rechargeMethod: optionalStringField(),
    rechargeDuration: optionalStringField(),
    signature: optionalStringField(),
    rechargeMethodId: stringChoiceField(["", ...keys(RECHARGE_METHODS)], ""),
    rechargeDurationId: stringChoiceField(["", ...keys(DURATIONS)], ""),
    signatureId: stringChoiceField(["", ...keys(ACOUSTIC_SIGNATURES)], ""),
    heatCurrent: optionalNumberField(),
    heatMaximum: optionalNumberField(),
    rechargeable: new fields.BooleanField({ required: true, initial: false }),
  });
}

function modeConsumptionField(): any {
  return new fields.SchemaField(
    Object.fromEntries(
      keys(FIRE_MODES).map((key) => [key, optionalNumberField(1)]),
    ),
  );
}

function weaponProfileField(): any {
  return new fields.SchemaField({
    familyId: stringChoiceField(["", ...keys(WEAPON_FAMILIES)], ""),
    family: optionalStringField(),
    technoBladeVariant: stringChoiceField(
      ["", ...keys(TECHNO_BLADE_VARIANTS)],
      "",
    ),
    support: stringChoiceField(["", ...keys(WEAPON_SUPPORTS)], ""),
    access: stringChoiceField(["", ...keys(WEAPON_ACCESS)], ""),
    attackMode: stringChoiceField(
      ["", "melee", "ranged", "thrown", "mounted", "natural"],
      "",
    ),
    defenseTarget: stringChoiceField(["", ...keys(DEFENSE_TARGETS)], ""),
    handsMode: stringChoiceField(["", ...keys(WEAPON_HANDS)], ""),
    handsRequired: optionalNumberField(0, 2),
    handsFlexible: new fields.BooleanField({ required: true, initial: false }),
    skillId: stringChoiceField(["", ...keys(WEAPON_SKILLS)], ""),
    attributeId: stringChoiceField(["", ...keys(WEAPON_ATTRIBUTES)], ""),
    skillKey: optionalStringField(),
    attributeKey: optionalStringField(),
    accuracy: optionalNumberField(-20, 20),
    damageDice: optionalNumberField(1, 5),
    damageDie: stringChoiceField(["", ...DAMAGE_DICE], ""),
    damageBonus: optionalNumberField(-20, 20),
    damageAttribute: stringChoiceField(["", ...keys(DAMAGE_ATTRIBUTES)], ""),
    damageFormula: optionalStringField(),
    damageTypes: stringArrayField(),
    penetration: optionalNumberField(),
    critical: optionalStringField(),
    prerequisiteSummary: optionalStringField(),
    damageSources: stringArrayField(),
    rangeKind: stringChoiceField(
      ["", "contact", "thrown", "increments", "zone", "special"],
      "",
    ),
    range: optionalStringField(),
    rangeOptimal: optionalNumberField(),
    rangeMaximum: optionalNumberField(),
    reach: optionalNumberField(),
    cadence: optionalStringField(),
    cadenceId: stringChoiceField(["", ...keys(FIRE_CADENCES)], ""),
    acousticSignature: stringChoiceField(
      ["", ...keys(ACOUSTIC_SIGNATURES)],
      "",
    ),
    modeIds: stringArrayField(),
    signatureIds: stringArrayField(),
    ammunitionFamilyIds: stringArrayField(),
    recoil: optionalNumberField(),
    feedKind: stringChoiceField(["", ...keys(FEED_KINDS)], ""),
    hybridPhysicalFeedKind: stringChoiceField(
      ["", ...keys(PHYSICAL_FEED_KINDS)],
      "",
    ),
    chamberingId: stringChoiceField(["", ...keys(CHAMBERINGS)], ""),
    pressureClassId: stringChoiceField(["", ...keys(PRESSURE_CLASSES)], ""),
    feedInterfaceId: stringChoiceField(["", ...keys(FEED_INTERFACES)], ""),
    chamberId: optionalStringField(),
    pressureClass: optionalStringField(),
    feedInterface: optionalStringField(),
    internalCapacity: optionalNumberField(1),
    batterySlotCount: optionalNumberField(1, 4),
    activationCostCe: optionalNumberField(1),
    ammunitionConsumption: modeConsumptionField(),
    energyConsumption: modeConsumptionField(),
    // Champs 0.6.1 conservés pour une migration additive et sans perte.
    capacity: optionalNumberField(),
    consumption: optionalNumberField(),
    reloadActions: optionalNumberField(),
    reloadProcedure: optionalStringField(),
    chamberSeparate: new fields.BooleanField({
      required: true,
      initial: false,
    }),
    modes: stringArrayField(),
    signatures: stringArrayField(),
    loadSequence: new fields.ArrayField(loadSegmentField(), {
      required: true,
      initial: () => [],
    }),
    chamberLoad: new fields.ArrayField(loadSegmentField(), {
      required: true,
      initial: () => [],
    }),
  });
}

function supplyProfileField(): any {
  return new fields.SchemaField({
    feedKind: stringChoiceField(
      ["", "none", "internal", "detachable", "hybrid"],
      "",
    ),
    chamberId: optionalStringField(),
    pressureClass: optionalStringField(),
    feedInterface: optionalStringField(),
    capacity: optionalNumberField(),
    consumption: optionalNumberField(),
    reloadActions: optionalNumberField(),
    reloadProcedure: optionalStringField(),
    chamberSeparate: new fields.BooleanField({
      required: true,
      initial: false,
    }),
    loadSequence: new fields.ArrayField(loadSegmentField(), {
      required: true,
      initial: () => [],
    }),
    chamberLoad: new fields.ArrayField(loadSegmentField(), {
      required: true,
      initial: () => [],
    }),
  });
}

function protectionProfileField(): any {
  return new fields.SchemaField({
    kind: stringChoiceField(["", ...keys(ARMOR_KINDS), "shield"], ""),
    access: stringChoiceField(
      ["", "common", "martial", "specialized", "heavy"],
      "",
    ),
    dexterityCap: optionalNumberField(),
    capBonus: optionalNumberField(0, 20),
    caeBonus: optionalNumberField(0, 20),
    solidityPhysical: optionalNumberField(),
    solidityEnergy: optionalNumberField(),
    coverage: stringArrayField(),
    layers: stringArrayField(),
    compatibilities: stringArrayField(),
    environmentCoverage: stringArrayField(),
    environmentProtections: stringArrayField(),
    strengthRequirement: optionalNumberField(),
    speedModifier: optionalNumberField(-20, 20),
    stealthModifier: optionalNumberField(-20, 20),
    sealing: stringChoiceField(["", "none", "partial", "sealed"], ""),
    equipTime: optionalStringField(),
    equipTimeId: stringChoiceField(["", ...keys(DURATIONS)], ""),
    barrierCurrent: optionalNumberField(),
    barrierMaximum: optionalNumberField(),
    barrierKind: optionalStringField(),
    barrierCompatibilities: stringArrayField(),
    absorptionFormula: optionalStringField(),
    activationCost: optionalNumberField(),
    upkeep: optionalStringField(),
    rechargeRatePerCe: optionalNumberField(),
    rechargeDuration: optionalStringField(),
    interception: optionalStringField(),
    collapseEffect: optionalStringField(),
    returnProcedure: optionalStringField(),
    constraintSummary: optionalStringField(),
  });
}

function ammunitionProfileField(): any {
  return new fields.SchemaField({
    familyId: stringChoiceField(["", ...keys(AMMUNITION_FAMILIES)], ""),
    variantId: stringChoiceField(["", ...keys(AMMUNITION_VARIANTS)], ""),
    family: optionalStringField(),
    chamberingId: stringChoiceField(["", ...keys(CHAMBERINGS)], ""),
    pressureClassId: stringChoiceField(["", ...keys(PRESSURE_CLASSES)], ""),
    feedInterfaceIds: stringArrayField(),
    chamberId: optionalStringField(),
    pressureClass: optionalStringField(),
    feedInterfaces: stringArrayField(),
    impactModifier: optionalStringField(),
    damageTypes: stringArrayField(),
    damageSources: stringArrayField(),
    penetrationModifier: optionalNumberField(),
    rangeModifier: optionalStringField(),
    signatureModifiers: stringArrayField(),
    effectSummary: optionalStringField(),
    specialTraits: stringArrayField(),
    recoverable: new fields.BooleanField({ required: true, initial: false }),
    loadOrder: new fields.NumberField({
      required: true,
      integer: true,
      min: 0,
      initial: 0,
    }),
  });
}

function consumableProfileField(): any {
  return new fields.SchemaField({
    kind: stringChoiceField(
      [
        "",
        "medical",
        "drug",
        "toxin",
        "potion",
        "matrix",
        "grenade",
        "mine",
        "charge",
        "utility",
      ],
      "",
    ),
    dose: optionalStringField(),
    treatmentFamily: optionalStringField(),
    doseId: stringChoiceField(["", ...keys(CONSUMABLE_DOSES)], ""),
    treatmentFamilyId: stringChoiceField(["", ...keys(TREATMENT_FAMILIES)], ""),
    route: stringChoiceField(
      [
        "",
        "oral",
        "inhaled",
        "cutaneous",
        "injected",
        "infused",
        "contact",
        "other",
      ],
      "",
    ),
    duration: optionalStringField(),
    durationId: stringChoiceField(["", ...keys(DURATIONS)], ""),
    toxicity: optionalNumberField(0, 5),
    dependency: optionalNumberField(0, 4),
    usesPerUnit: optionalNumberField(1),
    actionCost: optionalNumberField(),
    activation: optionalStringField(),
    rangeOrPlacement: optionalStringField(),
    area: optionalStringField(),
    activationId: stringChoiceField(["", ...keys(ACTIVATION_METHODS)], ""),
    areaId: stringChoiceField(["", ...keys(AREA_SHAPES)], ""),
    rangeOptimal: optionalNumberField(),
    rangeMaximum: optionalNumberField(),
    damageDice: optionalNumberField(1, 5),
    damageDie: stringChoiceField(["", ...DAMAGE_DICE], ""),
    damageFormula: optionalStringField(),
    damageTypes: stringArrayField(),
    trigger: optionalStringField(),
    guidance: optionalStringField(),
    energySource: stringChoiceField(
      ["", "mana", "prana", "flux", "technomagic", "other"],
      "",
    ),
    encodedFormula: optionalStringField(),
    formulaRank: optionalNumberField(),
    autonomous: new fields.BooleanField({ required: true, initial: false }),
    bufferKind: optionalStringField(),
    bufferCurrent: optionalNumberField(),
    bufferMaximum: optionalNumberField(),
    residue: optionalStringField(),
    effectSummary: optionalStringField(),
    limitation: optionalStringField(),
    safetyState: stringChoiceField(["", ...keys(SAFETY_STATES)], ""),
    sterility: optionalStringField(),
    storageConditions: optionalStringField(),
    openedAt: optionalStringField(),
  });
}

function currencyProfileField(): any {
  return new fields.SchemaField({
    physicalCash: new fields.BooleanField({ required: true, initial: false }),
    currencyId: optionalStringField(),
    currencyLabel: optionalStringField(),
    denomination: new fields.NumberField({
      required: true,
      min: Number.EPSILON,
      initial: 1,
    }),
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
        initial: () => [],
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

export class WeaponData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      weaponProfile: weaponProfileField(),
      protectionProfile: protectionProfileField(),
      energyProfile: energyProfileField(),
    };
  }
}

export class ArmorData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      protectionProfile: protectionProfileField(),
      energyProfile: energyProfileField(),
      supplyProfile: supplyProfileField(),
    };
  }
}

export class EquipmentData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      energyProfile: energyProfileField(),
      supplyProfile: supplyProfileField(),
    };
  }
}

export class ConsumableData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      consumableProfile: consumableProfileField(),
      energyProfile: energyProfileField(),
    };
  }
}

export class AmmunitionData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      ammunitionProfile: ammunitionProfileField(),
    };
  }
}

export class ResourceData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      energyProfile: energyProfileField(),
      currencyProfile: currencyProfileField(),
    };
  }
}

export class ContainerData extends PhysicalItemData {
  static defineSchema(): Record<string, any> {
    return {
      ...super.defineSchema(),
      capacity: new fields.SchemaField({
        mass: optionalNumberField(),
        volume: optionalNumberField(),
        bulk: optionalNumberField(),
        units: optionalNumberField(),
      }),
      accessRule: new fields.StringField({
        required: true,
        blank: false,
        choices: CONTAINER_ACCESS_RULES,
        initial: "normal",
      }),
      containerKind: stringChoiceField(["general", "magazine"], "general"),
      magazineProfile: new fields.SchemaField({
        chamberId: optionalStringField(),
        pressureClass: optionalStringField(),
        interfaceId: optionalStringField(),
        capacity: optionalNumberField(1),
      }),
    };
  }
}
