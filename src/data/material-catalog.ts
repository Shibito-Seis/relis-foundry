/**
 * Registres matériels canoniques employés par les fiches 10-E4-P.
 *
 * Les identifiants sont stables et indépendants des libellés français. Les
 * anciens champs texte du schéma 5 restent lisibles pour la migration, mais
 * aucune fiche 0.6.2 ne permet d'y saisir de nouvelles valeurs libres.
 */

export const WEAPON_FAMILIES = {
  improvisedMelee: "Mêlée courante et improvisée",
  martialTechnoBlade: "Mêlée martiale et techno-lames",
  handgun: "Armes de poing",
  physicalLongGun: "Armes longues physiques",
  energyLongGun: "Armes longues énergétiques",
  bowCrossbowThrown: "Arcs, arbalètes et armes lancées",
  heavyLauncher: "Armes lourdes et lanceurs",
  naturalSpecial: "Armes naturelles et profils spéciaux",
} as const;

export const WEAPON_SUPPORTS = {
  personal: "Personnel",
  vehicle: "Véhicule",
  mecha: "Mecha",
  spatial: "Spatial",
  natural: "Naturel matériel",
} as const;

export const WEAPON_ACCESS = {
  common: "Courante",
  martial: "Martiale",
  specialized: "Spécialisée",
  heavy: "Lourde",
  natural: "Naturelle / innée",
  improvised: "Improvisée",
} as const;

export const WEAPON_HANDS = {
  one: "1 main",
  versatile: "1+ — une ou deux mains",
  two: "2 mains",
  natural: "0 — arme naturelle",
  mountedOrTwo: "Montée ou 2 mains",
} as const;

export const WEAPON_SKILLS = {
  melee: "Mêlée",
  shooting: "Tir",
  heavyWeapons: "Armes lourdes",
} as const;

export const WEAPON_ATTRIBUTES = {
  force: "Force",
  dexterity: "Dextérité",
  technology: "Technologie",
  magicMastery: "Maîtrise Magique",
} as const;

export const DEFENSE_TARGETS = {
  cap: "CAP",
  cae: "CAE",
  maneuver: "DD de manœuvre",
  profile: "Selon le mode ou le profil",
} as const;

export const ACCURACY_VALUES = [-4, -3, -2, -1, 0, 1, 2, 3, 4] as const;

export const DAMAGE_DICE = ["d4", "d6", "d8", "d10", "d12"] as const;

export const DAMAGE_ATTRIBUTES = {
  none: "Aucun Attribut",
  force: "Force",
  halfForce: "Moitié de Force",
  dexterity: "Dextérité selon le profil",
  technology: "Technologie selon le profil",
  magicMastery: "Maîtrise Magique selon le profil",
} as const;

export const DAMAGE_TYPES = {
  blunt: "Contondant",
  slashing: "Tranchant",
  piercing: "Perforant",
  thermal: "Thermique",
  cryogenic: "Cryogénique",
  electric: "Électrique",
  photonic: "Photonique",
  plasma: "Plasma",
  sonic: "Sonique",
  chemical: "Chimique",
  psychic: "Psychique",
} as const;

export const DAMAGE_SOURCES = {
  ballistic: "Balistique",
  energy: "Énergétique",
  explosive: "Explosif",
  magical: "Magique",
  technomagical: "Techno-magique",
  prana: "Prana",
  emp: "EMP",
} as const;

export const RANGE_KINDS = {
  contact: "Contact",
  thrown: "Lancée",
  increments: "Portées chiffrées",
  zone: "Zone",
  special: "Spéciale référencée",
} as const;

export const FIRE_CADENCES = {
  single: "Coup par coup",
  sequential: "Semi-automatique",
  burst: "Rafale",
  automatic: "Automatique",
  continuous: "Continu",
  volley: "Salve",
} as const;

export const FIRE_MODES = {
  single: "Tir simple",
  volley: "Salve",
  burst: "Rafale",
  automatic: "Automatique",
  suppression: "Suppression",
  emptyMagazine: "Vider le chargeur",
} as const;

export const ACOUSTIC_SIGNATURES = {
  silent: "Silencieuse",
  discreet: "Discrète",
  loud: "Bruyante",
  detonating: "Détonante",
} as const;

