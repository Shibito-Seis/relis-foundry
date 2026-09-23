import {
  ACOUSTIC_SIGNATURES,
  AMMUNITION_FAMILIES,
  BATTERY_FORMATS,
  CHAMBERINGS,
  DAMAGE_SOURCES,
  DAMAGE_TYPES,
  FEED_INTERFACES,
  FIRE_CADENCES,
  FIRE_MODES,
  POWER_CLASSES,
  PRESSURE_CLASSES,
  SIGNATURE_TAGS,
  TECHNICAL_SIZES,
  TECHNOLOGIES,
  WEAPON_ATTRIBUTES,
  WEAPON_FAMILIES,
  WEAPON_SKILLS,
  allowedAmmunitionFamilies,
} from "./material-catalog";

type RecordLike = Record<string, any>;

function normalized(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

function idFor(
  value: unknown,
  registry: Record<string, string>,
  aliases: Record<string, string> = {},
): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (Object.hasOwn(registry, raw)) return raw;
  const key = normalized(raw);
  if (aliases[key] && Object.hasOwn(registry, aliases[key]))
    return aliases[key];
  return (
    Object.entries(registry).find(
      ([, label]) => normalized(label) === key,
    )?.[0] ?? ""
  );
}

function idsFor(
  values: unknown,
  registry: Record<string, string>,
  aliases: Record<string, string> = {},
): string[] {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(
      values
        .map((value) => idFor(value, registry, aliases) || String(value).trim())
        .filter(Boolean),
    ),
  ];
}

const FAMILY_ALIASES = {
  "melee courante": "improvisedMelee",
  "melee improvisee": "improvisedMelee",
  "arme improvisee": "improvisedMelee",
  "melee martiale": "martialTechnoBlade",
  "techno lame": "martialTechnoBlade",
  "techno lames": "martialTechnoBlade",
  "arme de poing": "handgun",
  "armes de poing": "handgun",
  pistolet: "handgun",
  "arme longue": "physicalLongGun",
  "armes longues physiques": "physicalLongGun",
  "arme longue energetique": "energyLongGun",
  "armes longues energetiques": "energyLongGun",
  arc: "bowCrossbowThrown",
  arbalete: "bowCrossbowThrown",
  "arme lancee": "bowCrossbowThrown",
  "arme lourde": "heavyLauncher",
  lanceur: "heavyLauncher",
  "arme naturelle": "naturalSpecial",
} as const;

const SKILL_ALIASES = {
  melee: "melee",
  tir: "shooting",
  shooting: "shooting",
  "armes lourdes": "heavyWeapons",
  heavyweapons: "heavyWeapons",
} as const;

const ATTRIBUTE_ALIASES = {
  force: "force",
  dexterite: "dexterity",
  dexterity: "dexterity",
  technologie: "technology",
  technology: "technology",
  "maitrise magique": "magicMastery",
  magicmastery: "magicMastery",
} as const;

const CADENCE_ALIASES = {
  "coup par coup": "single",
  simple: "single",
  "semi automatique": "sequential",
  rafale: "burst",
  automatique: "automatic",
  continu: "continuous",
  salve: "volley",
} as const;

const MODE_ALIASES = {
  "tir simple": "single",
  salve: "volley",
  rafale: "burst",
  automatique: "automatic",
  suppression: "suppression",
  "vider le chargeur": "emptyMagazine",
} as const;

function migrateWeapon(system: RecordLike): void {
  const profile = (system.weaponProfile ??= {});
  profile.familyId ||= idFor(profile.family, WEAPON_FAMILIES, FAMILY_ALIASES);
  profile.skillId ||= idFor(profile.skillKey, WEAPON_SKILLS, SKILL_ALIASES);
  profile.attributeId ||= idFor(
    profile.attributeKey,
    WEAPON_ATTRIBUTES,
    ATTRIBUTE_ALIASES,
  );
  profile.cadenceId ||= idFor(profile.cadence, FIRE_CADENCES, CADENCE_ALIASES);
  profile.chamberingId ||= idFor(profile.chamberId, CHAMBERINGS);
  profile.pressureClassId ||= idFor(profile.pressureClass, PRESSURE_CLASSES);
  profile.feedInterfaceId ||= idFor(profile.feedInterface, FEED_INTERFACES);
  if (profile.familyId) profile.family = profile.familyId;
  if (profile.skillId) profile.skillKey = profile.skillId;
  if (profile.attributeId) profile.attributeKey = profile.attributeId;
  if (profile.cadenceId) profile.cadence = profile.cadenceId;
  if (profile.chamberingId) profile.chamberId = profile.chamberingId;
  if (profile.pressureClassId) profile.pressureClass = profile.pressureClassId;
  if (profile.feedInterfaceId) profile.feedInterface = profile.feedInterfaceId;
  profile.modeIds = profile.modeIds?.length
    ? profile.modeIds
    : idsFor(profile.modes, FIRE_MODES, MODE_ALIASES);
  profile.signatureIds = profile.signatureIds?.length
    ? profile.signatureIds
    : idsFor(profile.signatures, SIGNATURE_TAGS);
  if (
    !profile.ammunitionFamilyIds?.length &&
    (profile.familyId === "energyLongGun" ||
      (profile.familyId === "martialTechnoBlade" && profile.technoBladeVariant))
  )
    profile.ammunitionFamilyIds = [
      ...allowedAmmunitionFamilies(
        profile.familyId,
        String(profile.technoBladeVariant ?? ""),
      ),
    ];
  profile.damageTypes = idsFor(profile.damageTypes, DAMAGE_TYPES);
  profile.damageSources = idsFor(profile.damageSources, DAMAGE_SOURCES);
  if (!profile.handsMode && profile.handsRequired != null) {
    const hands = Number(profile.handsRequired);
    profile.handsMode =
      hands === 0
        ? "natural"
        : hands === 2
          ? "two"
          : profile.handsFlexible
            ? "versatile"
            : hands === 1
              ? "one"
              : "";
  }
  const legacyConsumption = Number(profile.consumption);
  const hasLegacyConsumption =
    Number.isFinite(legacyConsumption) && legacyConsumption > 0;
  if (
    hasLegacyConsumption &&
    ["chamber", "internal", "detachable"].includes(profile.feedKind) &&
    profile.ammunitionConsumption?.single == null
  )
    (profile.ammunitionConsumption ??= {}).single = legacyConsumption;
  if (
    hasLegacyConsumption &&
    profile.feedKind === "energy" &&
    profile.energyConsumption?.single == null
  )
    (profile.energyConsumption ??= {}).single = legacyConsumption;
  if (
    profile.feedKind === "internal" &&
    profile.internalCapacity == null &&
    Number(profile.capacity) > 0
  )
    profile.internalCapacity = Number(profile.capacity);
}

