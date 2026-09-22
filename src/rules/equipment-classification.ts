/** UI taxonomy, not new canonical Items or bonuses. Empty form preserves old data. */
export const EQUIPMENT_CATEGORIES: Record<string, string> = {
  "": "À classer selon la source",
  underclothing: "Sous-couche vestimentaire",
  accessory: "Accessoire personnel",
  tool: "Outil ou trousse",
  medical: "Matériel médical",
  survival: "Survie et campement",
  communication: "Communication",
  sensor: "Capteur",
  terminal: "Terminal / Datapad",
  security: "Sécurité",
  generator: "Générateur de champ",
  power: "Alimentation électrique",
  focus: "Focalisateur",
  module: "Module à installer",
  storage: "Portage et rangement",
  document: "Document ou badge matériel",
};
export interface WearForm {
  label: string;
  slots: string[];
  types: string[];
  ornamental?: boolean;
}
const accessories = ["equipment", "container"];
const form = (
  label: string,
  slots: string[] = [],
  types = accessories,
  ornamental = false,
): WearForm => ({ label, slots, types, ornamental });
export const WEAR_FORMS: Record<string, WearForm> = {
  none: form(
    "Sans port corporel",
    [],
    [
      "weapon",
      "armor",
      "equipment",
      "container",
      "consumable",
      "resource",
      "ammunition",
    ],
  ),
  shield: form("Bouclier", ["shield"], ["weapon"]),
  underlayer: form("Sous-couche défensive", ["underlayer"], ["armor"]),
  armor: form("Armure principale", ["armor"], ["armor"]),
  underhelmet: form("Sous-casque", ["underhelmet"], ["armor"]),
  helmet: form("Casque", ["helmet"], ["armor"]),
  arms: form("Protections de bras", ["arms"], ["armor"]),
  legs: form("Jambières", ["legs"], ["armor"]),
  coif: form("Coiffe / diadème", ["helmet"], accessories, true),
  eyes: form("Lunettes / dispositif oculaire"),
  face: form("Masque / appareil facial"),
  ears: form("Dispositif auriculaire"),
  eyesEars: form("Kit de protection yeux et oreilles"),
  necklace: form("Collier", ["necklace"], accessories, true),
  cape: form("Cape / manteau extérieur", ["cape"]),
  top: form("Vêtement du haut"),
  bottom: form("Vêtement du bas"),
  clothing: form(
    "Tenue complète / combinaison civile",
    [],
    [...accessories, "consumable"],
  ),
  gloves: form("Paire de gants", ["gloves"]),
  bracelet: form("Bracelet", ["bracelet"], accessories, true),
  ring: form("Anneau", ["ring"], accessories, true),
  belt: form("Ceinture", ["belt"]),
  harness: form("Harnais"),
  shoes: form("Paire de chaussures / bottes"),
  back: form("Appareil dorsal"),
  bag: form("Sac / sacoche"),
  badge: form("Badge / broche / insigne"),
  earringLeft: form("Boucle d’oreille gauche", ["earLeft"], accessories, true),
  earringRight: form(
    "Boucle d’oreille droite",
    ["earRight"],
    accessories,
    true,
  ),
  piercing: form("Piercing à emplacement défini", [], accessories, true),
};
export const PIERCING_LOCATIONS: Record<string, string> = {
  earLeft: "Oreille gauche",
  earRight: "Oreille droite",
  brow: "Arcade",
  nose: "Nez",
  lip: "Lèvre",
  tongue: "Langue",
  navel: "Nombril",
  other: "Autre emplacement anatomique",
};
export function wearForms(type: string) {
  return Object.fromEntries(
    Object.entries(WEAR_FORMS).filter(([, value]) =>
      value.types.includes(type),
    ),
  );
}
export function effectiveBodySlots(profile: Record<string, any>): string[] {
  if (profile.wearForm && profile.wearForm !== "composite") {
    const selected = WEAR_FORMS[profile.wearForm];
    if (!selected) return [];
    if (profile.ornamental && selected.ornamental) return [];
    if (profile.wearForm === "piercing")
      return profile.piercingLocation
        ? [`piercing_${profile.piercingLocation}`]
        : [];
    return [...selected.slots];
  }
  return Array.isArray(profile.bodySlots)
    ? [...new Set<string>(profile.bodySlots)]
    : [];
}
export function classificationErrors(
  profile: Record<string, any>,
  type?: string,
): string[] {
  const errors: string[] = [];
  const selected = profile.wearForm;
  if (
    profile.shieldHands != null &&
    (!Number.isInteger(profile.shieldHands) ||
      profile.shieldHands < 0 ||
      profile.shieldHands > 2)
  )
    errors.push("Mains du bouclier : entier entre 0 et 2 requis.");
  if (
    selected &&
    selected !== "composite" &&
    (!WEAR_FORMS[selected] ||
      (type && !WEAR_FORMS[selected]!.types.includes(type)))
  )
    errors.push("Forme de port incompatible avec le type d’objet.");
  if (
    selected === "piercing" &&
    !Object.hasOwn(PIERCING_LOCATIONS, profile.piercingLocation ?? "")
  )
    errors.push("Choisir l’emplacement du piercing.");
  if (profile.ornamental && !WEAR_FORMS[selected]?.ornamental)
    errors.push(
      "La dispense décorative concerne uniquement les ornements personnels.",
    );
  if (
    profile.functionalCategory &&
    !Object.hasOwn(EQUIPMENT_CATEGORIES, profile.functionalCategory)
  )
    errors.push("Famille fonctionnelle inconnue.");
  if (profile.functionalCategory === "underclothing" && type !== "equipment")
    errors.push("La sous-couche vestimentaire appartient aux Équipements.");
  if (
    !selected &&
    ["equipment", "container"].includes(type ?? "") &&
    effectiveBodySlots(profile).length > 1
  )
    errors.push(
      "Ancien accessoire à plusieurs formes : choisir une forme unique ou faire définir un profil composé par le MJ.",
    );
  return errors;
}
/** Owners can use GM-authored composites but cannot author or alter them. */
export function assertProfilePermission(
  before: Record<string, any>,
  after: Record<string, any>,
  isGM: boolean,
) {
  if (isGM) return;
  if (
    after.wearForm !== "composite" &&
    Array.isArray(after.bodySlots) &&
    after.bodySlots.length > 1 &&
    JSON.stringify(before.bodySlots) !== JSON.stringify(after.bodySlots)
  )
    throw new Error("Une occupation composée doit être définie par le MJ.");
  const advanced = ["ornamental", "shieldHands"];
  if (
    advanced.some(
      (key) =>
        JSON.stringify(before[key] ?? (key === "ornamental" ? false : null)) !==
        JSON.stringify(after[key] ?? (key === "ornamental" ? false : null)),
    ) ||
    ((before.wearForm === "composite" || after.wearForm === "composite") &&
      JSON.stringify(before) !== JSON.stringify(after))
  )
    throw new Error(
      "Seul le MJ peut modifier un profil composé ou sa dispense décorative et les mains d’un bouclier.",
    );
}