export const SIGNATURE_TAGS = {
  flash: "Flash ou traînée visible",
  tracer: "Traceur",
  thermal: "Thermique",
  energy: "Énergétique",
  electromagnetic: "Électromagnétique",
  smoke: "Fumée",
  chemical: "Chimique",
} as const;

export const FEED_KINDS = {
  none: "Aucune alimentation",
  chamber: "Chargement unitaire / chambre seule",
  internal: "Magasin interne",
  detachable: "Chargeur détachable",
  energy: "Batterie ou cellule",
  hybrid: "Hybride physique et énergétique",
  pranaCrystal: "Cristal de Prana",
} as const;

export const PHYSICAL_FEED_KINDS = {
  chamber: FEED_KINDS.chamber,
  internal: FEED_KINDS.internal,
  detachable: FEED_KINDS.detachable,
} as const;

export const TECHNO_BLADE_VARIANTS = {
  vibratoryMaterial: "Lame matérielle à champ vibratoire",
  retractableConductor: "Lame énergétique sur conducteur rétractable",
  pranaCrystal: "Lame de Prana à cristal",
} as const;

export const BATTERY_FORMATS = {
  micro: "Microcellule — 6 CE",
  light: "Cellule légère — 12 CE",
  standard: "Batterie standard — 24 CE",
  heavy: "Batterie lourde — 48 CE",
  industrial: "Bloc industriel — 96 CE",
  special: "Format spécial référencé",
} as const;

export const POWER_CLASSES = {
  micro: "Micro",
  light: "Légère",
  standard: "Standard",
  heavy: "Lourde",
  industrial: "Industrielle",
  special: "Spéciale référencée",
} as const;

export const TECHNOLOGIES = {
  mechanical: "Mécanique",
  ballistic: "Balistique",
  electric: "Électrique",
  electromagnetic: "Électromagnétique",
  laser: "Laser",
  plasma: "Plasma",
  sonic: "Sonique",
  chemical: "Chimique",
  technomagical: "Techno-magique",
  pranaCrystal: "Cristal de Prana",
} as const;

export const TECHNICAL_SIZES = {
  micro: "Micro",
  compact: "Compact",
  personal: "Personnel",
  heavy: "Lourd",
  vehicle: "Véhicule",
  mecha: "Mecha",
  spatial: "Spatial",
} as const;

export const FEED_INTERFACES = {
  boxMagazine: "Chargeur droit ou boîte",
  tubularMagazine: "Magasin tubulaire",
  cylinder: "Barillet",
  belt: "Bande",
  cassette: "Cassette",
  cell: "Cellule ou batterie",
  singleProjectile: "Projectile unitaire",
  reservoir: "Réservoir",
  rail: "Rail guidé",
  crystalSocket: "Logement de cristal de Prana",
} as const;

export const PRESSURE_CLASSES = {
  low: "Faible",
  lightStandard: "Standard légère",
  standard: "Standard",
  heavyStandard: "Standard lourde",
  highPressure: "Haute pression",
  highVelocity: "Haute vélocité",
  magnum: "Magnum",
  heavyMagnum: "Magnum lourde",
  rifleLight: "Fusil léger",
  rifleIntermediate: "Fusil intermédiaire",
  rifleHeavy: "Fusil lourd",
  antiMateriel: "Anti-matériel",
  electromagnetic: "Électromagnétique",
  energyMicro: "Énergie micro",
  energyLight: "Énergie légère",
  energyStandard: "Énergie standard",
  energyHeavy: "Énergie lourde",
  prana: "Accord de Prana",
} as const;

