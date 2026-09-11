import { ITEM_TYPES } from "../config";

export interface ItemFieldApplicability {
  level: boolean;
  quality: boolean;
  rarity: boolean;
  legality: boolean;
  manufacturer: boolean;
  referencePrice: boolean;
}

const NONE: ItemFieldApplicability = {
  level: false,
  quality: false,
  rarity: false,
  legality: false,
  manufacturer: false,
  referencePrice: false,
};

const LEVELLED: ItemFieldApplicability = { ...NONE, level: true };
const PERSONAL_CATALOG: ItemFieldApplicability = {
  level: true,
  quality: true,
  rarity: true,
  legality: true,
  manufacturer: true,
  referencePrice: true,
};
const MATERIAL_CATALOG: ItemFieldApplicability = {
  ...PERSONAL_CATALOG,
  level: false,
};
const PLATFORM_CATALOG: ItemFieldApplicability = { ...PERSONAL_CATALOG };

/**
 * Visibility contract for the shared Item sheet. This controls presentation,
 * not storage: later specialised sheets may consume currently hidden fields.
 */
export const ITEM_FIELD_APPLICABILITY: Record<
  (typeof ITEM_TYPES)[number],
  ItemFieldApplicability
> = {
  ancestry: NONE,
  profile: NONE,
  origin: NONE,
  advantage: NONE,
  drawback: NONE,
  path: NONE,
  specialization: NONE,
  post: NONE,
  talent: LEVELLED,
  action: NONE,
  power: LEVELLED,
  conditionTemplate: NONE,
  weapon: PERSONAL_CATALOG,
  armor: PERSONAL_CATALOG,
  equipment: PERSONAL_CATALOG,
  consumable: PERSONAL_CATALOG,
  ammunition: PERSONAL_CATALOG,
  resource: MATERIAL_CATALOG,
  container: MATERIAL_CATALOG,
  hull: PLATFORM_CATALOG,
  module: PLATFORM_CATALOG,
  installation: PLATFORM_CATALOG,
  project: NONE,
  research: NONE,
  stratagem: NONE,
  document: NONE,
};

export function itemFieldApplicability(type: string): ItemFieldApplicability {
  return ITEM_FIELD_APPLICABILITY[type as (typeof ITEM_TYPES)[number]] ?? NONE;
}

export function hasCatalogFields(value: ItemFieldApplicability): boolean {
  return Object.values(value).some(Boolean);
}

/*
 * Canonical trait vocabulary extracted from the validated rules Bible. The
 * stored value is a stable accent-free slug; labels remain French UI text.
 */