function migrateEnergy(system: RecordLike): void {
  const profile = system.energyProfile;
  if (!profile) return;
  profile.formatId ||= idFor(profile.format, BATTERY_FORMATS);
  profile.powerClassId ||= idFor(profile.powerClass, POWER_CLASSES);
  profile.technologyId ||= idFor(profile.technology, TECHNOLOGIES);
  profile.signatureId ||= idFor(profile.signature, ACOUSTIC_SIGNATURES);
  if (profile.formatId) profile.format = profile.formatId;
  if (profile.powerClassId) profile.powerClass = profile.powerClassId;
  if (profile.technologyId) profile.technology = profile.technologyId;
  if (profile.signatureId) profile.signature = profile.signatureId;
  if (profile.kind === "pranaCrystal") {
    profile.interfaceId ||= "crystalSocket";
    profile.technologyId ||= "pranaCrystal";
    profile.technology = profile.technologyId;
  }
}

function migrateEquipment(system: RecordLike): void {
  const profile = system.physical?.equipmentProfile;
  if (!profile) return;
  profile.technologyId ||= idFor(profile.technology, TECHNOLOGIES);
  profile.technicalSizeId ||= idFor(profile.technicalSize, TECHNICAL_SIZES);
  profile.interfaceIds = idsFor(profile.interfaceIds, FEED_INTERFACES);
  profile.compatibleInterfaces = idsFor(
    profile.compatibleInterfaces,
    FEED_INTERFACES,
  );
  profile.compatibleSizes = idsFor(profile.compatibleSizes, TECHNICAL_SIZES);
  profile.compatibleTechnologies = idsFor(
    profile.compatibleTechnologies,
    TECHNOLOGIES,
  );
  if (profile.technologyId) profile.technology = profile.technologyId;
  if (profile.technicalSizeId) profile.technicalSize = profile.technicalSizeId;
}

function migrateAmmunition(system: RecordLike): void {
  const profile = system.ammunitionProfile;
  if (!profile) return;
  profile.familyId ||= idFor(profile.family, AMMUNITION_FAMILIES);
  profile.chamberingId ||= idFor(profile.chamberId, CHAMBERINGS);
  profile.pressureClassId ||= idFor(profile.pressureClass, PRESSURE_CLASSES);
  profile.feedInterfaceIds = profile.feedInterfaceIds?.length
    ? profile.feedInterfaceIds
    : idsFor(profile.feedInterfaces, FEED_INTERFACES);
  profile.damageTypes = idsFor(profile.damageTypes, DAMAGE_TYPES);
  profile.damageSources = idsFor(profile.damageSources, DAMAGE_SOURCES);
  profile.signatureModifiers = idsFor(
    profile.signatureModifiers,
    SIGNATURE_TAGS,
  );
  if (profile.familyId) profile.family = profile.familyId;
  if (profile.chamberingId) profile.chamberId = profile.chamberingId;
  if (profile.pressureClassId) profile.pressureClass = profile.pressureClassId;
  if (profile.feedInterfaceIds?.length)
    profile.feedInterfaces = [...profile.feedInterfaceIds];
}

/** Convertit uniquement les anciennes valeurs reconnues sans rien inventer. */
export function migrateMaterialSystem(
  system: RecordLike,
  itemType: string,
): RecordLike {
  if (itemType === "weapon") migrateWeapon(system);
  if (itemType === "ammunition") migrateAmmunition(system);
  migrateEnergy(system);
  migrateEquipment(system);
  return system;
}