export const CHAMBERINGS = {
  "BAL-22LR": ".22 LR",
  "BAL-635": "6,35 × 16 mm",
  "BAL-765": "7,65 × 17 mm",
  "BAL-9P": "9 × 19 mm",
  "BAL-57": "5,7 × 28 mm",
  "BAL-10A": "10 × 25 mm",
  "BAL-45": "11,43 × 23 mm",
  "BAL-357M": ".357 Magnum",
  "BAL-44M": ".44 Magnum",
  "BAL-50AE": "12,7 × 33 mm",
  "BAL-556": "5,56 × 45 mm",
  "BAL-762C": "7,62 × 39 mm",
  "BAL-300S": "7,62 × 35 mm subsonique",
  "BAL-65P": "6,5 × 48 mm précision",
  "BAL-762L": "7,62 × 51 mm",
  "BAL-86P": "8,6 × 70 mm",
  "BAL-127L": "12,7 × 99 mm",
  "CART-20": "Calibre 20, chambre 70 mm",
  "CART-12": "Calibre 12, chambre 70 mm",
  "CART-12M": "Calibre 12, chambre 76 mm",
  "CART-10M": "Calibre 10, chambre 89 mm",
  "DARD-9": "Dard médical 9 mm",
  "AIG-3": "Aiguille balistique 3 mm",
  "TRANQ-13": "Dard tranquillisant 13 mm",
  "HARP-20": "Harpon 20 mm",
  "EM-4": "Fléchette ferromagnétique 4 mm",
  "GAUSS-8": "Pénétrateur Gauss 8 mm",
  "GL-40B": "Grenade 40 × 46 mm",
  "ROQ-70": "Roquette 70 mm",
  "MIS-90": "Missile guidé 90 mm",
} as const;

export const ARMOR_KINDS = {
  underlayer: "Sous-couche",
  light: "Armure légère",
  intermediate: "Armure intermédiaire",
  heavy: "Armure lourde",
  exo: "Exo-armure",
  underhelmet: "Sous-casque",
  helmet: "Casque ou coiffe mécanique",
  arms: "Protections de bras",
  legs: "Jambières",
  eva: "Combinaison EVA",
  barrier: "Champ ou barrière",
} as const;

export const COVERAGE_ZONES = {
  head: "Tête",
  face: "Visage",
  neck: "Cou",
  torso: "Torse",
  abdomen: "Abdomen",
  arms: "Bras",
  hands: "Mains",
  legs: "Jambes",
  feet: "Pieds",
  fullBody: "Corps complet",
} as const;

export const ENVIRONMENT_PROTECTIONS = {
  vacuum: "Vide",
  pressure: "Pression",
  thermal: "Températures extrêmes",
  radiation: "Rayonnements",
  chemical: "Agents chimiques",
  biological: "Agents biologiques",
  underwater: "Milieu subaquatique",
} as const;

export const BARRIER_KINDS = {
  personal: "Champ personnel",
  directional: "Champ directionnel",
  zone: "Champ de zone",
  structural: "Barrière structurelle",
} as const;

export const CURRENCIES = {
  credits: "Crédits",
} as const;

export const EQUIP_TIMES = {
  free: "Activation libre",
  oneAction: "1 Action",
  twoActions: "2 Actions",
  threeActions: "3 Actions",
  oneRound: "1 round",
  oneMinute: "1 minute",
  tenMinutes: "10 minutes",
  assistance: "Procédure avec assistance",
} as const;

export const AMMUNITION_FAMILIES = {
  ballistic: "Cartouche balistique",
  shotgun: "Cartouche de fusil",
  dart: "Dard ou aiguille",
  arrow: "Flèche ou carreau",
  projectile: "Projectile spécialisé",
  grenade: "Grenade ou roquette",
  battery: "Cellule ou batterie énergétique",
  technomagical: "Charge techno-magique",
  pranaCrystal: "Cristal de Prana",
} as const;

export const AMMUNITION_VARIANTS = {
  standard: "Standard",
  subsonic: "Subsonique",
  tracer: "Traçante",
  penetrating: "Pénétrante",
  nonlethal: "Non létale",
  incendiary: "Incendiaire",
  cryogenic: "Cryogénique",
  electricEmp: "Électrique ou EMP",
  explosive: "Explosive",
  chemical: "Chimique ou toxique",
  technomagical: "Techno-magique",
  buckshot: "Chevrotine",
  slug: "Balle de cartouche",
  breaching: "Projectile de brèche",
} as const;

export const RECHARGE_METHODS = {
  none: "Non rechargeable",
  charger: "Chargeur compatible",
  generator: "Générateur compatible",
  station: "Station de recharge",
  external: "Alimentation externe",
  technomagical: "Procédure techno-magique référencée",
} as const;