const CANONICAL_TRAIT_LABELS = `
Acrobaties
Adaptation
Adoption
Affadissement
Affinité
Aide
Air
Altération
Analyse
Animal
Anomalie
Appendice
Apprentissage
Architecture
Archive
Arme
Arme naturelle
Armes lourdes
Armure
Artisanat
Ascendance
Ascendance universelle
Atelier
Athlétisme
Attaque
Audition
Augmentation
Aura
Automatisation
Avertissement
Beastkin
Besoin vital
Biologique
Biosphère
Calcul
Camouflage
Camp
Canalisation
Capteur
Catalyseur
Chance
Chien
Chimique
Châssis
Collective
Combat
Commandement
Commerce
Communauté
Communication
Compétence
Concentration
Connaissance
Conscience
Conseil
Construction
Continuité
Contrat
Contrôle
Convergence
Coopération
Coordination
Corne
Corruption
Cryostase
Culture
Curiosité
Demi-Beastkin
Demi-Elfe
Demi-Gnome
Demi-Nain
Dextérité
Diagnostic
Diaspora
Diplomatie
Discrétion
Duplicat
Découverte
Défense
Défense numérique
Démolition
Déplacement
Déplacement forcé
Détection
Effort
Elfe
Elman
Embuscade
Encombrement
Endurance
Environnement
Esman
Exode
Exploration
Expression parentale
Fabrication
Feu-follet
Filature
Flux
Force
Formation
Fortune
Fusion
Félin
Garde
Gnome
Gravité
Guérison
Général
Humain
Héritage
IAA
Identité
Illusion
Impact
Improvisation
Incarnée
Informatique
Ingénierie
Initiative
Innée
Instinct
Institution
Interaction
Interface
Intimidation
Inventaire
Invention
Investigation
Langage
Langue
Libération
Linguistique
Logistique
Loup
Lumière
Légendaire
Lézard
Magie
Maintenance
Mana
Manipulation
Manœuvre
Masse
Maîtrise
Mental
Minage
Mobilité
Module
Morphologie
Mouvement
Mutation
Mythique
Médecine
Mémoire
Métabolisme
Métamorphose
Méthode
Mêlée
Nage
Nain
Nature
Navigation
Noyau
Observation
Odorat
Orientation
Ours
Outil
Partenariat
Passion
Perception
Petit
Physiologie
Physiologie artificielle
Physique
Pilotage
Pistage
Poison
Positionnement
Possession
Poste
Posture
Posture corporelle
Poursuite
Prana
Protection
Prototype
Précepte
Précision
Prédation
Préparation
Présence
Queue
Rechargement
Recherche
Renard
Repos
Respiration
Ressource
Risque
Rituel
Ruse
Réaction
Récupération
Réflexes
Réparation
Répliquée
Réseau
Réserve
Résilience
Résistance
Saignement
Sang-froid
Sauvegarde
Sauvetage
Sciences
Serment
Social
Soin
Soins
Souris
Soutien
Spiritualité
Spécialisation
Spécialité
Stabilisation
Stabilité
Stress
Structure
Surcharge
Surmenage
Survie
Synchronisation
Synthèse
Systèmes de vaisseau
Sécurité
Tactique
Technique
Techno-magie
Techno-magique
Technologie
Temps
Territoire
Thermique
Tir
Traces
Tradition
Traitement
Transcendance
Transfert
Transformation
Traumatisme
Travail d'équipe
Tromperie
Téléportation
Utilitaire
UV
Vaisseau
Vampirique
Vibration
Vigilance
Vigueur
Visuel
Visée
Vitalité
Vivant
Voie
Volonté
Voyage
Vulpin
Xénologie
Zone
Âge
Écarlate
Échantillon
Élément
Émotion
Énergie
Équilibre
Équipage
Équipement
Évolution
`
  .trim()
  .split("\n");

export function traitId(label: string): string {
  return label
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("fr-FR")
    .replace(/[’']/gu, "-")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

export const TRAIT_CATALOG = CANONICAL_TRAIT_LABELS.map((label) => ({
  id: traitId(label),
  label,
}));

const TRAIT_LABEL_BY_ID = new Map(
  TRAIT_CATALOG.map(({ id, label }) => [id, label]),
);
const TRAIT_ID_BY_LABEL = new Map(
  TRAIT_CATALOG.map(({ id, label }) => [label.toLocaleLowerCase("fr-FR"), id]),
);

export function normalizeTraitIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      if (TRAIT_LABEL_BY_ID.has(entry)) return entry;
      return TRAIT_ID_BY_LABEL.get(entry.toLocaleLowerCase("fr-FR")) ?? entry;
    });
  return Array.from(new Set(normalized));
}

export function traitLabel(value: string): string {
  return TRAIT_LABEL_BY_ID.get(value) ?? value;
}

export function traitChoices(
  selected: unknown,
): Array<{ value: string; label: string; selected: boolean; legacy: boolean }> {
  const values = normalizeTraitIds(selected);
  const canonical = TRAIT_CATALOG.map(({ id, label }) => ({
    value: id,
    label,
    selected: values.includes(id),
    legacy: false,
  }));
  const legacy = values
    .filter((value) => !TRAIT_LABEL_BY_ID.has(value))
    .map((value) => ({
      value,
      label: `${value} — ancien trait`,
      selected: true,
      legacy: true,
    }));
  return [...canonical, ...legacy];
}
