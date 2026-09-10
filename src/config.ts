export const SYSTEM_ID = "relis";
export const PACKAGE_VERSION = "0.2.3";
export const SCHEMA_VERSION = "2";
export const RULES_VERSION = "1.0.0";
export const CONTENT_VERSION = "1.0.0";

export const ACTOR_TYPES = [
  "character",
  "npc",
  "creature",
  "cohort",
  "drone",
  "vehicle",
  "mecha",
  "ship",
  "ark",
  "organization",
  "settlement",
] as const;

export const ITEM_TYPES = [
  "ancestry",
  "profile",
  "origin",
  "advantage",
  "drawback",
  "path",
  "specialization",
  "post",
  "talent",
  "action",
  "power",
  "conditionTemplate",
  "weapon",
  "armor",
  "equipment",
  "consumable",
  "ammunition",
  "resource",
  "container",
  "hull",
  "module",
  "installation",
  "project",
  "research",
  "stratagem",
  "document",
] as const;

export const JOURNAL_PAGE_TYPES = [
  "starSystem",
  "celestialBody",
  "region",
  "site",
  "xenoSpecies",
  "analysis",
  "expedition",
  "report",
  "dossier",
  "market",
  "account",
  "transaction",
  "contract",
  "shipment",
  "legalRecord",
  "relation",
  "treaty",
  "colonyRecord",
  "consentRecord",
  "biologicalRecord",
  "register",
] as const;

export const ATTRIBUTE_LABELS = {
  force: "Force",
  dexterity: "Dextérité",
  vigor: "Vigueur",
  intelligence: "Intelligence",
  technology: "Technologie",
  presence: "Présence",
  willpower: "Volonté",
  magicMastery: "Maîtrise Magique",
} as const;

export const SKILL_DEFINITIONS = {
  acrobatics: ["Acrobaties", "dexterity"],
  heavyWeapons: ["Armes lourdes", "force"],
  athletics: ["Athlétisme", "force"],
  channeling: ["Canalisation", "magicMastery"],
  command: ["Commandement", "presence"],
  commerce: ["Commerce", "presence"],
  culture: ["Culture", "intelligence"],
  diplomacy: ["Diplomatie", "presence"],
  stealth: ["Discrétion", "dexterity"],
  endurance: ["Endurance", "vigor"],
  engineering: ["Ingénierie", "technology"],
  computing: ["Informatique", "technology"],
  intimidation: ["Intimidation", "presence"],
  investigation: ["Investigation", "intelligence"],
  medicine: ["Médecine", "intelligence"],
  melee: ["Mêlée", "force"],
  navigation: ["Navigation", "intelligence"],
  piloting: ["Pilotage", "dexterity"],
  composure: ["Sang-froid", "willpower"],
  science: ["Sciences", "intelligence"],
  survival: ["Survie", "vigor"],
  shipSystems: ["Systèmes de vaisseau", "technology"],
  technomagic: ["Techno-magie", "technology"],
  shooting: ["Tir", "dexterity"],
  deception: ["Tromperie", "presence"],
} as const;

export const MASTERY_BONUSES = {
  untrained: 0,
  trained: 2,
  expert: 4,
  master: 6,
  legendary: 8,
  mythic: 12,
} as const;

export const MASTERY_LABELS = {
  untrained: "Inexpérimenté",
  trained: "Qualifié",
  expert: "Expert",
  master: "Maître",
  legendary: "Légendaire",
  mythic: "Mythique",
} as const;

export type AttributeKey = keyof typeof ATTRIBUTE_LABELS;
export type SkillKey = keyof typeof SKILL_DEFINITIONS;
export type MasteryRank = keyof typeof MASTERY_BONUSES;