export const DURATIONS = {
  instant: "Instantané",
  oneRound: "1 round",
  oneMinute: "1 minute",
  tenMinutes: "10 minutes",
  oneHour: "1 heure",
  eightHours: "8 heures",
  oneDay: "1 jour",
  persistent: "Persistant selon sa source",
} as const;

export const CONSUMABLE_DOSES = {
  unit: "Une unité",
  tablet: "Un comprimé",
  inhalation: "Une inhalation",
  injection: "Une injection",
  infusion: "Une perfusion",
  application: "Une application cutanée",
  sip: "Une gorgée",
} as const;

export const TREATMENT_FAMILIES = {
  analgesic: "Antalgique",
  antibiotic: "Antibiotique",
  antidote: "Antidote",
  stimulant: "Stimulant",
  sedative: "Sédatif",
  antiradiation: "Antiradiation",
  regeneration: "Régénération",
  detoxification: "Détoxification",
} as const;

export const ACTIVATION_METHODS = {
  immediate: "Immédiate",
  manual: "Manuelle",
  timer: "Minuteur",
  proximity: "Proximité",
  remote: "À distance",
  impact: "Impact",
  pressure: "Pression",
  command: "Commande autorisée",
} as const;

export const AREA_SHAPES = {
  none: "Aucune zone",
  explosion1: "Explosion 1",
  explosion2: "Explosion 2",
  explosion3: "Explosion 3",
  cone4: "Cône 4",
  cone8: "Cône 8",
  line3: "Ligne 3",
  cloud2: "Nuage rayon 2",
  cloud3: "Nuage rayon 3",
} as const;

export const SAFETY_STATES = {
  usable: "Utilisable",
  uncertain: "Incertain",
  contaminated: "Contaminé",
  expired: "Périmé",
} as const;

export type WeaponFamily = keyof typeof WEAPON_FAMILIES;
export type TechnoBladeVariant = keyof typeof TECHNO_BLADE_VARIANTS;

export function labelsWithBlank(
  values: Record<string, string>,
  blank = "Non renseigné",
): Record<string, string> {
  return { "": blank, ...values };
}

export function allowedFeedKinds(
  family: string,
  technoBladeVariant = "",
): readonly string[] {
  if (family === "energyLongGun") return ["energy"];
  if (family === "martialTechnoBlade" && technoBladeVariant)
    return [requiredTechnoBladeFeed(technoBladeVariant) ?? "none"];
  if (family === "martialTechnoBlade")
    return ["none", "energy", "pranaCrystal"];
  if (family === "handgun")
    return ["none", "chamber", "internal", "detachable", "energy", "hybrid"];
  if (
    ["improvisedMelee", "bowCrossbowThrown", "naturalSpecial"].includes(family)
  )
    return ["none", "chamber", "internal", "energy", "pranaCrystal"];
  return ["none", "chamber", "internal", "detachable", "energy", "hybrid"];
}

/** Le côté physique d'une alimentation hybride reste explicite. */
export function physicalFeedKind(
  feedKind: string,
  hybridPhysicalFeedKind = "",
): string {
  return feedKind === "hybrid" ? hybridPhysicalFeedKind : feedKind;
}

export function allowedAmmunitionFamilies(
  family: string,
  technoBladeVariant = "",
): readonly string[] {
  if (family === "energyLongGun") return ["battery", "technomagical"];
  if (family === "martialTechnoBlade" && technoBladeVariant === "pranaCrystal")
    return ["pranaCrystal"];
  if (
    family === "martialTechnoBlade" &&
    ["vibratoryMaterial", "retractableConductor"].includes(technoBladeVariant)
  )
    return ["battery"];
  if (family === "martialTechnoBlade") return ["battery", "pranaCrystal"];
  if (family === "physicalLongGun")
    return ["ballistic", "shotgun", "dart", "projectile", "grenade"];
  if (family === "bowCrossbowThrown") return ["arrow", "projectile"];
  if (family === "heavyLauncher")
    return ["ballistic", "grenade", "projectile", "battery"];
  return Object.keys(AMMUNITION_FAMILIES);
}

export function requiredTechnoBladeFeed(
  variant: string,
): "energy" | "pranaCrystal" | null {
  if (["vibratoryMaterial", "retractableConductor"].includes(variant))
    return "energy";
  if (variant === "pranaCrystal") return "pranaCrystal";
  return null;
}
