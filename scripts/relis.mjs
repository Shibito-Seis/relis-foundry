//#region src/config.ts
var SYSTEM_ID = "relis";
var PACKAGE_VERSION = "0.5.4";
var RULES_VERSION = "1.0.0";
var CONTENT_VERSION = "1.0.0";
var ACTOR_TYPES = [
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
	"settlement"
];
var ITEM_TYPES = [
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
	"document"
];
var JOURNAL_PAGE_TYPES = [
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
	"register"
];
var ATTRIBUTE_LABELS = {
	force: "Force",
	dexterity: "Dextérité",
	vigor: "Vigueur",
	intelligence: "Intelligence",
	technology: "Technologie",
	presence: "Présence",
	willpower: "Volonté",
	magicMastery: "Maîtrise Magique"
};
var SKILL_DEFINITIONS = {
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
	deception: ["Tromperie", "presence"]
};
var MASTERY_BONUSES = {
	untrained: 0,
	trained: 2,
	expert: 4,
	master: 6,
	legendary: 8,
	mythic: 12
};
var MASTERY_LABELS = {
	untrained: "Inexpérimenté",
	trained: "Qualifié",
	expert: "Expert",
	master: "Maître",
	legendary: "Légendaire",
	mythic: "Mythique"
};
//#endregion
//#region src/rules/check.ts
var DEGREE_ORDER = [
	"criticalFailure",
	"failure",
	"success",
	"criticalSuccess"
];
function masteryBonus(rank) {
	return MASTERY_BONUSES[rank] ?? 0;
}
function shiftDegree(degree, steps) {
	const current = DEGREE_ORDER.indexOf(degree);
	return DEGREE_ORDER[Math.max(0, Math.min(DEGREE_ORDER.length - 1, current + steps))] ?? degree;
}
function resolveCheck(input) {
	const { difficulty, natural, total } = input;
	let baseDegree;
	if (total >= difficulty + 10) baseDegree = "criticalSuccess";
	else if (total >= difficulty) baseDegree = "success";
	else if (total <= difficulty - 10) baseDegree = "criticalFailure";
	else baseDegree = "failure";
	const naturalShift = natural === 20 ? 1 : natural === 1 ? -1 : 0;
	return {
		...input,
		baseDegree,
		degree: shiftDegree(baseDegree, naturalShift)
	};
}
function degreeLabel(degree) {
	return {
		criticalFailure: "Échec critique",
		failure: "Échec",
		success: "Réussite",
		criticalSuccess: "Réussite critique"
	}[degree];
}
//#endregion
//#region src/rules/health.ts
var CURRENT_PATH = "system.health.hitPoints.current";
var MAXIMUM_PATH = "system.health.hitPoints.maximum";
var STRESS_CURRENT_PATH = "system.health.stress.current";
function finiteInteger(value, fallback) {
	const number = Number(value);
	return Number.isFinite(number) ? Math.trunc(number) : fallback;
}
function readPath(source, path) {
	if (Object.hasOwn(source, path)) return source[path];
	return path.split(".").reduce((value, key) => value?.[key], source);
}
function hasPath(source, path) {
	if (Object.hasOwn(source, path)) return true;
	const keys = path.split(".");
	let value = source;
	for (const key of keys) {
		if (value === null || typeof value !== "object" || !Object.hasOwn(value, key)) return false;
		value = value[key];
	}
	return true;
}
function writePath(source, path, value) {
	if (Object.keys(source).some((key) => key.includes("."))) {
		source[path] = value;
		return;
	}
	const keys = path.split(".");
	let target = source;
	for (const key of keys.slice(0, -1)) {
		const child = target[key];
		if (child === null || typeof child !== "object" || Array.isArray(child)) target[key] = {};
		target = target[key];
	}
	target[keys.at(-1) ?? path] = value;
}
function clampHitPoints(current, maximum) {
	const safeMaximum = Math.max(1, finiteInteger(maximum, 1));
	return {
		current: Math.max(0, Math.min(safeMaximum, finiteInteger(current, 0))),
		maximum: safeMaximum
	};
}
function constrainHitPointUpdate(existing, change) {
	const currentChanged = hasPath(change, CURRENT_PATH);
	const maximumChanged = hasPath(change, MAXIMUM_PATH);
	if (!currentChanged && !maximumChanged) return;
	const next = clampHitPoints(currentChanged ? readPath(change, CURRENT_PATH) : existing.current, maximumChanged ? readPath(change, MAXIMUM_PATH) : existing.maximum);
	if (maximumChanged) writePath(change, MAXIMUM_PATH, next.maximum);
	if (currentChanged || next.current !== existing.current) writePath(change, CURRENT_PATH, next.current);
}
function constrainStressUpdate(existingCurrent, maximum, change) {
	if (!hasPath(change, STRESS_CURRENT_PATH)) return;
	const safeMaximum = Math.max(0, finiteInteger(maximum, 0));
	writePath(change, STRESS_CURRENT_PATH, Math.max(0, Math.min(safeMaximum, finiteInteger(readPath(change, STRESS_CURRENT_PATH), existingCurrent))));
}
//#endregion
//#region src/data/person-defaults.ts
function initialReference$1() {
	return {
		relisId: "",
		uuid: "",
		documentName: "",
		type: "",
		state: "unresolved",
		labelSnapshot: "",
		missingPolicy: "diagnose"
	};
}
function initialBody() {
	return {
		id: "primary",
		name: "Corps principal",
		nature: "biological",
		architecture: "",
		size: "medium",
		criticalFunctions: [],
		locations: [{
			id: "core",
			sort: 0,
			status: "active",
			value: "Zone centrale",
			visibility: "document"
		}],
		needs: [],
		integratedItemRefs: []
	};
}
function initialPresentation() {
	return {
		id: "identity",
		name: "Portrait identitaire",
		category: "identity",
		portrait: {
			path: "",
			kind: "portrait",
			alt: "",
			caption: "",
			source: "",
			visibility: "document"
		},
		token: {
			path: "",
			kind: "token",
			alt: "",
			caption: "",
			source: "",
			visibility: "document"
		},
		bodyIds: ["primary"],
		availability: "available",
		sourceRef: initialReference$1(),
		associatedPresentationId: "",
		active: true,
		favorite: true,
		notes: ""
	};
}
function isRecord(value) {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}
function normalizeBody(value) {
	const fallback = initialBody();
	const body = isRecord(value) ? value : {};
	const locations = Array.isArray(body.locations) && body.locations.length > 0 ? body.locations : fallback.locations;
	return {
		...fallback,
		...body,
		criticalFunctions: Array.isArray(body.criticalFunctions) ? body.criticalFunctions : [],
		locations,
		needs: Array.isArray(body.needs) ? body.needs : [],
		integratedItemRefs: Array.isArray(body.integratedItemRefs) ? body.integratedItemRefs : []
	};
}
function normalizePresentation(value) {
	const fallback = initialPresentation();
	const presentation = isRecord(value) ? value : {};
	const fallbackPortrait = fallback.portrait;
	const fallbackToken = fallback.token;
	const fallbackSourceRef = fallback.sourceRef;
	return {
		...fallback,
		...presentation,
		portrait: {
			...fallbackPortrait,
			...isRecord(presentation.portrait) ? presentation.portrait : {}
		},
		token: {
			...fallbackToken,
			...isRecord(presentation.token) ? presentation.token : {}
		},
		bodyIds: Array.isArray(presentation.bodyIds) ? presentation.bodyIds : ["primary"],
		sourceRef: {
			...fallbackSourceRef,
			...isRecord(presentation.sourceRef) ? presentation.sourceRef : {}
		},
		associatedPresentationId: typeof presentation.associatedPresentationId === "string" ? presentation.associatedPresentationId : ""
	};
}
function normalizePersonSource(source) {
	source.bodies = Array.isArray(source.bodies) && source.bodies.length > 0 ? source.bodies.map(normalizeBody) : [initialBody()];
	source.activeBodyId = typeof source.activeBodyId === "string" && source.activeBodyId.length > 0 ? source.activeBodyId : String(source.bodies[0]?.id ?? "primary");
	source.presentations = Array.isArray(source.presentations) && source.presentations.length > 0 ? source.presentations.map(normalizePresentation) : [initialPresentation()];
	return source;
}
//#endregion
//#region src/rules/equipment-slots.ts
/** Bible 41.137: occupancy is distinct from protective coverage. */
var BODY_SLOTS = {
	underlayer: "Sous-couche corporelle",
	armor: "Armure principale",
	underhelmet: "Sous-casque",
	helmet: "Casque principal",
	arms: "Protections de bras",
	legs: "Jambières",
	shield: "Bouclier porté"
};
/** Bible 41.53: a host provides quantities, a module requires quantities. */
var TECHNICAL_SLOTS = {
	muzzle: "Bouche",
	barrel: "Canon",
	optic: "Optique",
	underbarrel: "Sous-canon",
	stock: "Crosse ou poignée",
	internal: "Interne",
	power: "Alimentation",
	utility: "Utilitaire",
	plates: "Plaques",
	mobility: "Mobilité",
	sensors: "Capteurs",
	environment: "Environnement",
	interface: "Interface",
	edge: "Bord",
	projector: "Projecteur"
};
function bodySlots(profile) {
	return Array.isArray(profile.bodySlots) ? [...new Set(profile.bodySlots)] : [];
}
function legacySlot(profile) {
	return !profile.slotsConfigured ? String(profile.slot ?? "").trim() : "";
}
function slotProfileErrors(profile) {
	const errors = [];
	if (profile.bodySlots != null && !Array.isArray(profile.bodySlots)) errors.push("Liste d’emplacements corporels invalide.");
	for (const key of bodySlots(profile)) if (!Object.hasOwn(BODY_SLOTS, key)) errors.push(`Emplacement corporel inconnu : ${key}.`);
	for (const field of ["requiredSlots", "providedSlots"]) for (const [key, value] of Object.entries(profile[field] ?? {})) if (!Object.hasOwn(TECHNICAL_SLOTS, key) || !Number.isSafeInteger(value) || Number(value) < 0) errors.push(`Emplacement technique invalide : ${key} (entier positif ou nul requis).`);
	return errors;
}
function installedOn(item, host) {
	const ref = item.system.physical?.hostRef;
	return item.system.physical?.equipState === "installed" && Boolean(ref?.uuid && host.uuid && ref.uuid === host.uuid || ref?.relisId && host.system.meta?.relisId && ref.relisId === host.system.meta.relisId);
}
function technicalUsage(items, host, excludeId = "") {
	const used = {};
	for (const item of items) {
		if (item.id === excludeId || !installedOn(item, host)) continue;
		for (const [key, value] of Object.entries(item.system.physical?.equipmentProfile?.requiredSlots ?? {})) used[key] = (used[key] ?? 0) + Number(value);
	}
	return used;
}
function installationSlotErrors(items, item, host) {
	const p = item.system.physical?.equipmentProfile ?? {}, h = host.system.physical?.equipmentProfile ?? {};
	const errors = slotProfileErrors(h);
	if (legacySlot(p)) errors.push("Ancien emplacement d’installation à reconfigurer dans la fiche Item.");
	if (items.some((entry) => entry.id !== item.id && installedOn(entry, host) && legacySlot(entry.system.physical?.equipmentProfile ?? {}))) errors.push("Reconfigurer les anciens emplacements des modules déjà installés sur cet hôte.");
	const used = technicalUsage(items, host, item.id);
	for (const key of Object.keys(TECHNICAL_SLOTS)) {
		const required = Number(p.requiredSlots?.[key] ?? 0);
		const occupied = used[key] ?? 0, capacity = Number(h.providedSlots?.[key] ?? 0);
		if (!Number.isFinite(occupied) || occupied + required > capacity) errors.push(`${TECHNICAL_SLOTS[key]} sur ${host.name} : ${required} requis, ${occupied} occupé(s), ${capacity} disponible(s) au total.`);
	}
	return errors;
}
function slotSummary(profile) {
	if (legacySlot(profile)) return `Ancien emplacement à reconfigurer : ${legacySlot(profile)}`;
	return bodySlots(profile).map((key) => BODY_SLOTS[key] ?? `Inconnu : ${key}`).join(" + ") || "Aucun emplacement corporel déclaré";
}
function technicalSummary(profile, field) {
	return Object.entries(profile[field] ?? {}).filter(([, n]) => Number(n) > 0).map(([key, n]) => `${TECHNICAL_SLOTS[key] ?? key} × ${n}`).join(" ; ") || "Aucun";
}
//#endregion
//#region src/utils/ulid.ts
var CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
function encodeTime(time) {
	let value = Math.max(0, Math.floor(time));
	let output = "";
	for (let index = 0; index < 10; index += 1) {
		output = CROCKFORD[value % 32] + output;
		value = Math.floor(value / 32);
	}
	return output;
}
function encodeRandom() {
	const bytes = /* @__PURE__ */ new Uint8Array(16);
	globalThis.crypto.getRandomValues(bytes);
	return Array.from(bytes, (byte) => CROCKFORD[byte & 31]).join("");
}
function createRelisId(now = Date.now()) {
	return `${encodeTime(now)}${encodeRandom()}`;
}
//#endregion
//#region src/rules/physical-mass.ts
/** Explicit catalogue mass wins; unknown mass is never silently zero. */
function physicalUnitMass(p) {
	if (p.massEach !== null && p.massEach !== void 0 && p.massEach !== "") {
		const mass = Number(p.massEach);
		return Number.isFinite(mass) && mass >= 0 ? mass : null;
	}
	if (p.unit === "kg") return 1;
	if (p.unit === "g") return .001;
	if (p.equipmentProfile?.ordinaryLiquid === true) {
		if (p.unit === "l") return 1;
		if (p.unit === "ml") return .001;
	}
	return null;
}
//#endregion
//#region src/data/item-catalog.ts
/**
* Human-readable labels for the numeric values stored by the shared Item
* schema. Codes remain an implementation detail and are never used as UI
* labels.
*/
var QUALITY_GRADE_LABELS = [
	"Improvisée",
	"Rustique",
	"Standard",
	"Précision",
	"Supérieure",
	"Exceptionnelle"
];
var STRUCTURAL_RARITY_LABELS = [
	"Ubiquitaire",
	"Commune",
	"Spécialisée",
	"Peu commune",
	"Rare",
	"Exceptionnelle",
	"Singulière"
];
var NONE = {
	level: false,
	quality: false,
	rarity: false,
	legality: false,
	manufacturer: false,
	referencePrice: false
};
var LEVELLED = {
	...NONE,
	level: true
};
var PERSONAL_CATALOG = {
	level: true,
	quality: true,
	rarity: true,
	legality: true,
	manufacturer: true,
	referencePrice: true
};
var MATERIAL_CATALOG = {
	...PERSONAL_CATALOG,
	level: false
};
var PLATFORM_CATALOG = { ...PERSONAL_CATALOG };
/**
* Visibility contract for the shared Item sheet. This controls presentation,
* not storage: later specialised sheets may consume currently hidden fields.
*/
var ITEM_FIELD_APPLICABILITY = {
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
	document: NONE
};
function itemFieldApplicability(type) {
	return ITEM_FIELD_APPLICABILITY[type] ?? NONE;
}
function hasCatalogFields(value) {
	return Object.values(value).some(Boolean);
}
var CANONICAL_TRAIT_LABELS = `
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
`.trim().split("\n");
function traitId(label) {
	return label.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr-FR").replace(/[’']/gu, "-").replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "");
}
var TRAIT_CATALOG = CANONICAL_TRAIT_LABELS.map((label) => ({
	id: traitId(label),
	label
}));
var TRAIT_LABEL_BY_ID = new Map(TRAIT_CATALOG.map(({ id, label }) => [id, label]));
var TRAIT_ID_BY_LABEL = new Map(TRAIT_CATALOG.map(({ id, label }) => [label.toLocaleLowerCase("fr-FR"), id]));
function normalizeTraitIds(value) {
	if (!Array.isArray(value)) return [];
	const normalized = value.filter((entry) => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean).map((entry) => {
		if (TRAIT_LABEL_BY_ID.has(entry)) return entry;
		return TRAIT_ID_BY_LABEL.get(entry.toLocaleLowerCase("fr-FR")) ?? entry;
	});
	return Array.from(new Set(normalized));
}
function traitLabel(value) {
	return TRAIT_LABEL_BY_ID.get(value) ?? value;
}
function traitChoices(selected) {
	const values = normalizeTraitIds(selected);
	const canonical = TRAIT_CATALOG.map(({ id, label }) => ({
		value: id,
		label,
		selected: values.includes(id),
		legacy: false
	}));
	const legacy = values.filter((value) => !TRAIT_LABEL_BY_ID.has(value)).map((value) => ({
		value,
		label: `${value} — ancien trait`,
		selected: true,
		legacy: true
	}));
	return [...canonical, ...legacy];
}
//#endregion
//#region src/data/item-defaults.ts
var PHYSICAL_ITEM_TYPES = [
	"weapon",
	"armor",
	"equipment",
	"consumable",
	"ammunition",
	"resource",
	"container"
];
var LEGALITY_STATES = [
	"free",
	"declared",
	"regulated",
	"reserved",
	"military",
	"sovereign",
	"prohibited",
	"unrecognized"
];
var EQUIP_STATES = [
	"stored",
	"carried",
	"readied",
	"equipped",
	"installed",
	"ground"
];
var OWNERSHIP_STATES = [
	"owned",
	"loaned",
	"issued",
	"held",
	"evidence"
];
var ACCESSIBILITY_STATES = [
	"ready",
	"accessible",
	"stored",
	"distant",
	"unavailable"
];
var CONTAINER_ACCESS_RULES = [
	"normal",
	"quick",
	"restricted",
	"sealed"
];
var ITEM_CONDITIONS = [
	"intact",
	"worn",
	"damaged",
	"broken",
	"destroyed"
];
var UPGRADE_STATES = [
	"current",
	"sourceMissing",
	"updateAvailable",
	"locallyModified",
	"conflict",
	"unknown"
];
var QUANTITY_UNITS = [
	"count",
	"kg",
	"g",
	"l",
	"ml",
	"m"
];
function isPhysicalItemType(type) {
	return PHYSICAL_ITEM_TYPES.includes(type);
}
function createWorldItemId(idFactory = createRelisId) {
	return `WLD-ITM-${idFactory()}`;
}
function initialReference(overrides = {}) {
	return {
		relisId: "",
		uuid: "",
		documentName: "",
		type: "",
		state: "unresolved",
		labelSnapshot: "",
		missingPolicy: "diagnose",
		...overrides
	};
}
function initialItemProvenance() {
	return {
		acquisitionKind: "unknown",
		acquiredFromRef: initialReference(),
		acquiredAt: null,
		lotId: "",
		localRevision: 0,
		manualOverrides: [],
		upgradeState: "unknown"
	};
}
function initialItemPermissions() {
	return { playerEditableDescription: false };
}
function initialPhysicalState() {
	return {
		quantity: 1,
		unit: "count",
		massEach: null,
		volumeEach: null,
		bulkEach: null,
		containerRef: initialReference(),
		locationKey: "",
		custodianRef: initialReference(),
		ownershipState: "owned",
		accessibility: "stored",
		maintenanceRefs: [],
		equipState: "stored",
		bodyId: "",
		hands: 0,
		hostRef: initialReference(),
		equipmentProfile: {},
		condition: "intact",
		wear: 0,
		charges: {
			current: null,
			maximum: null,
			unit: "charge"
		},
		expiresAt: {
			worldTime: null,
			calendarId: "",
			displayOverride: "",
			precision: "exact"
		},
		identified: true
	};
}
function record(value) {
	return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function text(value, fallback = "") {
	return typeof value === "string" ? value : fallback;
}
function finiteNumber(value, fallback, minimum, maximum) {
	if (value === null || value === void 0 || value === "") return fallback;
	const parsed = Number(value);
	if (!Number.isFinite(parsed)) return fallback;
	const lowerBounded = minimum === void 0 ? parsed : Math.max(minimum, parsed);
	return maximum === void 0 ? lowerBounded : Math.min(maximum, lowerBounded);
}
function integer(value, fallback, minimum = 0, maximum) {
	return Math.trunc(finiteNumber(value, fallback, minimum, maximum) ?? fallback);
}
function stringArray(value) {
	if (!Array.isArray(value)) return [];
	return Array.from(new Set(value.filter((entry) => typeof entry === "string")));
}
function referenceArray(value) {
	return Array.isArray(value) ? value.map((entry) => normalizeReference(entry)) : [];
}
function normalizeReference(value) {
	const source = record(value);
	return initialReference({
		...source,
		relisId: text(source.relisId),
		uuid: text(source.uuid),
		documentName: text(source.documentName),
		type: text(source.type),
		state: text(source.state, "unresolved") || "unresolved",
		labelSnapshot: text(source.labelSnapshot),
		missingPolicy: text(source.missingPolicy, "diagnose") || "diagnose"
	});
}
function normalizePhysicalState(value) {
	const source = record(value);
	const charges = record(source.charges);
	const expiresAt = record(source.expiresAt);
	const quantity = finiteNumber(source.quantity, 1, 0) ?? 1;
	const unit = QUANTITY_UNITS.includes(source.unit) ? source.unit : "count";
	return {
		...initialPhysicalState(),
		...source,
		quantity: unit === "count" ? Math.trunc(quantity) : quantity,
		unit,
		massEach: finiteNumber(source.massEach, null, 0),
		volumeEach: finiteNumber(source.volumeEach, null, 0),
		bulkEach: finiteNumber(source.bulkEach, null, 0),
		containerRef: normalizeReference(source.containerRef),
		locationKey: text(source.locationKey),
		custodianRef: normalizeReference(source.custodianRef),
		ownershipState: OWNERSHIP_STATES.includes(source.ownershipState) ? source.ownershipState : "owned",
		accessibility: ACCESSIBILITY_STATES.includes(source.accessibility) ? source.accessibility : "stored",
		maintenanceRefs: referenceArray(source.maintenanceRefs),
		equipState: EQUIP_STATES.includes(source.equipState) ? source.equipState : "stored",
		bodyId: text(source.bodyId),
		hands: integer(source.hands, 0, 0, 2),
		hostRef: normalizeReference(source.hostRef),
		equipmentProfile: record(source.equipmentProfile),
		condition: ITEM_CONDITIONS.includes(source.condition) ? source.condition : "intact",
		wear: integer(source.wear, 0, 0, 6),
		charges: {
			...charges,
			current: finiteNumber(charges.current, null, 0),
			maximum: finiteNumber(charges.maximum, null, 0),
			unit: text(charges.unit, "charge") || "charge"
		},
		expiresAt: {
			...expiresAt,
			worldTime: finiteNumber(expiresAt.worldTime, null),
			calendarId: text(expiresAt.calendarId),
			displayOverride: text(expiresAt.displayOverride),
			precision: text(expiresAt.precision, "exact") || "exact"
		},
		identified: source.identified !== false
	};
}
function normalizeContainerState(value) {
	const source = record(value);
	const capacity = record(source.capacity);
	const accessRule = text(source.accessRule, "normal");
	return {
		...source,
		capacity: {
			...capacity,
			mass: finiteNumber(capacity.mass, null, 0),
			volume: finiteNumber(capacity.volume, null, 0),
			bulk: finiteNumber(capacity.bulk, null, 0),
			units: finiteNumber(capacity.units, null, 0)
		},
		accessRule: CONTAINER_ACCESS_RULES.includes(accessRule) ? accessRule : "normal"
	};
}
function normalizeItemSystem(value, physical, idFactory = createRelisId) {
	const source = record(value);
	const meta = record(source.meta);
	const provenance = record(source.provenance);
	const referencePrice = record(source.referencePrice);
	const legality = text(source.legality);
	const normalized = {
		...source,
		meta: {
			...meta,
			schemaVersion: "5",
			rulesVersion: text(meta.rulesVersion, "1.0.0") || "1.0.0",
			contentVersion: text(meta.contentVersion, "1.0.0") || "1.0.0",
			relisId: text(meta.relisId) || createWorldItemId(idFactory),
			sourceRef: normalizeReference(meta.sourceRef),
			sourceVersion: text(meta.sourceVersion),
			revision: integer(meta.revision, 0),
			status: text(meta.status, "draft") || "draft",
			causeRefs: referenceArray(meta.causeRefs),
			tags: stringArray(meta.tags)
		},
		description: text(source.description),
		traits: normalizeTraitIds(source.traits),
		requirementRefs: referenceArray(source.requirementRefs),
		effectRefs: referenceArray(source.effectRefs),
		level: finiteNumber(source.level, null, 1, 30),
		quality: finiteNumber(source.quality, null, 0, 5),
		rarity: finiteNumber(source.rarity, null, 0, 6),
		legality: LEGALITY_STATES.includes(legality) ? legality : "",
		referencePrice: {
			...referencePrice,
			amount: finiteNumber(referencePrice.amount, null, 0),
			currencyRef: normalizeReference(referencePrice.currencyRef),
			unit: text(referencePrice.unit, "count") || "count",
			quantityBasis: finiteNumber(referencePrice.quantityBasis, 1, Number.EPSILON) ?? 1,
			sourceRefs: referenceArray(referencePrice.sourceRefs)
		},
		manufacturerRef: normalizeReference(source.manufacturerRef),
		permissions: {
			...initialItemPermissions(),
			...record(source.permissions),
			playerEditableDescription: record(source.permissions).playerEditableDescription === true
		},
		provenance: {
			...initialItemProvenance(),
			...provenance,
			acquisitionKind: text(provenance.acquisitionKind, "unknown") || "unknown",
			acquiredFromRef: normalizeReference(provenance.acquiredFromRef),
			acquiredAt: finiteNumber(provenance.acquiredAt, null, 0),
			lotId: text(provenance.lotId),
			localRevision: integer(provenance.localRevision, 0),
			manualOverrides: stringArray(provenance.manualOverrides),
			upgradeState: UPGRADE_STATES.includes(provenance.upgradeState) ? provenance.upgradeState : "unknown"
		}
	};
	if (physical) normalized.physical = normalizePhysicalState(source.physical);
	return normalized;
}
function normalizeItemSystemForType(value, type, idFactory = createRelisId) {
	const normalized = normalizeItemSystem(value, isPhysicalItemType(type), idFactory);
	if (type === "container") {
		const container = normalizeContainerState(value);
		normalized.capacity = container.capacity;
		normalized.accessRule = container.accessRule;
	}
	return normalized;
}
function physicalTotals(value) {
	const physical = normalizePhysicalState(value);
	const quantity = Number(physical.quantity);
	const total = (each) => each === null || !Number.isFinite(Number(each)) ? null : Number((quantity * Number(each)).toPrecision(12));
	return {
		mass: total(physicalUnitMass(physical)),
		volume: total(physical.volumeEach),
		bulk: total(physical.bulkEach)
	};
}
function buildOwnedItemSystem(value, sourceUuid, sourceName, sourceType, physical, idFactory = createRelisId) {
	const source = normalizeItemSystemForType(value, sourceType, idFactory);
	const sourceId = source.meta.relisId;
	return {
		...source,
		...physical ? { physical: {
			...source.physical,
			equipState: "stored",
			bodyId: "",
			hands: 0,
			containerRef: initialReference(),
			hostRef: initialReference(),
			locationKey: "actor-cargo"
		} } : {},
		meta: {
			...source.meta,
			relisId: createWorldItemId(idFactory),
			sourceRef: initialReference({
				relisId: sourceId,
				uuid: sourceUuid,
				documentName: "Item",
				type: sourceType,
				state: sourceUuid ? "resolved" : "unresolved",
				labelSnapshot: sourceName
			}),
			sourceVersion: source.meta.contentVersion,
			revision: 0
		},
		provenance: {
			...source.provenance,
			localRevision: 0,
			manualOverrides: [],
			upgradeState: "current"
		}
	};
}
//#endregion
//#region src/data/item-models.ts
var fields$1 = foundry.data.fields;
function optionalStringField$1(initial = "") {
	return new fields$1.StringField({
		required: true,
		blank: true,
		initial
	});
}
function optionalNumberField(minimum = 0, maximum) {
	return new fields$1.NumberField({
		required: false,
		nullable: true,
		min: minimum,
		max: maximum,
		initial: null
	});
}
function referenceField$1() {
	return new fields$1.SchemaField({
		relisId: optionalStringField$1(),
		uuid: optionalStringField$1(),
		documentName: optionalStringField$1(),
		type: optionalStringField$1(),
		state: new fields$1.StringField({
			required: true,
			blank: false,
			initial: "unresolved"
		}),
		labelSnapshot: optionalStringField$1(),
		missingPolicy: new fields$1.StringField({
			required: true,
			blank: false,
			initial: "diagnose"
		})
	});
}
function referenceArrayField$1() {
	return new fields$1.ArrayField(referenceField$1(), {
		required: true,
		initial: []
	});
}
function fictionStampField$1() {
	return new fields$1.SchemaField({
		worldTime: optionalNumberField(),
		calendarId: optionalStringField$1(),
		displayOverride: optionalStringField$1(),
		precision: new fields$1.StringField({
			required: true,
			blank: false,
			choices: [
				"exact",
				"approximate",
				"range",
				"unknown"
			],
			initial: "exact"
		})
	});
}
function itemMetaField() {
	return new fields$1.SchemaField({
		schemaVersion: new fields$1.StringField({
			required: true,
			blank: false,
			initial: "5"
		}),
		rulesVersion: new fields$1.StringField({
			required: true,
			blank: false,
			initial: RULES_VERSION
		}),
		contentVersion: new fields$1.StringField({
			required: true,
			blank: false,
			initial: CONTENT_VERSION
		}),
		relisId: optionalStringField$1(),
		sourceRef: referenceField$1(),
		sourceVersion: optionalStringField$1(),
		revision: new fields$1.NumberField({
			required: true,
			integer: true,
			min: 0,
			initial: 0
		}),
		status: new fields$1.StringField({
			required: true,
			blank: false,
			initial: "draft"
		}),
		causeRefs: referenceArrayField$1(),
		tags: new fields$1.ArrayField(new fields$1.StringField(), {
			required: true,
			initial: []
		})
	});
}
function provenanceField() {
	return new fields$1.SchemaField({
		acquisitionKind: new fields$1.StringField({
			required: true,
			blank: false,
			initial: "unknown"
		}),
		acquiredFromRef: referenceField$1(),
		acquiredAt: optionalNumberField(),
		lotId: optionalStringField$1(),
		localRevision: new fields$1.NumberField({
			required: true,
			integer: true,
			min: 0,
			initial: 0
		}),
		manualOverrides: new fields$1.ArrayField(new fields$1.StringField(), {
			required: true,
			initial: []
		}),
		upgradeState: new fields$1.StringField({
			required: true,
			blank: false,
			choices: UPGRADE_STATES,
			initial: "unknown"
		})
	});
}
function physicalField() {
	return new fields$1.SchemaField({
		quantity: new fields$1.NumberField({
			required: true,
			min: 0,
			initial: 1
		}),
		unit: new fields$1.StringField({
			required: true,
			blank: false,
			choices: QUANTITY_UNITS,
			initial: "count"
		}),
		massEach: optionalNumberField(),
		volumeEach: optionalNumberField(),
		bulkEach: optionalNumberField(),
		containerRef: referenceField$1(),
		locationKey: optionalStringField$1(),
		custodianRef: referenceField$1(),
		ownershipState: new fields$1.StringField({
			required: true,
			blank: false,
			choices: OWNERSHIP_STATES,
			initial: "owned"
		}),
		accessibility: new fields$1.StringField({
			required: true,
			blank: false,
			choices: ACCESSIBILITY_STATES,
			initial: "stored"
		}),
		maintenanceRefs: referenceArrayField$1(),
		equipState: new fields$1.StringField({
			required: true,
			blank: false,
			choices: EQUIP_STATES,
			initial: "stored"
		}),
		bodyId: optionalStringField$1(),
		hands: new fields$1.NumberField({
			required: true,
			integer: true,
			min: 0,
			max: 2,
			initial: 0
		}),
		hostRef: referenceField$1(),
		equipmentProfile: new fields$1.SchemaField({
			family: new fields$1.StringField({
				required: true,
				blank: true,
				initial: "",
				choices: [
					"",
					"manipulable",
					"wearable",
					"resource"
				]
			}),
			slot: optionalStringField$1(),
			slotsConfigured: new fields$1.BooleanField({
				required: true,
				initial: false
			}),
			bodySlots: new fields$1.ArrayField(new fields$1.StringField(), {
				required: true,
				initial: []
			}),
			requiredSlots: new fields$1.SchemaField(Object.fromEntries(Object.keys(TECHNICAL_SLOTS).map((key) => [key, new fields$1.NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 0
			})]))),
			providedSlots: new fields$1.SchemaField(Object.fromEntries(Object.keys(TECHNICAL_SLOTS).map((key) => [key, new fields$1.NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 0
			})]))),
			duration: optionalStringField$1(),
			sizes: new fields$1.ArrayField(new fields$1.StringField(), {
				required: true,
				initial: []
			}),
			natures: new fields$1.ArrayField(new fields$1.StringField(), {
				required: true,
				initial: []
			}),
			hostTypes: new fields$1.ArrayField(new fields$1.StringField(), {
				required: true,
				initial: []
			}),
			installable: new fields$1.BooleanField({
				required: true,
				initial: false
			}),
			ordinaryLiquid: new fields$1.BooleanField({
				required: true,
				initial: false
			})
		}),
		condition: new fields$1.StringField({
			required: true,
			blank: false,
			choices: ITEM_CONDITIONS,
			initial: "intact"
		}),
		wear: new fields$1.NumberField({
			required: true,
			integer: true,
			min: 0,
			max: 6,
			initial: 0
		}),
		charges: new fields$1.SchemaField({
			current: optionalNumberField(),
			maximum: optionalNumberField(),
			unit: new fields$1.StringField({
				required: true,
				blank: false,
				initial: "charge"
			})
		}),
		expiresAt: fictionStampField$1(),
		identified: new fields$1.BooleanField({
			required: true,
			initial: true
		})
	});
}
var RelisItemData = class extends foundry.abstract.TypeDataModel {
	static isPhysical = false;
	static defineSchema() {
		return {
			meta: itemMetaField(),
			description: new fields$1.HTMLField({
				required: true,
				blank: true,
				initial: ""
			}),
			traits: new fields$1.ArrayField(new fields$1.StringField(), {
				required: true,
				initial: []
			}),
			requirementRefs: referenceArrayField$1(),
			effectRefs: referenceArrayField$1(),
			level: optionalNumberField(1, 30),
			quality: optionalNumberField(0, 5),
			rarity: optionalNumberField(0, 6),
			legality: new fields$1.StringField({
				required: true,
				blank: true,
				choices: ["", ...LEGALITY_STATES],
				initial: ""
			}),
			referencePrice: new fields$1.SchemaField({
				amount: optionalNumberField(),
				currencyRef: referenceField$1(),
				unit: new fields$1.StringField({
					required: true,
					blank: false,
					initial: "count"
				}),
				quantityBasis: new fields$1.NumberField({
					required: true,
					min: Number.EPSILON,
					initial: 1
				}),
				sourceRefs: referenceArrayField$1()
			}),
			manufacturerRef: referenceField$1(),
			permissions: new fields$1.SchemaField({ playerEditableDescription: new fields$1.BooleanField({
				required: true,
				initial: false
			}) }),
			provenance: provenanceField()
		};
	}
	prepareDerivedData() {
		super.prepareDerivedData();
		const physical = this.constructor.isPhysical;
		this.derived = { physical: physical ? physicalTotals(this.physical) : null };
	}
};
var PhysicalItemData = class extends RelisItemData {
	static isPhysical = true;
	static defineSchema() {
		return {
			...super.defineSchema(),
			physical: physicalField()
		};
	}
};
var ActionData = class extends RelisItemData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			test: new fields$1.SchemaField({
				attributeKey: new fields$1.StringField({
					required: true,
					blank: false,
					initial: "dexterity"
				}),
				skillKey: new fields$1.StringField({
					required: true,
					blank: false,
					initial: "shooting"
				}),
				difficulty: new fields$1.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 15
				}),
				resourceKey: optionalStringField$1(),
				cost: new fields$1.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 0
				})
			}),
			effect: new fields$1.SchemaField({
				conditionKey: optionalStringField$1(),
				intensity: new fields$1.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 1
				}),
				durationRounds: new fields$1.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 1
				})
			})
		};
	}
};
var EquipmentData = class extends PhysicalItemData {};
var ContainerData = class extends PhysicalItemData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			capacity: new fields$1.SchemaField({
				mass: optionalNumberField(),
				volume: optionalNumberField(),
				bulk: optionalNumberField(),
				units: optionalNumberField()
			}),
			accessRule: new fields$1.StringField({
				required: true,
				blank: false,
				choices: CONTAINER_ACCESS_RULES,
				initial: "normal"
			})
		};
	}
};
//#endregion
//#region src/data/models.ts
var fields = foundry.data.fields;
function metaField() {
	return new fields.SchemaField({
		schemaVersion: new fields.StringField({
			required: true,
			blank: false,
			initial: "5"
		}),
		rulesVersion: new fields.StringField({
			required: true,
			blank: false,
			initial: RULES_VERSION
		}),
		contentVersion: new fields.StringField({
			required: true,
			blank: false,
			initial: CONTENT_VERSION
		}),
		relisId: new fields.StringField({
			required: true,
			blank: true,
			initial: ""
		}),
		revision: new fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			initial: 0
		}),
		status: new fields.StringField({
			required: true,
			blank: false,
			initial: "draft"
		})
	});
}
function attributeField() {
	return new fields.SchemaField({
		base: new fields.NumberField({
			required: true,
			integer: true,
			min: -5,
			max: 8,
			initial: 0
		}),
		partial: new fields.BooleanField({
			required: true,
			initial: false
		}),
		modifiers: new fields.ArrayField(modifierField(), {
			required: true,
			initial: []
		})
	});
}
function skillField(defaultAttribute) {
	return new fields.SchemaField({
		rank: new fields.StringField({
			required: true,
			blank: false,
			initial: "untrained"
		}),
		defaultAttribute: new fields.StringField({
			required: true,
			blank: false,
			initial: defaultAttribute
		}),
		favorite: new fields.BooleanField({
			required: true,
			initial: false
		}),
		modifiers: new fields.ArrayField(modifierField(), {
			required: true,
			initial: []
		})
	});
}
function optionalStringField(initial = "") {
	return new fields.StringField({
		required: true,
		blank: true,
		initial
	});
}
function modifierField() {
	return new fields.SchemaField({
		id: optionalStringField(),
		sourceRef: optionalStringField(),
		value: new fields.NumberField({
			required: true,
			initial: 0
		}),
		mode: new fields.StringField({
			required: true,
			blank: false,
			initial: "add"
		}),
		priority: new fields.NumberField({
			required: true,
			integer: true,
			initial: 0
		}),
		conditionKey: optionalStringField(),
		enabled: new fields.BooleanField({
			required: true,
			initial: true
		}),
		labelKey: optionalStringField()
	});
}
function stableTextEntryField() {
	return new fields.SchemaField({
		id: optionalStringField(),
		sort: new fields.NumberField({
			required: true,
			integer: true,
			initial: 0
		}),
		status: new fields.StringField({
			required: true,
			blank: false,
			initial: "active"
		}),
		value: optionalStringField(),
		visibility: new fields.StringField({
			required: true,
			blank: false,
			initial: "owner"
		})
	});
}
function referenceField() {
	return new fields.SchemaField({
		relisId: optionalStringField(),
		uuid: optionalStringField(),
		documentName: optionalStringField(),
		type: optionalStringField(),
		state: new fields.StringField({
			required: true,
			blank: false,
			initial: "unresolved"
		}),
		labelSnapshot: optionalStringField(),
		missingPolicy: new fields.StringField({
			required: true,
			blank: false,
			initial: "diagnose"
		})
	});
}
function referenceArrayField() {
	return new fields.ArrayField(referenceField(), {
		required: true,
		initial: []
	});
}
function measurementField(unit = "count") {
	return new fields.SchemaField({
		value: new fields.NumberField({
			required: false,
			nullable: true,
			initial: null
		}),
		unit: new fields.StringField({
			required: true,
			blank: false,
			initial: unit
		}),
		precision: new fields.StringField({
			required: true,
			blank: false,
			initial: "exact"
		}),
		minimum: new fields.NumberField({
			required: false,
			nullable: true,
			initial: null
		}),
		maximum: new fields.NumberField({
			required: false,
			nullable: true,
			initial: null
		})
	});
}
function fictionStampField() {
	return new fields.SchemaField({
		worldTime: new fields.NumberField({
			required: false,
			nullable: true,
			initial: null
		}),
		calendarId: optionalStringField(),
		displayOverride: optionalStringField(),
		precision: new fields.StringField({
			required: true,
			blank: false,
			initial: "exact"
		})
	});
}
function mediaRefField(kind = "image") {
	return new fields.SchemaField({
		path: optionalStringField(),
		kind: new fields.StringField({
			required: true,
			blank: false,
			initial: kind
		}),
		alt: optionalStringField(),
		caption: optionalStringField(),
		source: optionalStringField(),
		visibility: new fields.StringField({
			required: true,
			blank: false,
			initial: "document"
		})
	});
}
function resourcePoolField(key = "resource", current = 0, maximum = 0, unit = "count") {
	return new fields.SchemaField({
		key: new fields.StringField({
			required: true,
			blank: false,
			initial: key
		}),
		current: new fields.NumberField({
			required: true,
			min: 0,
			initial: current
		}),
		maximum: new fields.NumberField({
			required: true,
			min: 0,
			initial: maximum
		}),
		reserved: new fields.NumberField({
			required: true,
			min: 0,
			initial: 0
		}),
		debt: new fields.NumberField({
			required: true,
			min: 0,
			initial: 0
		}),
		unit: new fields.StringField({
			required: true,
			blank: false,
			initial: unit
		})
	});
}
function healthField() {
	return new fields.SchemaField({
		hitPoints: resourcePoolField("hitPoints", 10, 10, "pv"),
		stress: resourcePoolField("stress", 0, 10, "points"),
		fatigue: new fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			max: 5,
			initial: 0
		}),
		agony: new fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			initial: 0
		}),
		stability: new fields.StringField({
			required: true,
			blank: false,
			initial: "stable"
		}),
		overexertion: new fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			initial: 0
		}),
		backlash: new fields.NumberField({
			required: true,
			integer: true,
			min: 0,
			initial: 0
		}),
		injuryRefs: referenceArrayField(),
		conditionRefs: referenceArrayField(),
		medicalRecordRefs: referenceArrayField()
	});
}
function identityField() {
	return new fields.SchemaField({
		primaryName: optionalStringField(),
		publicName: optionalStringField(),
		pronouns: optionalStringField(),
		gender: optionalStringField(),
		callsign: optionalStringField(),
		aliases: new fields.ArrayField(stableTextEntryField(), {
			required: true,
			initial: []
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
			description: optionalStringField()
		}),
		biography: new fields.HTMLField({
			required: true,
			blank: true,
			initial: ""
		}),
		memory: new fields.HTMLField({
			required: true,
			blank: true,
			initial: ""
		}),
		goals: new fields.ArrayField(stableTextEntryField(), {
			required: true,
			initial: []
		}),
		anchors: referenceArrayField()
	});
}
function buildField() {
	return new fields.SchemaField({
		ancestryRef: referenceField(),
		secondaryAncestryRef: referenceField(),
		profileRef: referenceField(),
		originRef: referenceField(),
		pathRef: referenceField(),
		primarySpecializationRef: referenceField(),
		secondarySpecializations: new fields.ArrayField(new fields.SchemaField({
			ref: referenceField(),
			rank: optionalStringField(),
			sourceRef: referenceField()
		}), {
			required: true,
			initial: []
		}),
		advantageRefs: referenceArrayField(),
		drawbackRefs: referenceArrayField()
	});
}
function ageField() {
	return new fields.SchemaField({
		earthBirthDate: optionalStringField(),
		universalEquivalent: fictionStampField(),
		chronological: measurementField("years"),
		biological: measurementField("years"),
		apparent: measurementField("years"),
		category: optionalStringField(),
		profileRef: referenceField(),
		updatedAt: fictionStampField()
	});
}
function bodyField() {
	return new fields.SchemaField({
		carrying: new fields.SchemaField({
			hands: new fields.NumberField({
				required: false,
				nullable: true,
				initial: null,
				min: 0,
				integer: true
			}),
			loaded: new fields.NumberField({
				required: false,
				nullable: true,
				initial: null,
				min: 0
			}),
			overloaded: new fields.NumberField({
				required: false,
				nullable: true,
				initial: null,
				min: 0
			}),
			source: optionalStringField()
		}),
		id: new fields.StringField({
			required: true,
			blank: false,
			initial: "primary"
		}),
		name: new fields.StringField({
			required: true,
			blank: false,
			initial: "Corps principal"
		}),
		nature: new fields.StringField({
			required: true,
			blank: false,
			initial: "biological"
		}),
		architecture: optionalStringField(),
		size: new fields.StringField({
			required: true,
			blank: false,
			initial: "medium"
		}),
		criticalFunctions: new fields.ArrayField(stableTextEntryField(), {
			required: true,
			initial: []
		}),
		locations: new fields.ArrayField(stableTextEntryField(), {
			required: true,
			initial: [{
				id: "core",
				sort: 0,
				status: "active",
				value: "Zone centrale",
				visibility: "document"
			}]
		}),
		needs: new fields.ArrayField(needField(), {
			required: true,
			initial: []
		}),
		integratedItemRefs: referenceArrayField()
	});
}
function presentationField() {
	return new fields.SchemaField({
		id: new fields.StringField({
			required: true,
			blank: false,
			initial: "identity"
		}),
		name: new fields.StringField({
			required: true,
			blank: false,
			initial: "Portrait identitaire"
		}),
		category: optionalStringField("identity"),
		portrait: mediaRefField("portrait"),
		token: mediaRefField("token"),
		bodyIds: new fields.ArrayField(new fields.StringField(), {
			required: true,
			initial: ["primary"]
		}),
		availability: new fields.StringField({
			required: true,
			blank: false,
			initial: "available"
		}),
		sourceRef: referenceField(),
		associatedPresentationId: optionalStringField(),
		active: new fields.BooleanField({
			required: true,
			initial: true
		}),
		favorite: new fields.BooleanField({
			required: true,
			initial: true
		}),
		notes: optionalStringField()
	});
}
function outfitField() {
	return new fields.SchemaField({
		equipmentEntries: new fields.ArrayField(new fields.SchemaField({
			itemId: optionalStringField(),
			state: optionalStringField(),
			hostId: optionalStringField()
		}), {
			required: true,
			initial: []
		}),
		id: optionalStringField(),
		sort: new fields.NumberField({
			required: true,
			integer: true,
			initial: 0
		}),
		status: new fields.StringField({
			required: true,
			blank: false,
			initial: "active"
		}),
		name: optionalStringField(),
		function: optionalStringField(),
		bodyIds: new fields.ArrayField(new fields.StringField(), {
			required: true,
			initial: []
		}),
		itemRefs: referenceArrayField(),
		containerRefs: referenceArrayField(),
		presentationId: optionalStringField(),
		storageRef: referenceField(),
		readiness: new fields.StringField({
			required: true,
			blank: false,
			initial: "incomplete"
		}),
		conflicts: new fields.ArrayField(new fields.StringField(), {
			required: true,
			initial: []
		})
	});
}
function movementField() {
	return new fields.SchemaField({
		id: optionalStringField(),
		kind: new fields.StringField({
			required: true,
			blank: false,
			initial: "ground"
		}),
		speed: new fields.NumberField({
			required: true,
			min: 0,
			initial: 0
		}),
		unit: new fields.StringField({
			required: true,
			blank: false,
			initial: "mPerRound"
		}),
		maneuverability: new fields.NumberField({
			required: false,
			nullable: true,
			integer: true,
			initial: null
		})
	});
}
function defensesField() {
	return new fields.SchemaField({
		cap: new fields.NumberField({
			required: false,
			nullable: true,
			integer: true,
			initial: null
		}),
		cae: new fields.NumberField({
			required: false,
			nullable: true,
			integer: true,
			initial: null
		}),
		resistances: new fields.ArrayField(stableTextEntryField(), {
			required: true,
			initial: []
		})
	});
}
function needField() {
	return new fields.SchemaField({
		key: new fields.StringField({
			required: true,
			blank: false
		}),
		current: new fields.NumberField({
			required: false,
			nullable: true,
			initial: null
		}),
		maximum: new fields.NumberField({
			required: false,
			nullable: true,
			initial: null
		}),
		unit: new fields.StringField({
			required: true,
			blank: false,
			initial: "count"
		}),
		lastSatisfiedAt: fictionStampField(),
		nextThresholdAt: fictionStampField(),
		state: new fields.StringField({
			required: true,
			blank: false,
			initial: "normal"
		})
	});
}
var ReservedData = class extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			meta: metaField(),
			description: new fields.HTMLField({
				required: true,
				blank: true,
				initial: ""
			})
		};
	}
};
var PersonData = class extends ReservedData {
	static defineSchema() {
		const attributes = Object.fromEntries(Object.keys(ATTRIBUTE_LABELS).map((key) => [key, attributeField()]));
		const skills = Object.fromEntries(Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => [key, skillField(definition[1])]));
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
				initial: 1
			}),
			attributes: new fields.SchemaField(attributes),
			skills: new fields.SchemaField(skills),
			bodies: new fields.ArrayField(bodyField(), {
				required: true,
				initial: [initialBody()]
			}),
			activeBodyId: new fields.StringField({
				required: true,
				blank: false,
				initial: "primary"
			}),
			presentations: new fields.ArrayField(presentationField(), {
				required: true,
				initial: [initialPresentation()]
			}),
			outfits: new fields.ArrayField(outfitField(), {
				required: true,
				initial: []
			}),
			defenses: defensesField(),
			movements: new fields.ArrayField(movementField(), {
				required: true,
				initial: []
			}),
			turn: new fields.SchemaField({
				actionsCurrent: new fields.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 0
				}),
				reactionAvailable: new fields.BooleanField({
					required: true,
					initial: false
				})
			}),
			health: healthField(),
			needs: new fields.ArrayField(needField(), {
				required: true,
				initial: []
			}),
			energyPools: new fields.ArrayField(resourcePoolField(), {
				required: true,
				initial: []
			}),
			biometricSummary: new fields.SchemaField({
				state: optionalStringField(),
				alerts: new fields.ArrayField(new fields.StringField(), {
					required: true,
					initial: []
				}),
				limitations: new fields.ArrayField(new fields.StringField(), {
					required: true,
					initial: []
				}),
				updatedAt: fictionStampField()
			}),
			post: new fields.SchemaField({
				primaryRef: referenceField(),
				secondaryRefs: referenceArrayField()
			}),
			relationshipRefs: referenceArrayField(),
			organizationRefs: referenceArrayField(),
			accountRefs: referenceArrayField(),
			personalJournalRefs: referenceArrayField()
		};
	}
	static migrateData(source, options = {}) {
		if (options.partial) return source;
		normalizePersonSource(source);
		source.meta ??= {};
		source.meta.schemaVersion = "5";
		source.health ??= {};
		source.health.hitPoints ??= {
			current: 10,
			maximum: 10
		};
		source.health.hitPoints.key ??= "hitPoints";
		source.health.hitPoints.reserved ??= 0;
		source.health.hitPoints.debt ??= 0;
		source.health.hitPoints.unit ??= "pv";
		return source;
	}
	prepareDerivedData() {
		super.prepareDerivedData();
		const attributes = Object.fromEntries(Object.entries(this.attributes).map(([key, score]) => {
			const modifiers = Array.from(score.modifiers ?? []).reduce((sum, modifier) => modifier.enabled !== false && modifier.mode === "add" ? sum + Number(modifier.value ?? 0) : sum, 0);
			return [key, Number(score.base ?? 0) + modifiers];
		}));
		const skills = Object.fromEntries(Object.entries(this.skills).map(([key, score]) => {
			const attributeKey = String(score.defaultAttribute ?? "");
			const mastery = masteryBonus(String(score.rank));
			const modifiers = Array.from(score.modifiers ?? []).reduce((sum, modifier) => modifier.enabled !== false && modifier.mode === "add" ? sum + Number(modifier.value ?? 0) : sum, 0);
			return [key, {
				masteryBonus: mastery,
				total: Number(attributes[attributeKey] ?? 0) + mastery + modifiers
			}];
		}));
		const hitPoints = clampHitPoints(this.health.hitPoints.current, this.health.hitPoints.maximum);
		const stressMaximum = Math.max(0, 10 + Number(attributes.willpower ?? 0));
		const stressCurrent = Math.min(stressMaximum, Math.max(0, Number(this.health.stress?.current ?? 0)));
		const activeBody = Array.from(this.bodies ?? []).find((body) => body.id === this.activeBodyId);
		const primaryMovement = Array.from(this.movements ?? [])[0];
		this.derived = {
			attributes,
			skills,
			activeBody: activeBody ?? Array.from(this.bodies ?? [])[0] ?? null,
			primaryMovement: primaryMovement ?? null,
			trackables: {
				hitPoints: {
					value: hitPoints.current,
					max: hitPoints.maximum
				},
				stress: {
					value: stressCurrent,
					max: stressMaximum
				}
			}
		};
	}
};
var CharacterData = class extends PersonData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			progression: new fields.SchemaField({
				pendingChoices: new fields.ArrayField(stableTextEntryField(), {
					required: true,
					initial: []
				}),
				automaticGrants: new fields.ArrayField(stableTextEntryField(), {
					required: true,
					initial: []
				}),
				historyRefs: referenceArrayField(),
				mythicStars: new fields.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 0
				})
			})
		};
	}
};
var NpcData = class extends PersonData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			detailLevel: new fields.StringField({
				required: true,
				blank: false,
				initial: "standard"
			}),
			role: optionalStringField(),
			publicIdentity: new fields.SchemaField({
				name: optionalStringField(),
				pronouns: optionalStringField(),
				presentationId: optionalStringField()
			}),
			attitudeVisible: optionalStringField(),
			behavior: new fields.SchemaField({
				tactics: new fields.ArrayField(new fields.StringField(), {
					required: true,
					initial: []
				}),
				retreatThreshold: new fields.NumberField({
					required: false,
					nullable: true,
					min: 0,
					initial: null
				}),
				surrender: optionalStringField(),
				priorities: new fields.ArrayField(new fields.StringField(), {
					required: true,
					initial: []
				}),
				limits: new fields.ArrayField(new fields.StringField(), {
					required: true,
					initial: []
				})
			}),
			promotion: new fields.SchemaField({ sourceCharacterRef: referenceField() })
		};
	}
};
var RelisEffectData = class extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			changes: new fields.ArrayField(new fields.SchemaField({
				key: optionalStringField(),
				phase: optionalStringField(),
				priority: new fields.NumberField({
					required: false,
					nullable: true,
					integer: true,
					initial: null
				}),
				type: optionalStringField(),
				value: optionalStringField()
			}), {
				required: true,
				initial: []
			}),
			meta: metaField(),
			sourceRef: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			conditionKey: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			intensity: new fields.NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 1
			}),
			visibility: new fields.StringField({
				required: true,
				blank: false,
				initial: "document"
			})
		};
	}
};
var RelisCombatData = class extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			meta: metaField(),
			encounterGroupId: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			state: new fields.StringField({
				required: true,
				blank: false,
				initial: "preparing"
			})
		};
	}
};
var RelisParticipantData = class extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			meta: metaField(),
			presenceId: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			bodyId: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			actionsSpent: new fields.NumberField({
				required: true,
				integer: true,
				min: 0,
				initial: 0
			}),
			reactionState: new fields.StringField({
				required: true,
				blank: false,
				initial: "available"
			})
		};
	}
};
var RelisCardData = class extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
			meta: metaField(),
			cardId: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			family: new fields.StringField({
				required: true,
				blank: false,
				initial: "check"
			}),
			rulesVersion: new fields.StringField({
				required: true,
				blank: false,
				initial: RULES_VERSION
			}),
			degree: new fields.StringField({
				required: true,
				blank: true,
				initial: ""
			}),
			rollBreakdown: new fields.ArrayField(new fields.StringField(), {
				required: true,
				initial: []
			})
		};
	}
};
function registerDataModels() {
	for (const type of ACTOR_TYPES) CONFIG.Actor.dataModels[type] = type === "character" ? CharacterData : type === "npc" ? NpcData : ReservedData;
	for (const type of ITEM_TYPES) CONFIG.Item.dataModels[type] = type === "action" ? ActionData : type === "container" ? ContainerData : type === "equipment" ? EquipmentData : isPhysicalItemType(type) ? PhysicalItemData : RelisItemData;
	for (const type of JOURNAL_PAGE_TYPES) CONFIG.JournalEntryPage.dataModels[type] = ReservedData;
	CONFIG.ActiveEffect.dataModels.relisEffect = RelisEffectData;
	CONFIG.ActiveEffect.expiryAction = "delete";
	for (const type of [
		"personal",
		"spatial",
		"crisis"
	]) CONFIG.Combat.dataModels[type] = RelisCombatData;
	CONFIG.Combatant.dataModels.participant = RelisParticipantData;
	CONFIG.ChatMessage.dataModels.relisCard = RelisCardData;
	CONFIG.Actor.trackableAttributes = Object.fromEntries(ACTOR_TYPES.map((type) => [type, type === "character" || type === "npc" ? {
		bar: ["derived.trackables.hitPoints"],
		value: ["level"]
	} : {
		bar: [],
		value: []
	}]));
}
//#endregion
//#region src/rules/effects.ts
function localizedOrFallback(i18n, key, fallback) {
	const localized = i18n.localize(key);
	return localized === key ? fallback : localized;
}
function presentCondition(conditionKey, i18n) {
	const root = `RELIS.Condition.${conditionKey}`;
	return {
		label: localizedOrFallback(i18n, `${root}.Name`, conditionKey),
		description: localizedOrFallback(i18n, `${root}.Description`, conditionKey)
	};
}
function formatRoundDuration(value, i18n) {
	const rounds = Math.max(0, Math.ceil(Number(value) || 0));
	const key = rounds === 1 ? "RELIS.Duration.OneRound" : "RELIS.Duration.ManyRounds";
	return i18n.format(key, { rounds });
}
//#endregion
//#region src/rules/resources.ts
function plainResourcePool(pool) {
	return {
		key: String(pool.key),
		current: Number(pool.current ?? 0),
		maximum: Number(pool.maximum ?? 0),
		reserved: Number(pool.reserved ?? 0),
		debt: Number(pool.debt ?? 0),
		unit: String(pool.unit ?? "count")
	};
}
function resourcePoolPresentation(key) {
	const normalized = key.trim().toLocaleLowerCase("fr");
	if (normalized === "ce") return {
		label: "CE — démo",
		isDemo: true
	};
	if (normalized === "mana") return {
		label: "Mana",
		isDemo: false
	};
	if (normalized === "prana") return {
		label: "Prana",
		isDemo: false
	};
	if (normalized === "flux") return {
		label: "Flux",
		isDemo: false
	};
	return {
		label: normalized.toLocaleUpperCase("fr"),
		isDemo: false
	};
}
function updateResourcePoolCurrent(pools, index, requested) {
	const updated = Array.from(pools, plainResourcePool);
	const pool = updated[index];
	if (!pool) return updated;
	const finite = Number.isFinite(requested) ? requested : 0;
	pool.current = Math.min(pool.maximum, Math.max(0, finite));
	return updated;
}
//#endregion
//#region src/documents/actor.ts
function succeeded(degree) {
	return degree === "success" || degree === "criticalSuccess";
}
var RelisActor = class extends Actor {
	async rollRelisCheck(options) {
		if (!["character", "npc"].includes(this.type)) throw new Error("Les jets personnels RE:LIS exigent un Personnage ou un PNJ.");
		const attribute = Number(this.system.derived?.attributes?.[options.attributeKey] ?? this.system.attributes?.[options.attributeKey]?.base ?? 0);
		const mastery = masteryBonus(String(this.system.skills?.[options.skillKey]?.rank ?? "untrained"));
		const difficulty = Math.max(0, Math.trunc(Number(options.difficulty) || 0));
		const cost = Math.max(0, Math.trunc(Number(options.cost) || 0));
		const resourceKey = String(options.resourceKey ?? "");
		const pools = Array.from(this.system.energyPools ?? [], plainResourcePool);
		const resourceIndex = resourceKey ? pools.findIndex((pool) => pool.key === resourceKey) : -1;
		if (cost > 0 && (resourceIndex < 0 || (pools[resourceIndex]?.current ?? 0) < cost)) {
			ui.notifications.warn(game.i18n.localize("RELIS.Error.InsufficientResource"));
			return;
		}
		const roll = await new Roll("1d20 + @attribute + @mastery", {
			attribute,
			mastery
		}).evaluate();
		const natural = Number(roll.dice[0]?.total ?? roll.total ?? 0);
		const total = Number(roll.total ?? 0);
		const resolution = resolveCheck({
			natural,
			total,
			difficulty
		});
		const priorPools = pools.map((pool) => ({ ...pool }));
		let effectMutation = null;
		try {
			if (cost > 0 && resourceIndex >= 0) {
				const pool = pools[resourceIndex];
				if (!pool) throw new Error("Réserve introuvable après validation.");
				pool.current -= cost;
				await this.update({ "system.energyPools": pools });
			}
			if (options.effect?.conditionKey && succeeded(resolution.degree)) effectMutation = await this.applyTemporaryEffect(options.effect, options.sourceItem?.uuid ?? this.uuid);
			const effectPresentation = options.effect?.conditionKey ? presentCondition(options.effect.conditionKey, game.i18n) : null;
			const effectDurationRounds = Math.max(0, Math.trunc(Number(options.effect?.durationRounds) || 0));
			const content = await foundry.applications.handlebars.renderTemplate("systems/relis/templates/chat/check-card.hbs", {
				actorName: this.name,
				label: options.label,
				attribute,
				mastery,
				natural,
				total,
				difficulty,
				degree: resolution.degree,
				degreeLabel: degreeLabel(resolution.degree),
				resourceKey,
				cost,
				hasCost: cost > 0,
				effectApplied: Boolean(effectMutation?.effectId),
				effectLabel: effectPresentation?.label ?? "",
				effectDescription: effectPresentation?.description ?? "",
				effectIntensity: Math.max(0, Math.trunc(Number(options.effect?.intensity) || 0)),
				effectDuration: formatRoundDuration(effectDurationRounds, game.i18n)
			});
			await ChatMessage.implementation.create({
				type: "relisCard",
				speaker: ChatMessage.getSpeaker({ actor: this }),
				content,
				rolls: [roll],
				system: {
					family: "check",
					rulesVersion: RULES_VERSION,
					degree: resolution.degree,
					rollBreakdown: [
						`1d20=${natural}`,
						`Attribut=${attribute}`,
						`Maîtrise=${mastery}`,
						`Total=${total}`
					]
				}
			});
		} catch (error) {
			if (effectMutation?.created) await this.deleteEmbeddedDocuments("ActiveEffect", [effectMutation.effectId]);
			else if (effectMutation?.document && effectMutation.rollback) await effectMutation.document.update(effectMutation.rollback);
			if (cost > 0) await this.update({ "system.energyPools": priorPools });
			throw error;
		}
	}
	async applyTemporaryEffect(effectOptions, sourceRef) {
		const conditionKey = String(effectOptions.conditionKey);
		const intensity = Math.max(0, Math.trunc(Number(effectOptions.intensity) || 0));
		const rounds = Math.max(0, Math.trunc(Number(effectOptions.durationRounds) || 0));
		const presentation = presentCondition(conditionKey, game.i18n);
		const duration = {
			rounds,
			startRound: Number(game.combat?.round ?? 0),
			startTurn: Number(game.combat?.turn ?? 0),
			startTime: Number(game.time?.worldTime ?? 0)
		};
		const effectData = {
			name: `RE:LIS — ${presentation.label}`,
			type: "relisEffect",
			img: "icons/svg/aura.svg",
			origin: sourceRef,
			duration,
			system: {
				changes: [],
				sourceRef,
				conditionKey,
				intensity,
				visibility: "document"
			}
		};
		const [existing, ...legacyDuplicates] = Array.from(this.effects ?? []).filter((effect) => effect.type === "relisEffect" && effect.origin === sourceRef && String(effect.system?.conditionKey) === conditionKey);
		if (legacyDuplicates.length > 0) await this.deleteEmbeddedDocuments("ActiveEffect", legacyDuplicates.map((effect) => effect.id));
		if (!existing) {
			const [created] = await this.createEmbeddedDocuments("ActiveEffect", [effectData]);
			return {
				effectId: String(created?.id ?? ""),
				created: true
			};
		}
		const rollback = {
			name: existing.name,
			img: existing.img,
			origin: existing.origin,
			duration: {
				rounds: existing.duration?.rounds ?? null,
				turns: existing.duration?.turns ?? null,
				seconds: existing.duration?.seconds ?? null,
				startRound: existing.duration?.startRound ?? null,
				startTurn: existing.duration?.startTurn ?? null,
				startTime: existing.duration?.startTime ?? null
			},
			"system.sourceRef": existing.system?.sourceRef ?? "",
			"system.conditionKey": existing.system?.conditionKey ?? "",
			"system.intensity": existing.system?.intensity ?? 0,
			"system.visibility": existing.system?.visibility ?? "document"
		};
		await existing.update(effectData);
		return {
			effectId: existing.id,
			created: false,
			document: existing,
			rollback
		};
	}
	async rollAction(action) {
		if (action.type !== "action") throw new Error("L’Item transmis n’est pas une Action RE:LIS.");
		await this.rollRelisCheck({
			attributeKey: String(action.system.test.attributeKey),
			skillKey: String(action.system.test.skillKey),
			difficulty: Number(action.system.test.difficulty),
			label: action.name,
			resourceKey: String(action.system.test.resourceKey),
			cost: Number(action.system.test.cost),
			effect: {
				conditionKey: String(action.system.effect.conditionKey),
				intensity: Number(action.system.effect.intensity),
				durationRounds: Number(action.system.effect.durationRounds)
			},
			sourceItem: action
		});
	}
};
//#endregion
//#region src/documents/item.ts
var RelisItem = class extends Item {};
//#endregion
//#region src/hooks/identity.ts
var DOCUMENT_NAMES = [
	"Actor",
	"Item",
	"JournalEntryPage",
	"ActiveEffect",
	"Combat",
	"Combatant",
	"ChatMessage"
];
function ensureRelisId(document) {
	const current = document.system?.meta?.relisId;
	if (typeof current === "string" && current.trim()) return;
	const isItem = document.documentName === "Item" || typeof Item !== "undefined" && document instanceof Item;
	document.updateSource({ "system.meta.relisId": isItem ? createWorldItemId() : createRelisId() });
}
function registerIdentityHooks() {
	for (const documentName of DOCUMENT_NAMES) Hooks.on(`preCreate${documentName}`, ensureRelisId);
}
//#endregion
//#region src/hooks/integrity.ts
function registerIntegrityHooks() {
	Hooks.on("preUpdateActor", (actor, change) => {
		if (!["character", "npc"].includes(actor.type)) return;
		constrainHitPointUpdate({
			current: Number(actor.system.health?.hitPoints?.current ?? 0),
			maximum: Number(actor.system.health?.hitPoints?.maximum ?? 1)
		}, change);
		constrainStressUpdate(Number(actor.system.health?.stress?.current ?? 0), 10 + Number(actor.system.derived?.attributes?.willpower ?? 0), change);
	});
}
//#endregion
//#region src/hooks/items.ts
function sourceUuid(data, options) {
	const candidates = [
		options.sourceUuid,
		options.sourceId,
		data._stats?.compendiumSource,
		data.flags?.core?.sourceId
	];
	return String(candidates.find((candidate) => typeof candidate === "string") ?? "");
}
function prepareItemCreation(item, data, options = {}) {
	const physical = isPhysicalItemType(item.type);
	const incomingSystem = data.system ?? {};
	const incomingId = String(incomingSystem.meta?.relisId ?? "");
	const inferredSourceUuid = sourceUuid(data, options);
	const isOwnedCopy = Boolean(item.parent && incomingId);
	const isImportedCopy = Boolean(inferredSourceUuid && incomingId);
	if (options.relisInventoryOperation) {
		item.updateSource({ system: normalizeItemSystemForType(item.system ?? incomingSystem, item.type) });
		return;
	}
	if (isOwnedCopy || isImportedCopy) {
		item.updateSource({ system: buildOwnedItemSystem(incomingSystem, inferredSourceUuid, String(data.name ?? item.name), String(data.type ?? item.type), physical) });
		return;
	}
	item.updateSource({ system: normalizeItemSystemForType(item.system ?? incomingSystem, item.type) });
}
/** Embedded equipment state changes must use the same previewed service. */
function protectEquipmentUpdate(item, change, options = {}) {
	if (!item.parent || !isPhysicalItemType(item.type) || options.relisInventoryOperation || options.relisMigration) return;
	if (item.parent.flags?.relis?.equipmentRecovery) {
		ui.notifications.warn("Restaurer d’abord l’opération d’équipement interrompue.");
		return false;
	}
	const paths = changedPaths(change);
	const protectedPaths = [
		"equipState",
		"bodyId",
		"hands",
		"hostRef"
	].map((key) => "system.physical." + key);
	if (paths.some((path) => protectedPaths.some((key) => path === key || path.startsWith(key + ".")))) {
		ui.notifications.warn("Changer l’état d’équipement depuis l’inventaire de l’Actor.");
		return false;
	}
	if ([
		"readied",
		"equipped",
		"installed"
	].includes(item.system.physical?.equipState)) {
		if (paths.some((path) => path === "system.physical.locationKey" || path.startsWith("system.physical.containerRef"))) {
			ui.notifications.warn("Ranger ou détacher l’objet avant de modifier directement son emplacement.");
			return false;
		}
		const quantity = requestedValue(change, "system.physical.quantity", item.system.physical.quantity);
		const unit = requestedValue(change, "system.physical.unit", item.system.physical.unit);
		if (Number(quantity) !== 1 || unit !== "count") {
			ui.notifications.warn("Ranger ou détacher l’objet avant de modifier sa quantité ou son unité.");
			return false;
		}
	}
}
function changedPaths(value, prefix = "", output = []) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		if (prefix) output.push(prefix);
		return output;
	}
	for (const [key, child] of Object.entries(value)) {
		if (key.includes(".")) {
			output.push(prefix ? `${prefix}.${key}` : key);
			continue;
		}
		changedPaths(child, prefix ? `${prefix}.${key}` : key, output);
	}
	return output;
}
function requestedValue(change, path, fallback) {
	if (Object.hasOwn(change, path)) return change[path];
	let current = change;
	for (const part of path.split(".")) {
		if (!current || typeof current !== "object" || !Object.hasOwn(current, part)) return fallback;
		current = current[part];
	}
	return current;
}
function setRequestedValue(change, path, value) {
	if (Object.hasOwn(change, path)) {
		change[path] = value;
		return;
	}
	const parts = path.split(".");
	let current = change;
	for (const part of parts.slice(0, -1)) {
		if (!current || typeof current !== "object" || !Object.hasOwn(current, part)) {
			change[path] = value;
			return;
		}
		current = current[part];
	}
	current[parts.at(-1)] = value;
}
function constrainPhysicalItemUpdate(item, change) {
	if (!isPhysicalItemType(item.type)) return;
	const currentUnit = String(item.system.physical?.unit ?? "count");
	const unit = String(requestedValue(change, "system.physical.unit", currentUnit));
	const currentQuantity = Number(item.system.physical?.quantity ?? 1);
	const quantity = Number(requestedValue(change, "system.physical.quantity", currentQuantity));
	if (unit === "count" && Number.isFinite(quantity) && !Number.isInteger(quantity)) setRequestedValue(change, "system.physical.quantity", Math.max(0, Math.trunc(quantity)));
	const currentContainer = String(item.system.physical?.containerRef?.relisId ?? item.system.physical?.containerRef?.uuid ?? "");
	const requestedLocation = requestedValue(change, "system.physical.locationKey", item.system.physical?.locationKey ?? "");
	if ((Object.hasOwn(change, "system.physical.locationKey") || Boolean(change.system?.physical && "locationKey" in change.system.physical)) && String(requestedLocation ?? "").trim() && currentContainer) setRequestedValue(change, "system.physical.containerRef", initialReference());
}
function preventUnsafeContainerDeletion(item, options = {}) {
	if (item.parent && !options.relisInventoryOperation) {
		if (Array.from(item.parent.items ?? []).filter((entry) => entry.system.physical?.hostRef?.uuid === item.uuid && Boolean(item.uuid)).length || item.system.physical?.hostRef?.uuid) {
			ui.notifications.warn("Détacher les installations avant de supprimer cet objet.");
			return false;
		}
	}
	if (item.type !== "container" || !item.parent || options.relisInventoryOperation) return;
	const relisId = String(item.system.meta?.relisId ?? "");
	const uuid = String(item.uuid ?? "");
	const contents = Array.from(item.parent.items ?? []).filter((candidate) => {
		const reference = candidate.system.physical?.containerRef;
		return candidate.id !== item.id && (relisId && String(reference?.relisId ?? "") === relisId || uuid && String(reference?.uuid ?? "") === uuid);
	});
	if (contents.length === 0) return;
	ui.notifications.warn(`Suppression refusée : ${item.name} contient encore ${contents.length} ligne(s). Déplacez ou transférez son contenu.`);
	return false;
}
function trackLocalItemUpdate(item, change, options = {}) {
	if (!item.parent || options.relisMigration || options.relisProvenance) return;
	const paths = changedPaths(change).filter((path) => (path === "name" || path === "img" || path.startsWith("system.")) && !path.startsWith("system.meta.") && !path.startsWith("system.provenance.") && !path.startsWith("system.derived."));
	if (paths.length === 0) return;
	const existing = Array.from(item.system.provenance?.manualOverrides ?? [], String);
	change["system.provenance.localRevision"] = Math.max(0, Math.trunc(Number(item.system.provenance?.localRevision ?? 0))) + 1;
	change["system.provenance.manualOverrides"] = Array.from(/* @__PURE__ */ new Set([...existing, ...paths])).sort();
	if (item.system.meta?.sourceRef?.relisId) change["system.provenance.upgradeState"] = "locallyModified";
}
function worldItems() {
	const result = /* @__PURE__ */ new Set();
	for (const item of Array.from(game.items?.contents ?? game.items ?? [])) result.add(item);
	for (const actor of Array.from(game.actors?.contents ?? game.actors ?? [])) for (const item of Array.from(actor.items ?? [])) result.add(item);
	return Array.from(result);
}
async function migrateItemCore() {
	if (!game.user?.isGM) return 0;
	const migrationId = `10-E2-P-schema-5`;
	if ((game.settings.get("relis", "migrations.state") ?? {}).lastMigrationId === migrationId) return 0;
	const items = worldItems();
	for (const item of items) {
		const source = item.toObject(true).system ?? item.system ?? {};
		await item.update({ system: normalizeItemSystemForType(source, item.type) }, { relisMigration: true });
	}
	await game.settings.set(SYSTEM_ID, "migrations.state", {
		packageVersion: PACKAGE_VERSION,
		state: "completed",
		lastMigrationId: migrationId,
		errors: []
	});
	console.log(`RE:LIS | Migration 10-E2-P : ${items.length} Item(s) contrôlé(s).`);
	return items.length;
}
function registerItemHooks() {
	Hooks.on("preCreateItem", prepareItemCreation);
	Hooks.on("preDeleteItem", preventUnsafeContainerDeletion);
	Hooks.on("preUpdateItem", (item, change, options) => {
		if (protectEquipmentUpdate(item, change, options) === false) return false;
		constrainPhysicalItemUpdate(item, change);
		trackLocalItemUpdate(item, change, options);
	});
}
//#endregion
//#region src/settings.ts
var WORLD_SETTINGS = [
	{
		key: "automation.level",
		scope: "world",
		config: true,
		type: String,
		default: "assisted",
		choices: {
			advisory: "Conseil",
			assisted: "Assisté",
			boundedAutomatic: "Automatique borné"
		}
	},
	{
		key: "operations.confirmSensitive",
		scope: "world",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "operations.allowPlayerRequests",
		scope: "world",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "assistants.persistDrafts",
		scope: "world",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "assistants.retentionDays",
		scope: "world",
		config: false,
		type: Number,
		default: 30
	},
	{
		key: "generators.implicitLocks",
		scope: "world",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "macros.allowScriptMacros",
		scope: "world",
		config: false,
		type: Boolean,
		default: false
	},
	{
		key: "imports.allowPlayerBundles",
		scope: "world",
		config: false,
		type: Boolean,
		default: false
	},
	{
		key: "notifications.persistWarnings",
		scope: "world",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "adapters.policy",
		scope: "world",
		config: false,
		type: String,
		default: "disabled"
	},
	{
		key: "diagnostics.enabled",
		scope: "world",
		config: false,
		type: Boolean,
		default: false
	},
	{
		key: "diagnostics.logLevel",
		scope: "world",
		config: false,
		type: String,
		default: "warning"
	}
];
var USER_SETTINGS = [
	{
		key: "xirea.adviceLevel",
		scope: "user",
		config: true,
		type: String,
		default: "contextual",
		choices: {
			silent: "Silencieux",
			contextual: "Contextuel",
			detailed: "Détaillé"
		}
	},
	{
		key: "ui.defaultDashboard",
		scope: "user",
		config: false,
		type: String,
		default: "personal"
	},
	{
		key: "notifications.verbosity",
		scope: "user",
		config: false,
		type: String,
		default: "normal"
	},
	{
		key: "operations.confirmRoutine",
		scope: "user",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "browsers.viewMode",
		scope: "user",
		config: false,
		type: String,
		default: "list"
	},
	{
		key: "browsers.rememberFilters",
		scope: "user",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "search.includeCompendiums",
		scope: "user",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "chat.expandRollDetails",
		scope: "user",
		config: false,
		type: Boolean,
		default: false
	}
];
var CLIENT_SETTINGS = [
	{
		key: "ui.density",
		scope: "client",
		config: true,
		type: String,
		default: "comfortable",
		choices: {
			comfortable: "Confortable",
			compact: "Compacte"
		}
	},
	{
		key: "ui.textScale",
		scope: "client",
		config: true,
		type: Number,
		default: 1
	},
	{
		key: "ui.highContrast",
		scope: "client",
		config: true,
		type: Boolean,
		default: false
	},
	{
		key: "ui.reduceMotion",
		scope: "client",
		config: true,
		type: Boolean,
		default: globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
	},
	{
		key: "ui.soundCues",
		scope: "client",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "ui.restoreWindows",
		scope: "client",
		config: false,
		type: Boolean,
		default: true
	},
	{
		key: "performance.listVirtualization",
		scope: "client",
		config: false,
		type: String,
		default: "auto"
	},
	{
		key: "media.autoplayAudio",
		scope: "client",
		config: false,
		type: Boolean,
		default: false
	}
];
var HIDDEN_SETTINGS = [
	{
		key: "versions.schema",
		scope: "world",
		config: false,
		type: String,
		default: "5"
	},
	{
		key: "versions.rules",
		scope: "world",
		config: false,
		type: String,
		default: RULES_VERSION
	},
	{
		key: "versions.content",
		scope: "world",
		config: false,
		type: String,
		default: CONTENT_VERSION
	},
	{
		key: "migrations.state",
		scope: "world",
		config: false,
		type: Object,
		default: {
			packageVersion: PACKAGE_VERSION,
			state: "idle",
			lastMigrationId: null,
			errors: []
		}
	}
];
var SETTING_DEFINITIONS = [
	...WORLD_SETTINGS,
	...USER_SETTINGS,
	...CLIENT_SETTINGS,
	...HIDDEN_SETTINGS
];
function registerSettings() {
	for (const definition of SETTING_DEFINITIONS) game.settings.register(SYSTEM_ID, definition.key, {
		name: `RE:LIS — ${definition.key}`,
		hint: `Paramètre initial gelé par 10-B11 : ${definition.key}`,
		scope: definition.scope,
		config: definition.config,
		type: definition.type,
		default: definition.default,
		...definition.choices ? { choices: definition.choices } : {}
	});
}
//#endregion
//#region src/rules/inventory.ts
var LOAD_KEYS = [
	"mass",
	"volume",
	"bulk"
];
function finite(value) {
	if (value === null || value === void 0 || value === "") return null;
	const number = Number(value);
	return Number.isFinite(number) ? number : null;
}
function stableValue(value) {
	if (Array.isArray(value)) return value.map(stableValue);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(Object.entries(value).sort(([first], [second]) => first.localeCompare(second)).map(([key, child]) => [key, stableValue(child)]));
}
function clone(value) {
	return JSON.parse(JSON.stringify(value));
}
function referenceIdentity(reference) {
	if (!reference || typeof reference !== "object") return "";
	const value = reference;
	const relisId = String(value.relisId ?? "").trim();
	if (relisId) return `relis:${relisId}`;
	const uuid = String(value.uuid ?? "").trim();
	if (uuid) return `uuid:${uuid}`;
	return "";
}
function itemIdentityKeys(item) {
	const relisId = String(item.system.meta?.relisId ?? "").trim();
	return [
		relisId ? `relis:${relisId}` : "",
		item.uuid ? `uuid:${item.uuid}` : "",
		`id:${item.id}`
	].filter(Boolean);
}
function itemIndex(items) {
	const index = /* @__PURE__ */ new Map();
	for (const item of items) for (const identity of itemIdentityKeys(item)) index.set(identity, item);
	return index;
}
function referencedItem(reference, index) {
	const identity = referenceIdentity(reference);
	if (!identity) return null;
	const exact = index.get(identity);
	if (exact) return exact;
	if (identity.startsWith("uuid:")) {
		const id = identity.slice(5).split(".").at(-1);
		return id ? index.get(`id:${id}`) ?? null : null;
	}
	return null;
}
function ownLoad(item) {
	const physical = item.system.physical ?? {};
	const quantity = Math.max(0, finite(physical.quantity) ?? 0);
	const total = (value) => {
		const each = finite(value);
		return each === null ? null : Number((Math.max(0, each) * quantity).toPrecision(12));
	};
	return {
		mass: total(physicalUnitMass(physical)),
		volume: total(physical.volumeEach),
		bulk: total(physical.bulkEach),
		units: String(physical.unit ?? "count") === "count" ? quantity : quantity > 0 ? 1 : 0
	};
}
function addLoads(loads) {
	const sumKnown = (key) => {
		if (loads.some((load) => load[key] === null)) return null;
		return Number(loads.reduce((sum, load) => sum + Number(load[key]), 0).toPrecision(12));
	};
	return {
		mass: sumKnown("mass"),
		volume: sumKnown("volume"),
		bulk: sumKnown("bulk"),
		units: Number(loads.reduce((sum, load) => sum + load.units, 0).toPrecision(12))
	};
}
function parentMap(items) {
	const index = itemIndex(items);
	const parents = /* @__PURE__ */ new Map();
	const orphans = /* @__PURE__ */ new Set();
	const diagnostics = [];
	for (const item of items) {
		const reference = item.system.physical?.containerRef;
		if (!referenceIdentity(reference)) {
			parents.set(item.id, null);
			continue;
		}
		const parent = referencedItem(reference, index);
		if (!parent || parent.type !== "container") {
			parents.set(item.id, null);
			orphans.add(item.id);
			diagnostics.push({
				level: "error",
				itemId: item.id,
				message: `${item.name} référence un conteneur absent ou invalide.`
			});
			continue;
		}
		parents.set(item.id, parent.id);
	}
	return {
		parents,
		orphans,
		diagnostics
	};
}
function childrenMap(items, parents) {
	const children = /* @__PURE__ */ new Map();
	for (const item of items) {
		const parentId = parents.get(item.id) ?? null;
		const siblings = children.get(parentId) ?? [];
		siblings.push(item);
		children.set(parentId, siblings);
	}
	for (const siblings of children.values()) siblings.sort((first, second) => first.name.localeCompare(second.name, "fr", { sensitivity: "base" }));
	return children;
}
function cyclicIds(items, parents) {
	const result = /* @__PURE__ */ new Set();
	for (const item of items) {
		const path = [];
		const positions = /* @__PURE__ */ new Map();
		let current = item.id;
		while (current) {
			const prior = positions.get(current);
			if (prior !== void 0) {
				for (const member of path.slice(prior)) result.add(member);
				break;
			}
			positions.set(current, path.length);
			path.push(current);
			current = parents.get(current) ?? null;
		}
	}
	return result;
}
function subtreeLoadFor(itemId, byId, children, cache, path = /* @__PURE__ */ new Set()) {
	const cached = cache.get(itemId);
	if (cached) return cached;
	const item = byId.get(itemId);
	if (!item || path.has(itemId)) return {
		mass: null,
		volume: null,
		bulk: null,
		units: 0
	};
	const nextPath = new Set(path).add(itemId);
	const load = addLoads([ownLoad(item), ...(children.get(itemId) ?? []).map((child) => subtreeLoadFor(child.id, byId, children, cache, nextPath))]);
	cache.set(itemId, load);
	return load;
}
function containerUsageFor(itemId, byId, children, cache) {
	return addLoads((children.get(itemId) ?? []).map((child) => subtreeLoadFor(child.id, byId, children, cache)));
}
function capacityDiagnostics(items, children) {
	const byId = new Map(items.map((item) => [item.id, item]));
	const cache = /* @__PURE__ */ new Map();
	const diagnostics = [];
	for (const container of items.filter((item) => item.type === "container")) {
		const capacity = container.system.capacity ?? {};
		const usage = containerUsageFor(container.id, byId, children, cache);
		for (const key of [...LOAD_KEYS, "units"]) {
			const maximum = finite(capacity[key]);
			if (maximum === null) continue;
			const used = usage[key];
			if (used === null) diagnostics.push({
				level: "error",
				itemId: container.id,
				message: `${container.name} : capacité ${key} invérifiable, une valeur unitaire manque.`
			});
			else if (used > maximum) diagnostics.push({
				level: "error",
				itemId: container.id,
				message: `${container.name} dépasse sa capacité ${key} (${used}/${maximum}).`
			});
		}
	}
	return diagnostics;
}
function presentInventory(incoming) {
	const items = incoming.filter((item) => isPhysicalItemType(item.type));
	const { parents, orphans, diagnostics } = parentMap(items);
	const cycles = cyclicIds(items, parents);
	for (const itemId of cycles) {
		const item = items.find((candidate) => candidate.id === itemId);
		diagnostics.push({
			level: "error",
			itemId,
			message: `${item?.name ?? "Item"} appartient à une boucle de conteneurs.`
		});
	}
	for (const container of items.filter((item) => item.type === "container")) {
		if (Number(container.system.physical?.quantity ?? 1) === 1) continue;
		diagnostics.push({
			level: "error",
			itemId: container.id,
			message: `${container.name} est un conteneur unique : sa quantité doit être égale à 1.`
		});
	}
	const safeParents = new Map(parents);
	for (const itemId of cycles) safeParents.set(itemId, null);
	const children = childrenMap(items, safeParents);
	diagnostics.push(...capacityDiagnostics(items, children));
	const byId = new Map(items.map((item) => [item.id, item]));
	const loadCache = /* @__PURE__ */ new Map();
	const rows = [];
	const visited = /* @__PURE__ */ new Set();
	const append = (item, depth) => {
		if (visited.has(item.id)) return;
		visited.add(item.id);
		const ownChildren = children.get(item.id) ?? [];
		rows.push({
			item,
			depth,
			parentId: safeParents.get(item.id) ?? null,
			orphaned: orphans.has(item.id),
			cyclic: cycles.has(item.id),
			childCount: ownChildren.length,
			subtreeLoad: subtreeLoadFor(item.id, byId, children, loadCache),
			containerUsage: item.type === "container" ? containerUsageFor(item.id, byId, children, loadCache) : null
		});
		for (const child of ownChildren) append(child, depth + 1);
	};
	for (const root of children.get(null) ?? []) append(root, 0);
	for (const item of items) append(item, 0);
	return {
		rows,
		diagnostics,
		totalLoad: addLoads(items.map(ownLoad))
	};
}
function descendantIds(items, itemId) {
	const { parents } = parentMap(items);
	const children = childrenMap(items, parents);
	const result = [];
	const visited = /* @__PURE__ */ new Set([itemId]);
	const visit = (parentId) => {
		for (const child of children.get(parentId) ?? []) {
			if (visited.has(child.id)) continue;
			visited.add(child.id);
			result.push(child.id);
			visit(child.id);
		}
	};
	visit(itemId);
	return result;
}
function withMovedParent(items, itemId, targetContainerId) {
	const target = targetContainerId ? items.find((item) => item.id === targetContainerId) : null;
	return items.map((item) => {
		if (item.id !== itemId) return item;
		const copy = {
			...item,
			system: clone(item.system)
		};
		copy.system.physical.containerRef = target ? {
			relisId: String(target.system.meta?.relisId ?? ""),
			uuid: target.uuid ?? "",
			documentName: "Item",
			type: "container",
			state: "resolved",
			labelSnapshot: target.name,
			missingPolicy: "diagnose"
		} : {};
		return copy;
	});
}
function validateInventoryMove(incoming, itemId, targetContainerId) {
	const items = incoming.filter((item) => isPhysicalItemType(item.type));
	const item = items.find((candidate) => candidate.id === itemId);
	if (!item) return {
		valid: false,
		errors: ["Item physique introuvable."]
	};
	if (targetContainerId) {
		const target = items.find((candidate) => candidate.id === targetContainerId);
		if (!target || target.type !== "container") return {
			valid: false,
			errors: ["Conteneur de destination invalide."]
		};
		if (target.id === item.id) return {
			valid: false,
			errors: ["Un conteneur ne peut pas se contenir lui-même."]
		};
		if (descendantIds(items, item.id).includes(target.id)) return {
			valid: false,
			errors: ["Déplacement refusé : il créerait une boucle de conteneurs."]
		};
	}
	const moved = withMovedParent(items, itemId, targetContainerId);
	const existingErrors = new Set(presentInventory(items).diagnostics.filter((diagnostic) => diagnostic.level === "error").map((diagnostic) => diagnostic.message));
	const errors = presentInventory(moved).diagnostics.filter((diagnostic) => diagnostic.level === "error" && !existingErrors.has(diagnostic.message)).map((diagnostic) => diagnostic.message);
	return {
		valid: errors.length === 0,
		errors
	};
}
function stackPayload(item) {
	const system = clone(item.system ?? {});
	delete system.derived;
	if (system.meta) {
		delete system.meta.relisId;
		delete system.meta.revision;
	}
	if (system.provenance) {
		delete system.provenance.localRevision;
		delete system.provenance.manualOverrides;
		delete system.provenance.upgradeState;
	}
	if (system.physical) {
		delete system.physical.quantity;
		system.physical.containerRef = referenceIdentity(system.physical.containerRef);
		system.physical.custodianRef = referenceIdentity(system.physical.custodianRef);
	}
	return {
		name: item.name,
		type: item.type,
		system: stableValue(system)
	};
}
function canMergeStacks(first, second) {
	if (first.id === second.id) return false;
	if ([first, second].some((item) => [
		"readied",
		"equipped",
		"installed"
	].includes(item.system.physical?.equipState))) return false;
	if (!isPhysicalItemType(first.type) || !isPhysicalItemType(second.type)) return false;
	if (first.type === "container" || second.type === "container") return false;
	if (String(first.system.physical?.serialNumber ?? "").trim() || String(second.system.physical?.serialNumber ?? "").trim()) return false;
	return JSON.stringify(stackPayload(first)) === JSON.stringify(stackPayload(second));
}
function validateStackSplit(item, requested) {
	if (!isPhysicalItemType(item.type)) return ["L’Item n’est pas physique."];
	if ([
		"readied",
		"equipped",
		"installed"
	].includes(item.system.physical?.equipState)) return ["Ranger ou détacher l’objet avant de scinder."];
	if (item.type === "container") return ["Un conteneur et son contenu ne peuvent pas être fractionnés."];
	if (String(item.system.physical?.serialNumber ?? "").trim()) return ["Un objet sérialisé ne peut pas être fractionné."];
	const quantity = Number(item.system.physical?.quantity ?? 0);
	if (!Number.isFinite(requested) || requested <= 0) return ["La quantité à scinder doit être strictement positive."];
	if (requested >= quantity) return ["La quantité à scinder doit être inférieure à la pile source."];
	if (String(item.system.physical?.unit ?? "count") === "count" && !Number.isInteger(requested)) return ["Une pile comptée se scinde en unités entières."];
	return [];
}
function inventoryContainerTargets(items, itemId) {
	const forbidden = /* @__PURE__ */ new Set([itemId, ...descendantIds(items, itemId)]);
	return items.filter((item) => item.type === "container" && !forbidden.has(item.id));
}
//#endregion
//#region src/rules/equipment.ts
var EQUIPMENT_LABELS = {
	stored: "Rangé",
	carried: "Rangé",
	readied: "Préparé — mains à préciser",
	"held-one": "Tenu à une main",
	"held-two": "Tenu à deux mains",
	equipped: "Équipé",
	installed: "Installé",
	ground: "Au sol"
};
function equipmentLinked(items, itemId) {
	const item = items.find((entry) => entry.id === itemId);
	if (!item) return false;
	return Boolean(referenceIdentity(item.system.physical?.hostRef)) || items.some((entry) => entry.system.physical?.hostRef?.uuid === item.uuid && Boolean(item.uuid));
}
function unitMass(item) {
	return physicalUnitMass(item.system.physical ?? {});
}
function equipmentState(item) {
	const physical = item.system.physical ?? {};
	if (physical.equipState === "carried") return "stored";
	return physical.equipState === "readied" ? physical.hands === 2 ? "held-two" : physical.hands === 1 ? "held-one" : "readied" : physical.equipState ?? "stored";
}
function equipmentStates(item) {
	const profile = item.system.physical?.equipmentProfile ?? {};
	const family = profile.family || (item.type === "weapon" ? "manipulable" : [
		"armor",
		"equipment",
		"container"
	].includes(item.type) ? "wearable" : "resource");
	const states = family === "manipulable" ? [
		"stored",
		"held-one",
		"held-two",
		"ground"
	] : family === "wearable" ? [
		"stored",
		"equipped",
		"ground"
	] : ["stored", "ground"];
	if (profile.installable === true) states.push("installed");
	if (!states.includes("stored")) states.unshift("stored");
	return states;
}
function ancestors(items, itemId) {
	const rows = presentInventory(items).rows;
	const result = [];
	const seen = /* @__PURE__ */ new Set([itemId]);
	let row = rows.find((entry) => entry.item.id === itemId);
	while (row?.parentId && !seen.has(row.parentId)) {
		seen.add(row.parentId);
		row = rows.find((entry) => entry.item.id === row.parentId);
		if (row) result.push(row.item);
	}
	return result;
}
function equipmentChain(items, itemId) {
	const rows = presentInventory(items).rows;
	const chain = [];
	const seen = /* @__PURE__ */ new Set();
	let invalid = false;
	let current = items.find((item) => item.id === itemId);
	while (current) {
		if (seen.has(current.id)) {
			invalid = true;
			break;
		}
		seen.add(current.id);
		chain.push(current);
		const row = rows.find((entry) => entry.item.id === current.id);
		if (row?.orphaned || row?.cyclic) invalid = true;
		const host = current.system.physical?.hostRef;
		if (referenceIdentity(host)) {
			if (row?.parentId) invalid = true;
			current = items.find((entry) => host.uuid && entry.uuid === host.uuid || host.relisId && entry.system.meta?.relisId === host.relisId);
			if (!current) invalid = true;
		} else current = row?.parentId ? items.find((entry) => entry.id === row.parentId) : void 0;
	}
	return {
		chain,
		invalid
	};
}
function equipmentBodyId(items, item) {
	const { chain, invalid } = equipmentChain(items, item.id);
	if (invalid) return "";
	return String(chain.find((entry) => entry.system.physical?.bodyId)?.system.physical.bodyId ?? "");
}
function equipmentPlan(items, body, request) {
	const errors = [];
	const warnings = [];
	const item = items.find((entry) => entry.id === request.itemId);
	if (!item) return {
		errors: ["Item absent."],
		warnings,
		patch: {},
		duration: "Non renseignée"
	};
	const physical = item.system.physical ?? {};
	const profile = physical.equipmentProfile ?? {};
	const state = request.state === "carried" ? "stored" : request.state;
	if (!body.id) errors.push("Corps actif introuvable.");
	const lineage = equipmentChain(items, item.id);
	const chain = lineage.chain;
	if (lineage.invalid) errors.push("Chaîne de conteneurs ou d’installation invalide.");
	const rows = presentInventory(items).rows;
	if (!equipmentStates(item).includes(state)) errors.push("État incompatible avec cet objet.");
	if (rows.some((row) => chain.some((entry) => entry.id === row.item.id) && (row.cyclic || row.orphaned))) errors.push("Localisation invalide : corriger les diagnostics.");
	if (chain.some((entry) => entry.system.physical?.accessibility === "unavailable" || ["restricted", "sealed"].includes(entry.system.accessRule) && entry.id !== item.id || (entry.flags?.relis?.inventoryTransfer?.state ?? "complete") !== "complete")) errors.push("Objet ou contenant indisponible.");
	if (chain.some((entry) => entry.system.physical?.bodyId && entry.system.physical.bodyId !== body.id)) errors.push("Objet associé à un autre corps : aucun déplacement automatique.");
	if (chain.slice(1).some((entry) => entry.system.physical?.equipState === "ground") && state !== "ground") errors.push("Reprendre d’abord le conteneur au sol ou l’hôte posé au sol.");
	if (!(Number(physical.quantity) > 0) || !Number.isFinite(Number(physical.quantity))) errors.push("Quantité invalide.");
	if (physical.unit === "count" && !Number.isInteger(Number(physical.quantity))) errors.push("Quantité comptée non entière.");
	const active = [
		"held-one",
		"held-two",
		"equipped",
		"installed"
	].includes(state);
	if (active && (Number(physical.quantity) !== 1 || physical.unit !== "count")) errors.push("Scinder une unité avant de la tenir, équiper ou installer.");
	if (active && ["broken", "destroyed"].includes(physical.condition)) errors.push("Objet brisé ou détruit.");
	if (active && profile.sizes?.length && !profile.sizes.includes(body.size)) errors.push("Taille incompatible avec le corps actif.");
	if (active && profile.natures?.length && !profile.natures.includes(body.nature)) errors.push("Nature corporelle incompatible.");
	const hands = state === "held-two" ? 2 : state === "held-one" ? 1 : 0;
	const others = items.filter((entry) => entry.id !== item.id && (entry.system.physical?.bodyId || body.id) === body.id);
	const usedHands = others.reduce((sum, entry) => sum + (equipmentState(entry) === "held-two" ? 2 : equipmentState(entry) === "held-one" ? 1 : 0), 0);
	if (hands && others.some((entry) => equipmentState(entry) === "readied")) errors.push("Préciser d’abord les mains des objets anciennement préparés.");
	if (hands && (body.carrying?.hands == null || !Number.isInteger(Number(body.carrying.hands)) || Number(body.carrying.hands) < 0)) errors.push("Nombre de mains utilisables non renseigné pour ce corps.");
	else if (hands && usedHands + hands > Number(body.carrying?.hands)) errors.push("Mains utilisables insuffisantes.");
	if (active) errors.push(...slotProfileErrors(profile));
	if (state === "equipped") {
		if (others.some((entry) => equipmentState(entry) === "equipped" && legacySlot(entry.system.physical?.equipmentProfile ?? {}))) errors.push("Reconfigurer les anciens emplacements des autres objets équipés avant d’équiper une nouvelle pièce.");
		if (legacySlot(profile)) errors.push("Ancien emplacement corporel à reconfigurer dans la fiche Item.");
		for (const key of bodySlots(profile)) {
			const conflicts = others.filter((entry) => equipmentState(entry) === "equipped" && bodySlots(entry.system.physical?.equipmentProfile ?? {}).includes(key));
			if (conflicts.length) errors.push(`${BODY_SLOTS[key] ?? key} : emplacement occupé par ${conflicts.map((entry) => entry.name).join(", ")}.`);
		}
		if (legacySlot(profile) && others.some((entry) => equipmentState(entry) === "equipped" && legacySlot(entry.system.physical?.equipmentProfile ?? {}) === legacySlot(profile))) errors.push("Ancien emplacement d’équipement déjà occupé.");
	}
	const host = items.find((entry) => entry.id === request.hostId);
	if (state === "installed") {
		if (!host || host.id === item.id) errors.push("Hôte d’installation invalide.");
		else {
			if (Number(host.system.physical?.quantity) !== 1 || host.system.physical?.unit !== "count") errors.push("L’hôte doit être un exemplaire unique compté.");
			const hostLineage = equipmentChain(items, host.id);
			if (hostLineage.invalid || hostLineage.chain.some((entry) => entry.id === item.id)) errors.push("Cycle ou chaîne d’installation invalide.");
			const hostChain = hostLineage.chain;
			if (hostChain.some((entry) => ancestors(items, entry.id).length > 0)) errors.push("Sortir l’hôte de son conteneur avant l’installation.");
			if (hostChain.some((entry) => entry.system.physical?.equipState === "ground" || entry.system.physical?.bodyId && entry.system.physical.bodyId !== body.id || entry.system.physical?.accessibility === "unavailable" || entry.id !== host.id && ["restricted", "sealed"].includes(entry.system.accessRule))) errors.push("Hôte hors de portée du corps actif.");
			if (host.system.physical?.accessibility === "unavailable" || (host.flags?.relis?.inventoryTransfer?.state ?? "complete") !== "complete") errors.push("Hôte indisponible.");
			if (host.system.physical?.bodyId && host.system.physical.bodyId !== body.id) errors.push("Hôte sur un autre corps.");
			if (profile.hostTypes?.length && !profile.hostTypes.includes(host.type)) errors.push("Type d’hôte incompatible.");
			errors.push(...installationSlotErrors(items, item, host));
		}
	}
	if (active && !profile.sizes?.length && !profile.natures?.length) warnings.push("Aucune restriction corporelle déclarée : compatibilité à vérifier selon la source.");
	if (equipmentState(item) === "installed" && state === "stored") warnings.push("L’objet sera détaché de son hôte et rangé dans l’inventaire principal.");
	if (active && !profile.duration) warnings.push("Temps et aide nécessaires à arbitrer selon la règle ou le MJ.");
	const patch = {
		"system.physical.equipState": hands ? "readied" : state,
		"system.physical.hands": hands,
		"system.physical.bodyId": state === "ground" || state === "installed" ? "" : body.id,
		"system.physical.hostRef": state === "installed" && host ? {
			...initialReference(),
			uuid: host.uuid,
			documentName: "Item",
			state: "resolved",
			labelSnapshot: host.name
		} : initialReference()
	};
	if (state !== "stored") {
		patch["system.physical.containerRef"] = initialReference();
		patch["system.physical.locationKey"] = state === "ground" ? "ground" : "body";
	}
	if (state === "stored" && !referenceIdentity(physical.containerRef)) patch["system.physical.locationKey"] = "actor-cargo";
	if (state !== "stored" && ancestors(items, item.id).length) warnings.push("L’objet sera sorti de son conteneur ; aucun autre objet ne sera déplacé.");
	return {
		errors,
		warnings,
		patch,
		duration: String(profile.duration || "Non renseignée")
	};
}
function carriedMass(items, body) {
	let mass = 0;
	let missing = 0;
	for (const item of items) {
		const { chain, invalid } = equipmentChain(items, item.id);
		if (chain.some((entry) => entry.system.physical?.equipState === "ground" || entry.system.physical?.bodyId && entry.system.physical.bodyId !== body.id)) continue;
		if (invalid) {
			missing++;
			continue;
		}
		const p = item.system.physical ?? {};
		const quantity = Number(p.quantity);
		const each = unitMass(item);
		if (each == null || !Number.isFinite(Number(each)) || Number(each) < 0 || !Number.isFinite(quantity) || quantity < 0) missing++;
		else mass += Number(each) * quantity;
	}
	mass = Math.round(mass * 1e6) / 1e6;
	const loaded = Number(body.carrying?.loaded);
	const overloaded = Number(body.carrying?.overloaded);
	const defined = Number.isFinite(loaded) && loaded > 0 && Number.isFinite(overloaded) && overloaded > loaded;
	return {
		mass,
		missing,
		defined,
		loaded,
		overloaded,
		status: !defined ? "Seuils non renseignés" : mass >= overloaded ? "Surchargé" : mass >= loaded ? "Chargé" : missing ? "Charge incomplète" : "Charge normale",
		meterValue: defined ? Math.min(mass, overloaded) : 0,
		percent: defined ? Math.min(100, mass / overloaded * 100) : 0,
		marker: defined ? loaded / overloaded * 100 : 0
	};
}
function projectEquipment(items, body, requests, assisted = false) {
	const projected = JSON.parse(JSON.stringify(items));
	const rows = [];
	const duplicate = /* @__PURE__ */ new Set();
	const ordered = [...requests].sort((a, b) => Number([
		"equipped",
		"held-one",
		"held-two",
		"installed"
	].includes(a.state)) - Number([
		"equipped",
		"held-one",
		"held-two",
		"installed"
	].includes(b.state)));
	for (const request of ordered) {
		const plan = equipmentPlan(projected, body, request);
		if (duplicate.has(request.itemId)) plan.errors.push("Item répété dans l’ensemble.");
		duplicate.add(request.itemId);
		rows.push({
			request,
			name: items.find((item) => item.id === request.itemId)?.name ?? "Item absent",
			...plan
		});
		if (!plan.errors.length) {
			const item = projected.find((entry) => entry.id === request.itemId);
			for (const [path, value] of Object.entries(plan.patch)) item.system.physical[path.slice(16)] = value;
		}
	}
	const failed = rows.some((row) => row.errors.length);
	return {
		rows,
		updates: failed && !assisted ? [] : rows.filter((row) => !row.errors.length).map((row) => ({
			_id: row.request.itemId,
			...row.patch
		})),
		mass: carriedMass(failed && !assisted ? items : projected, body),
		failed
	};
}
function equipmentFailureMessage(preview) {
	const reasons = preview.rows.filter((row) => row.errors.length).map((row) => `${row.name} : ${row.errors.join(" ")}`);
	return reasons.length ? `Équipement refusé — ${reasons.join(" · ")}` : "Aucun changement d’équipement applicable.";
}
//#endregion
//#region src/services/inventory.ts
var activeLocks = /* @__PURE__ */ new Set();
function ownedItems(actor) {
	const collection = actor.items?.contents ?? actor.items;
	if (typeof collection?.values === "function") return Array.from(collection.values());
	return Array.from(collection ?? []);
}
function itemSnapshot$1(item) {
	const source = item.toObject?.(true) ?? {};
	return {
		id: item.id,
		name: item.name,
		type: item.type,
		uuid: item.uuid,
		system: source.system ?? item.system ?? {},
		flags: source.flags ?? item.flags ?? {}
	};
}
function actorSnapshots(actor) {
	return ownedItems(actor).filter((item) => isPhysicalItemType(item.type)).map(itemSnapshot$1);
}
function operationId() {
	return `OP-INV-${createRelisId()}`;
}
function actorLockKey(actor) {
	return actor.uuid || String(actor.id ?? actor.name);
}
async function withActorLocks(actors, callback) {
	const keys = Array.from(new Set(actors.map(actorLockKey))).sort();
	if (keys.some((key) => activeLocks.has(key))) throw new Error("Une autre opération d’inventaire est déjà en cours.");
	for (const key of keys) activeLocks.add(key);
	try {
		return await callback();
	} finally {
		for (const key of keys) activeLocks.delete(key);
	}
}
function assertActorPermission(actor) {
	if (!game.user?.isGM && !actor.isOwner) throw new Error(`Vous ne pouvez pas modifier l’inventaire de ${actor.name}.`);
	if (actor.flags?.relis?.equipmentRecovery) throw new Error("Une opération d’équipement doit être récupérée par le MJ avant de poursuivre.");
}
function assertDetachedTree(actor, itemId) {
	const items = actorSnapshots(actor);
	if ([itemId, ...descendantIds(items, itemId)].some((id) => equipmentLinked(items, id))) throw new Error("Détachez les installations avant de déplacer ou transférer cet ensemble.");
}
function previewEquipment(actor, requests, assisted = false) {
	const body = Array.from(actor.system.bodies ?? []).find((entry) => entry.id === actor.system.activeBodyId);
	if (!body) throw new Error("Corps actif introuvable.");
	const snapshots = actorSnapshots(actor);
	return {
		...projectEquipment(snapshots, body, requests, assisted),
		fingerprint: JSON.stringify({
			snapshots,
			body
		}),
		body
	};
}
async function applyEquipment(actor, requests, fingerprint, assisted = false) {
	assertActorPermission(actor);
	await withActorLocks([actor], async () => {
		assertActorPermission(actor);
		const preview = previewEquipment(actor, requests, assisted);
		if (preview.fingerprint !== fingerprint) throw new Error("L’inventaire ou le corps a changé. Refaire l’aperçu.");
		if (!preview.updates.length) throw new Error(equipmentFailureMessage(preview));
		const before = preview.updates.map((update) => {
			const physical = itemById(actor, update._id).system.physical;
			const restored = { _id: update._id };
			for (const path of Object.keys(update).filter((key) => key !== "_id")) restored[path] = JSON.parse(JSON.stringify(physical[path.slice(16)] ?? (path.endsWith("Ref") ? initialReference() : path.endsWith("hands") ? 0 : "")));
			return restored;
		});
		await actor.update({ "flags.relis.equipmentRecovery": {
			before,
			at: Date.now()
		} });
		try {
			await actor.updateEmbeddedDocuments("Item", preview.updates, inventoryCreateOptions());
			await actor.update({ "flags.relis.equipmentRecovery": new foundry.data.operators.ForcedDeletion() });
		} catch (error) {
			try {
				await actor.updateEmbeddedDocuments("Item", before, inventoryCreateOptions());
				await actor.update({ "flags.relis.equipmentRecovery": new foundry.data.operators.ForcedDeletion() });
			} catch {
				throw new Error("Écriture interrompue : restauration MJ requise, sauvegarde conservée sur l’Actor.");
			}
			throw error;
		}
		await appendJournal(actor, journalEntry("equip", operationId(), preview.updates.map((entry) => entry._id), null));
	});
}
async function recoverEquipment(actor) {
	if (!game.user?.isGM) throw new Error("Récupération réservée au MJ.");
	await withActorLocks([actor], async () => {
		const before = actor.flags?.relis?.equipmentRecovery?.before;
		if (!Array.isArray(before)) throw new Error("Aucune sauvegarde à restaurer.");
		await actor.updateEmbeddedDocuments("Item", before, inventoryCreateOptions());
		await actor.update({ "flags.relis.equipmentRecovery": new foundry.data.operators.ForcedDeletion() });
	});
}
async function saveEquipmentOutfit(actor, slot, name) {
	assertActorPermission(actor);
	if (!Number.isInteger(slot) || slot < 0 || slot > 4 || !name.trim()) throw new Error("Ensemble invalide.");
	await withActorLocks([actor], async () => {
		const items = actorSnapshots(actor);
		const bodyId = String(actor.system.activeBodyId);
		const entries = items.filter((item) => equipmentBodyId(items, item) === bodyId).filter((item) => !["stored", "ground"].includes(equipmentState(item))).map((item) => ({
			itemId: item.id,
			state: equipmentState(item),
			hostId: items.find((host) => installedOn(item, host))?.id ?? ""
		}));
		const outfits = JSON.parse(JSON.stringify(Array.from(actor.system.outfits ?? [])));
		const id = `equipment-${slot + 1}`;
		const index = outfits.findIndex((outfit) => outfit.id === id);
		const value = {
			...index < 0 ? {} : outfits[index],
			id,
			sort: slot,
			name: name.trim(),
			bodyIds: [bodyId],
			equipmentEntries: entries,
			itemRefs: entries.map((entry) => {
				const item = items.find((candidate) => candidate.id === entry.itemId);
				return {
					...initialReference(),
					uuid: item.uuid,
					labelSnapshot: item.name,
					documentName: "Item",
					state: "resolved"
				};
			}),
			readiness: "incomplete"
		};
		if (index < 0) outfits.push(value);
		else outfits[index] = value;
		await actor.update({ "system.outfits": outfits });
	});
}
function itemById(actor, itemId) {
	const item = actor.items?.get?.(itemId);
	if (!item || !isPhysicalItemType(item.type)) throw new Error("Item physique introuvable dans cet inventaire.");
	return item;
}
function containerReference(item) {
	return initialReference({
		relisId: String(item.system.meta?.relisId ?? ""),
		uuid: item.uuid,
		documentName: "Item",
		type: "container",
		state: "resolved",
		labelSnapshot: item.name
	});
}
function transferFlag(item) {
	const value = item.flags?.relis?.inventoryTransfer;
	return value && typeof value === "object" ? value : null;
}
function assertAvailable(item) {
	if (transferFlag(item) && transferFlag(item)?.state !== "complete") throw new Error("Cet Item appartient à un transfert en attente de récupération MJ.");
}
async function appendJournal(actor, entry) {
	const current = Array.from(actor.flags?.relis?.inventoryJournal ?? []);
	try {
		await actor.update({ "flags.relis.inventoryJournal": [...current.slice(-99), entry] });
	} catch (error) {
		console.warn("RE:LIS | Journal d’inventaire non écrit", error);
	}
}
function journalEntry(action, operation, itemIds, quantity, extra = {}) {
	return {
		operationId: operation,
		action,
		at: Date.now(),
		userId: String(game.user?.id ?? ""),
		itemIds,
		quantity,
		...extra
	};
}
function cloneItemData(item) {
	const data = item.toObject(true);
	delete data._id;
	data.system = JSON.parse(JSON.stringify(data.system ?? item.system ?? {}));
	data.flags = JSON.parse(JSON.stringify(data.flags ?? {}));
	return data;
}
function inventoryCreateOptions() {
	return {
		relisInventoryOperation: true,
		relisProvenance: true
	};
}
async function createInventoryItem(actor, name, type) {
	assertActorPermission(actor);
	if (!isPhysicalItemType(type)) throw new Error("Le type demandé n’appartient pas à l’inventaire physique.");
	const trimmedName = name.trim();
	if (!trimmedName) throw new Error("Le nom de l’Item est obligatoire.");
	return withActorLocks([actor], async () => {
		const operation = operationId();
		const [created] = await actor.createEmbeddedDocuments("Item", [{
			name: trimmedName,
			type
		}], inventoryCreateOptions());
		if (!created) throw new Error("Foundry n’a pas créé l’Item demandé.");
		await appendJournal(actor, journalEntry("create", operation, [String(created.id)], 1));
		return created;
	});
}
async function splitInventoryStack(actor, itemId, requested) {
	assertActorPermission(actor);
	return withActorLocks([actor], async () => {
		const source = itemById(actor, itemId);
		assertDetachedTree(actor, itemId);
		assertAvailable(source);
		const errors = validateStackSplit(itemSnapshot$1(source), requested);
		if (errors.length) throw new Error(errors.join(" "));
		const before = Number(source.system.physical.quantity);
		const after = before - requested;
		const operation = operationId();
		const data = cloneItemData(source);
		data.system.meta.relisId = createWorldItemId();
		data.system.meta.revision = 0;
		data.system.physical.quantity = requested;
		data.flags.relis ??= {};
		data.flags.relis.inventoryOperation = {
			operationId: operation,
			action: "split",
			state: "complete"
		};
		await source.update({ "system.physical.quantity": after }, inventoryCreateOptions());
		try {
			const [created] = await actor.createEmbeddedDocuments("Item", [data], inventoryCreateOptions());
			if (!created) throw new Error("La nouvelle pile n’a pas été créée.");
			await appendJournal(actor, journalEntry("split", operation, [source.id, String(created.id)], requested));
			return created;
		} catch (error) {
			await source.update({ "system.physical.quantity": before }, inventoryCreateOptions());
			throw error;
		}
	});
}
async function mergeInventoryStacks(actor, targetId, sourceId) {
	assertActorPermission(actor);
	await withActorLocks([actor], async () => {
		const target = itemById(actor, targetId);
		const source = itemById(actor, sourceId);
		assertDetachedTree(actor, targetId);
		assertDetachedTree(actor, sourceId);
		assertAvailable(target);
		assertAvailable(source);
		if (!canMergeStacks(itemSnapshot$1(target), itemSnapshot$1(source))) throw new Error("Ces piles diffèrent par leur source, leur lot, leur état, leurs charges ou leur emplacement.");
		const targetBefore = Number(target.system.physical.quantity);
		const sourceQuantity = Number(source.system.physical.quantity);
		const operation = operationId();
		await target.update({ "system.physical.quantity": targetBefore + sourceQuantity }, inventoryCreateOptions());
		try {
			await actor.deleteEmbeddedDocuments("Item", [source.id], inventoryCreateOptions());
		} catch (error) {
			await target.update({ "system.physical.quantity": targetBefore }, inventoryCreateOptions());
			throw error;
		}
		await appendJournal(actor, journalEntry("merge", operation, [target.id, source.id], sourceQuantity));
	});
}
async function moveInventoryItem(actor, itemId, targetContainerId) {
	assertActorPermission(actor);
	await withActorLocks([actor], async () => {
		const item = itemById(actor, itemId);
		assertDetachedTree(actor, itemId);
		assertAvailable(item);
		const target = targetContainerId ? itemById(actor, targetContainerId) : null;
		const validation = validateInventoryMove(actorSnapshots(actor), item.id, target?.id ?? null);
		if (!validation.valid) throw new Error(validation.errors.join(" "));
		const accessRule = String(target?.system.accessRule ?? "normal");
		const accessibility = target ? accessRule === "quick" ? "accessible" : ["restricted", "sealed"].includes(accessRule) ? "unavailable" : "stored" : "stored";
		const operation = operationId();
		await item.update({
			"system.physical.containerRef": target ? containerReference(target) : initialReference(),
			"system.physical.locationKey": target ? "" : "actor-cargo",
			"system.physical.accessibility": accessibility,
			"system.physical.equipState": "stored",
			"system.physical.hands": 0,
			"system.physical.bodyId": target ? "" : String(actor.system.activeBodyId ?? "")
		}, inventoryCreateOptions());
		await appendJournal(actor, journalEntry("move", operation, [item.id], null, { targetContainerId: target?.id ?? null }));
	});
}
function transferTree(actor, root) {
	const snapshots = actorSnapshots(actor);
	const ids = /* @__PURE__ */ new Set([root.id, ...descendantIds(snapshots, root.id)]);
	return ownedItems(actor).filter((item) => ids.has(item.id));
}
function remappedReference(oldParent, newRelisId) {
	return initialReference({
		relisId: newRelisId,
		uuid: "",
		documentName: "Item",
		type: "container",
		state: "resolved",
		labelSnapshot: oldParent.name
	});
}
async function activateTransfer(actor, items) {
	await actor.updateEmbeddedDocuments("Item", items.map((item) => {
		const pending = transferFlag(item);
		return {
			_id: item.id,
			"system.physical.accessibility": pending?.finalAccessibility ?? "stored",
			"flags.relis.inventoryTransfer.state": "complete"
		};
	}), inventoryCreateOptions());
}
async function transferInventoryItem(sourceActor, destinationActor, itemId, requested) {
	assertActorPermission(sourceActor);
	assertActorPermission(destinationActor);
	if (sourceActor.uuid === destinationActor.uuid) throw new Error("Choisissez un autre Actor pour un transfert.");
	return withActorLocks([sourceActor, destinationActor], async () => {
		const root = itemById(sourceActor, itemId);
		assertDetachedTree(sourceActor, itemId);
		assertAvailable(root);
		const before = Number(root.system.physical.quantity ?? 0);
		if (root.type === "container" && before !== 1) throw new Error("Ce conteneur porte une quantité incohérente. Ramenez-la à 1 avant le transfert.");
		const quantity = requested === void 0 ? before : Number(requested);
		const partial = quantity < before;
		if (partial) {
			const errors = validateStackSplit(itemSnapshot$1(root), quantity);
			if (errors.length) throw new Error(errors.join(" "));
		} else if (!Number.isFinite(quantity) || quantity <= 0 || quantity > before) throw new Error("La quantité transférée est invalide.");
		if (root.type === "container" && quantity !== before) throw new Error("Un conteneur se transfère avec toute son arborescence.");
		const tree = partial ? [root] : transferTree(sourceActor, root);
		const operation = operationId();
		const newRelisIds = new Map(tree.map((item) => [item.id, createWorldItemId()]));
		const byRelisId = new Map(tree.map((item) => [String(item.system.meta?.relisId ?? ""), item]));
		const sourceItemIds = tree.map((item) => item.id);
		const after = partial ? before - quantity : 0;
		const transferData = tree.map((item) => {
			const data = cloneItemData(item);
			data.system.physical.equipState = "stored";
			data.system.physical.hands = 0;
			data.system.physical.bodyId = "";
			data.system.physical.hostRef = initialReference();
			const originalAccessibility = String(item.system.physical?.accessibility ?? "stored");
			data.system.meta.relisId = newRelisIds.get(item.id);
			data.system.meta.revision = 0;
			if (item.id === root.id) {
				data.system.physical.quantity = quantity;
				data.system.physical.containerRef = initialReference();
				data.system.physical.locationKey = "actor-cargo";
			} else {
				const oldParentRelisId = String(item.system.physical?.containerRef?.relisId ?? "");
				const oldParent = byRelisId.get(oldParentRelisId);
				if (!oldParent) throw new Error(`Le parent de ${item.name} ne peut pas être remappé pendant le transfert.`);
				data.system.physical.containerRef = remappedReference(oldParent, String(newRelisIds.get(oldParent.id)));
			}
			data.system.physical.accessibility = "unavailable";
			data.flags.relis ??= {};
			data.flags.relis.inventoryTransfer = {
				operationId: operation,
				state: "pending",
				mode: partial ? "partial" : "full",
				sourceActorUuid: sourceActor.uuid,
				sourceRootId: root.id,
				sourceItemIds,
				sourceQuantityBefore: before,
				sourceQuantityAfter: after,
				finalAccessibility: originalAccessibility
			};
			return data;
		});
		const created = await destinationActor.createEmbeddedDocuments("Item", transferData, inventoryCreateOptions());
		if (created.length !== transferData.length) {
			if (created.length) await destinationActor.deleteEmbeddedDocuments("Item", created.map((item) => item.id), inventoryCreateOptions());
			throw new Error("Le transfert n’a pas créé toute l’arborescence attendue.");
		}
		try {
			if (partial) await root.update({ "system.physical.quantity": after }, inventoryCreateOptions());
			else await sourceActor.deleteEmbeddedDocuments("Item", sourceItemIds, inventoryCreateOptions());
		} catch (error) {
			await destinationActor.deleteEmbeddedDocuments("Item", created.map((item) => item.id), inventoryCreateOptions());
			throw error;
		}
		try {
			await activateTransfer(destinationActor, created);
		} catch (error) {
			console.error(`RE:LIS | Transfert ${operation} placé en attente de récupération`, error);
			throw new Error("Le transfert est conservé mais reste indisponible. Un MJ le finalisera au prochain chargement.", { cause: error });
		}
		await Promise.all([appendJournal(sourceActor, journalEntry("transfer-out", operation, sourceItemIds, quantity, { counterpartActorUuid: destinationActor.uuid })), appendJournal(destinationActor, journalEntry("transfer-in", operation, created.map((item) => item.id), quantity, { counterpartActorUuid: sourceActor.uuid }))]);
		return created;
	});
}
async function sourceActorForPending(pending) {
	try {
		return await foundry.utils.fromUuid(pending.sourceActorUuid);
	} catch {
		return null;
	}
}
async function recoverPendingInventoryTransfers() {
	if (!game.user?.isGM) return 0;
	let recovered = 0;
	for (const actor of Array.from(game.actors?.contents ?? game.actors ?? [])) {
		const groups = /* @__PURE__ */ new Map();
		for (const item of ownedItems(actor)) {
			const pending = transferFlag(item);
			if (!pending || pending.state !== "pending") continue;
			const entries = groups.get(pending.operationId) ?? [];
			entries.push(item);
			groups.set(pending.operationId, entries);
		}
		for (const items of groups.values()) {
			const pending = transferFlag(items[0]);
			if (!pending) continue;
			const sourceActor = await sourceActorForPending(pending);
			const sourceRoot = sourceActor?.items?.get?.(pending.sourceRootId);
			const shouldActivate = pending.mode === "full" ? Boolean(sourceActor && pending.sourceItemIds.every((id) => !sourceActor.items?.get?.(id))) : Number(sourceRoot?.system.physical?.quantity) === pending.sourceQuantityAfter;
			const shouldRemove = pending.mode === "full" ? Boolean(sourceActor && pending.sourceItemIds.every((id) => sourceActor.items?.get?.(id))) : Number(sourceRoot?.system.physical?.quantity) === pending.sourceQuantityBefore;
			if (shouldActivate) {
				await activateTransfer(actor, items);
				recovered += items.length;
			} else if (shouldRemove) {
				await actor.deleteEmbeddedDocuments("Item", items.map((item) => item.id), inventoryCreateOptions());
				recovered += items.length;
			} else {
				await actor.updateEmbeddedDocuments("Item", items.map((item) => ({
					_id: item.id,
					"flags.relis.inventoryTransfer.state": "quarantined"
				})), inventoryCreateOptions());
				console.error(`RE:LIS | Transfert ${pending.operationId} mis en quarantaine : état source ambigu.`);
			}
		}
	}
	return recovered;
}
/** Profile edits share the inventory lock and cannot silently invalidate equipment. */
async function saveEquipmentProfile(item, patch) {
	if (!item.isOwner) throw new Error("Vous ne pouvez pas modifier cet objet.");
	const actor = item.parent;
	if (!actor) {
		await item.update(patch);
		return;
	}
	await withActorLocks([actor], async () => {
		assertActorPermission(actor);
		if (!item.isOwner) throw new Error("Vous ne pouvez pas modifier cet objet.");
		const before = actorSnapshots(actor);
		const after = JSON.parse(JSON.stringify(before));
		const target = after.find((entry) => entry.id === item.id);
		if (!target) throw new Error("Objet absent de l’inventaire.");
		const profile = target.system.physical.equipmentProfile ??= {};
		for (const [path, value] of Object.entries(patch)) {
			if (!path.startsWith("system.physical.equipmentProfile.")) throw new Error("Champ hors du profil d’équipement.");
			const keys = path.slice(33).split(".");
			if (keys.some((key) => [
				"__proto__",
				"constructor",
				"prototype"
			].includes(key))) throw new Error("Champ invalide.");
			let current = profile;
			for (const key of keys.slice(0, -1)) current = current[key] ??= {};
			current[keys.at(-1)] = value;
		}
		const bodies = Array.from(actor.system.bodies ?? []);
		const inspect = (items) => items.flatMap((entry) => {
			const p = entry.system.physical ?? {};
			if (![
				"readied",
				"equipped",
				"installed"
			].includes(p.equipState)) return [];
			const body = bodies.find((candidate) => candidate.id === (equipmentBodyId(items, entry) || actor.system.activeBodyId));
			if (!body) return [`${entry.id} : corps absent.`];
			const host = items.find((candidate) => p.hostRef?.uuid && p.hostRef.uuid === candidate.uuid || p.hostRef?.relisId && p.hostRef.relisId === candidate.system.meta?.relisId);
			return equipmentPlan(items, body, {
				itemId: entry.id,
				state: equipmentState(entry),
				hostId: host?.id ?? ""
			}).errors.map((message) => `${entry.name} : ${message}`);
		});
		const oldErrors = new Set(inspect(before));
		const introduced = inspect(after).filter((message) => !oldErrors.has(message));
		if (introduced.length) throw new Error(`Profil refusé — ${introduced.join(" · ")} Ranger ou détacher les objets concernés avant de reconfigurer.`);
		await item.update(patch);
	});
}
//#endregion
//#region src/ui/inventory-view.ts
/** Presentation only: never writes Actor or Item data. */
var INVENTORY_CATEGORIES = [
	["weapon", "Armes"],
	["armor", "Armures & protections"],
	["equipment", "Équipement"],
	["consumable", "Consommables"],
	["ammunition", "Munitions"],
	["resource", "Ressources"],
	["container", "Conteneurs"]
];
function groupInventory(rows) {
	const groups = INVENTORY_CATEGORIES.map(([id, label]) => ({
		id,
		label,
		inventoryRows: []
	}));
	const stack = [];
	let group = groups[0];
	for (const row of rows) {
		while (stack.length && stack[stack.length - 1].depth >= row.depth) stack.pop();
		if (!stack.length) group = groups.find((entry) => entry.id === row.type) ?? groups[2];
		group.inventoryRows.push({
			...row,
			ancestors: JSON.stringify(stack.map((entry) => entry.id)),
			path: stack.map((entry) => entry.name).join(" › ")
		});
		stack.push(row);
	}
	return groups;
}
function normalizeInventorySearch(value) {
	return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr").trim();
}
function inventoryMatches(rows, query) {
	const needle = normalizeInventorySearch(query);
	const visible = /* @__PURE__ */ new Set();
	for (const row of rows) if (normalizeInventorySearch(row.name).includes(needle)) {
		visible.add(row.id);
		for (const ancestor of row.ancestors) visible.add(ancestor);
	}
	return visible;
}
function bindInventoryView(root, identity, queryState) {
	const panel = root.querySelector("[data-inventory-view]");
	if (!panel) return;
	const key = `relis.inventory-view.v1.${identity}`;
	let folded = /* @__PURE__ */ new Set();
	let showEmpty = false;
	try {
		const saved = JSON.parse(localStorage.getItem(key) ?? "null");
		if (Array.isArray(saved?.folded)) folded = new Set(saved.folded.filter((value) => typeof value === "string"));
		showEmpty = saved?.showEmpty === true;
	} catch {}
	const save = () => {
		try {
			localStorage.setItem(key, JSON.stringify({
				folded: [...folded],
				showEmpty
			}));
		} catch {}
	};
	const rows = Array.from(panel.querySelectorAll("[data-inventory-row]"));
	const descriptors = rows.map((row) => ({
		id: row.dataset.itemId,
		name: row.dataset.itemName,
		ancestors: JSON.parse(row.dataset.ancestors ?? "[]")
	}));
	const categories = Array.from(panel.querySelectorAll("[data-inventory-category]"));
	const search = panel.querySelector("[data-inventory-search]");
	const emptyToggle = panel.querySelector("[data-inventory-empty]");
	search.value = queryState.value;
	emptyToggle.checked = showEmpty;
	const update = () => {
		const searching = Boolean(normalizeInventorySearch(search.value));
		const matches = inventoryMatches(descriptors, search.value);
		rows.forEach((row, index) => {
			const descriptor = descriptors[index];
			row.hidden = searching ? !matches.has(descriptor.id) : descriptor.ancestors.some((id) => folded.has(`item:${id}`));
		});
		for (const category of categories) {
			const children = Array.from(category.querySelectorAll("[data-inventory-row]"));
			category.hidden = searching ? !children.some((row) => matches.has(row.dataset.itemId)) : !showEmpty && children.length === 0;
			category.querySelector("[data-category-content]").hidden = !searching && folded.has(`category:${category.dataset.inventoryCategory}`);
		}
		for (const button of panel.querySelectorAll("[data-inventory-fold]")) {
			button.setAttribute("aria-expanded", String(searching || !folded.has(button.dataset.inventoryFold)));
			button.disabled = searching;
		}
		const count = descriptors.filter((row) => normalizeInventorySearch(row.name).includes(normalizeInventorySearch(search.value))).length;
		panel.querySelector("[data-inventory-result]").textContent = searching ? `${count} résultat(s) — chemin des conteneurs inclus` : "";
	};
	search.addEventListener("input", () => {
		queryState.value = search.value;
		update();
	});
	panel.querySelector("[data-inventory-clear]").addEventListener("click", () => {
		search.value = "";
		queryState.value = "";
		update();
		search.focus();
	});
	emptyToggle.addEventListener("change", () => {
		showEmpty = emptyToggle.checked;
		save();
		update();
	});
	for (const button of panel.querySelectorAll("[data-inventory-fold]")) button.addEventListener("click", () => {
		const id = button.dataset.inventoryFold;
		if (folded.has(id)) folded.delete(id);
		else folded.add(id);
		save();
		update();
	});
	update();
}
//#endregion
//#region src/ui/actor-portrait.ts
/** Editing the Actor image is distinct from opening its artwork. */
function openActorPortraitPicker(actor) {
	if (!actor.isOwner) return;
	const FilePicker = foundry.applications.apps.FilePicker.implementation;
	new FilePicker({
		type: "image",
		current: actor.img ?? "",
		callback: async (path) => {
			if (!actor.isOwner || !path) return;
			try {
				await actor.update({ img: path });
			} catch (error) {
				ui.notifications.error(error instanceof Error ? error.message : "Le portrait n’a pas pu être enregistré.");
			}
		}
	}).render({ force: true });
}
//#endregion
//#region src/ui/actor-tabs.ts
var CHARACTER_TABS = [
	{
		id: "summary",
		label: "Synthèse"
	},
	{
		id: "identity",
		label: "Identité & Corps"
	},
	{
		id: "attributes",
		label: "Attributs & Compétences"
	},
	{
		id: "progression",
		label: "Progression"
	},
	{
		id: "capabilities",
		label: "Capacités & Énergies"
	},
	{
		id: "inventory",
		label: "Inventaire & Garde-Robe"
	},
	{
		id: "health",
		label: "Santé & Survie"
	},
	{
		id: "relations",
		label: "Relations & Journal"
	}
];
var NPC_TABS = [
	{
		id: "summary",
		label: "Synthèse"
	},
	{
		id: "identity",
		label: "Identité"
	},
	{
		id: "mechanics",
		label: "Mécanique"
	},
	{
		id: "capabilities",
		label: "Capacités & Équipement"
	},
	{
		id: "health",
		label: "Santé"
	},
	{
		id: "relations",
		label: "Relations & Notes"
	}
];
var NPC_CONDENSED_TABS = NPC_TABS.filter((tab) => [
	"summary",
	"identity",
	"capabilities"
].includes(tab.id));
var NPC_STANDARD_TABS = NPC_TABS.filter((tab) => tab.id !== "relations");
function actorTabsForType(actorType, detailLevel = "complete") {
	if (actorType !== "npc") return CHARACTER_TABS;
	if (detailLevel === "condensed") return NPC_CONDENSED_TABS;
	if (detailLevel === "standard") return NPC_STANDARD_TABS;
	return NPC_TABS;
}
function normalizeActorTab(actorType, requested, detailLevel = "complete") {
	const tabs = actorTabsForType(actorType, detailLevel);
	return tabs.some((tab) => tab.id === requested) ? String(requested) : tabs[0]?.id ?? "summary";
}
//#endregion
//#region src/sheets/actor-sheet.ts
var ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
var HandlebarsApplicationMixin$1 = foundry.applications.api.HandlebarsApplicationMixin;
function fieldValue$1(target) {
	if (target instanceof HTMLInputElement && target.type === "checkbox") return target.checked;
	if (target.dataset.valueType === "number") return target.value.trim() === "" ? null : Number(target.value);
	return target.value;
}
var BODY_NATURE_LABELS = {
	biological: "Biologique",
	synthetic: "Synthétique",
	hybrid: "Hybride",
	energetic: "Énergétique",
	atypical: "Atypique"
};
var NEED_LABELS = {
	oxygen: "Oxygène",
	food: "Alimentation",
	water: "Hydratation",
	sleep: "Sommeil",
	energy: "Énergie",
	cooling: "Refroidissement",
	maintenance: "Maintenance",
	rest: "Repos",
	feeding: "Alimentation spéciale",
	uvExposure: "Exposition UV",
	environmentalSafety: "Sécurité environnementale"
};
var NPC_DETAIL_OPTIONS = [
	{
		key: "condensed",
		label: "Figurant — condensé"
	},
	{
		key: "standard",
		label: "Secondaire — standard"
	},
	{
		key: "complete",
		label: "Majeur — complet"
	}
];
var STABILITY_OPTIONS = [
	{
		key: "stable",
		label: "Stable"
	},
	{
		key: "unstable",
		label: "Instable"
	},
	{
		key: "stabilized",
		label: "Stabilisé"
	},
	{
		key: "incapacitated",
		label: "Hors de combat"
	}
];
var INVENTORY_CONDITION_LABELS = {
	intact: "Intact",
	worn: "Usé",
	damaged: "Endommagé",
	broken: "Brisé",
	destroyed: "Détruit"
};
var INVENTORY_ACCESS_LABELS = {
	ready: "Prêt",
	accessible: "Accessible",
	stored: "Rangé",
	distant: "Distant",
	unavailable: "Indisponible"
};
var QUANTITY_UNIT_LABELS = {
	count: "unité(s)",
	kg: "kg",
	g: "g",
	l: "L",
	ml: "mL",
	m: "m"
};
function itemSnapshot(item) {
	const source = item.toObject?.(true) ?? {};
	return {
		id: item.id,
		name: item.name,
		type: item.type,
		uuid: item.uuid,
		system: source.system ?? item.system ?? {},
		flags: source.flags ?? item.flags ?? {}
	};
}
function displayMeasure(value, suffix) {
	return value === null ? "Inconnue" : `${value} ${suffix}`;
}
function dialogContent() {
	return document.createElement("div");
}
function dialogNumber(content, label, name, value, maximum, integerValue) {
	const field = document.createElement("label");
	field.className = "relis-inventory-dialog-field";
	field.textContent = label;
	const input = document.createElement("input");
	input.type = "number";
	input.name = name;
	input.min = integerValue ? "1" : "0.000001";
	input.max = String(maximum);
	input.step = integerValue ? "1" : "any";
	input.value = String(value);
	input.autofocus = true;
	field.append(input);
	content.append(field);
}
function dialogText(content, label, name, value = "") {
	const field = document.createElement("label");
	field.className = "relis-inventory-dialog-field";
	field.textContent = label;
	const input = document.createElement("input");
	input.type = "text";
	input.name = name;
	input.value = value;
	input.required = true;
	input.autofocus = true;
	field.append(input);
	content.append(field);
}
function dialogOptional(content, label, name, value = "", numeric = false) {
	dialogText(content, label, name, value == null ? "" : String(value));
	const input = content.querySelector(`[name="${name}"]`);
	input.required = false;
	if (numeric) {
		input.type = "number";
		input.min = "0";
		input.step = "any";
	}
}
function dialogNote(content, text) {
	const paragraph = document.createElement("p");
	paragraph.textContent = text;
	content.append(paragraph);
}
function dialogSelect(content, label, name, choices) {
	const field = document.createElement("label");
	field.className = "relis-inventory-dialog-field";
	field.textContent = label;
	const select = document.createElement("select");
	select.name = name;
	for (const choice of choices) {
		const option = document.createElement("option");
		option.value = choice.value;
		option.textContent = choice.label;
		select.append(option);
	}
	field.append(select);
	content.append(field);
}
async function askInventoryForm(title, content, label) {
	return await foundry.applications.api.DialogV2.input({
		window: { title },
		content,
		ok: { label },
		modal: true,
		rejectClose: false
	});
}
function referencePresentation(reference) {
	return {
		label: String(reference?.labelSnapshot ?? "").trim() || String(reference?.relisId ?? "").trim() || "Référence sans libellé",
		state: String(reference?.state ?? "unresolved"),
		uuid: String(reference?.uuid ?? "")
	};
}
var RelisActorSheet = class extends HandlebarsApplicationMixin$1(ActorSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: [
			"relis",
			"actor-sheet",
			"relis-actor-sheet"
		],
		position: {
			width: 920,
			height: 720
		},
		window: { resizable: true }
	};
	static PARTS = { main: { template: "systems/relis/templates/actors/character.hbs" } };
	activeTab = "summary";
	inventoryQuery = { value: "" };
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const isCharacter = this.actor.type === "character";
		const isNpc = this.actor.type === "npc";
		const isPerson = isCharacter || isNpc;
		const npcDetailLevel = isNpc ? String(this.actor.system.detailLevel ?? "standard") : "complete";
		const attributes = isPerson ? Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
			key,
			label,
			base: this.actor.system.attributes[key].base,
			partial: this.actor.system.attributes[key].partial,
			effective: this.actor.system.derived?.attributes?.[key] ?? 0
		})) : [];
		const allSkills = isPerson ? Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => ({
			key,
			label: definition[0],
			defaultAttribute: definition[1],
			rank: this.actor.system.skills[key].rank,
			masteryBonus: this.actor.system.derived?.skills?.[key]?.masteryBonus ?? 0,
			total: this.actor.system.derived?.skills?.[key]?.total ?? 0,
			favorite: Boolean(this.actor.system.skills[key].favorite),
			masteryRanks: Object.entries(MASTERY_LABELS).map(([rankKey, label]) => ({
				key: rankKey,
				label
			}))
		})) : [];
		const skills = isNpc ? allSkills.filter((skill) => {
			if (npcDetailLevel === "complete") return true;
			if (npcDetailLevel === "standard") return skill.favorite || skill.rank !== "untrained";
			return skill.favorite || skill.rank !== "untrained";
		}) : allSkills;
		const energyPools = isPerson ? Array.from(this.actor.system.energyPools ?? []).map((pool, index) => {
			const plain = plainResourcePool(pool);
			const presentation = resourcePoolPresentation(plain.key);
			return {
				...plain,
				...presentation,
				index,
				resourceClass: presentation.isDemo ? "relis-resource--demo" : "relis-resource--energy",
				cardClass: presentation.isDemo ? "relis-energy-card--demo" : "relis-energy-card--canonical"
			};
		}) : [];
		const effects = Array.from(this.actor.effects ?? []).map((effect) => {
			const presentation = presentCondition(String(effect.system?.conditionKey ?? effect.name), game.i18n);
			return {
				id: effect.id,
				name: effect.name || presentation.label,
				description: presentation.description,
				icon: effect.img || "icons/svg/aura.svg",
				intensity: Math.max(0, Math.trunc(Number(effect.system?.intensity) || 0)),
				duration: formatRoundDuration(effect.duration?.remaining ?? effect.duration?.rounds, game.i18n)
			};
		});
		const normalizedTab = normalizeActorTab(this.actor.type, this.activeTab, npcDetailLevel);
		const tabs = actorTabsForType(this.actor.type, npcDetailLevel).map((tab) => ({
			...tab,
			active: tab.id === normalizedTab,
			tabIndex: tab.id === normalizedTab ? 0 : -1
		}));
		const favoriteSkills = skills.filter((skill) => skill.favorite);
		const featuredSkills = favoriteSkills.length > 0 ? favoriteSkills : skills.slice(0, 4);
		const publicName = isPerson ? String(this.actor.system.identity.publicName ?? "").trim() : "";
		const activeBody = this.actor.system.derived?.activeBody ?? null;
		const bodies = isPerson ? Array.from(this.actor.system.bodies ?? []).map((body) => ({
			id: String(body.id),
			name: String(body.name),
			nature: String(body.nature),
			natureLabel: BODY_NATURE_LABELS[String(body.nature)] ?? String(body.nature),
			size: String(body.size),
			selected: String(body.id) === String(this.actor.system.activeBodyId)
		})) : [];
		const needs = isPerson ? Array.from(this.actor.system.needs ?? []).map((need) => ({
			key: String(need.key),
			label: NEED_LABELS[String(need.key)] ?? String(need.key),
			current: need.current,
			maximum: need.maximum,
			unit: String(need.unit ?? ""),
			state: String(need.state ?? "normal")
		})) : [];
		const stress = isPerson ? this.actor.system.derived?.trackables?.stress : null;
		const primaryMovement = this.actor.system.derived?.primaryMovement ?? null;
		const referenceGroups = isPerson ? [
			{
				label: "Relations",
				entries: Array.from(this.actor.system.relationshipRefs ?? []).map(referencePresentation)
			},
			{
				label: "Organisations",
				entries: Array.from(this.actor.system.organizationRefs ?? []).map(referencePresentation)
			},
			{
				label: "Comptes",
				entries: Array.from(this.actor.system.accountRefs ?? []).map(referencePresentation)
			},
			{
				label: "Journaux personnels",
				entries: Array.from(this.actor.system.personalJournalRefs ?? []).map(referencePresentation)
			}
		] : [];
		const actorItems = Array.from(this.actor.items ?? []);
		const physicalItems = actorItems.filter((item) => isPhysicalItemType(item.type));
		const physicalSnapshots = physicalItems.map(itemSnapshot);
		const inventory = presentInventory(physicalSnapshots);
		if (activeBody) for (const item of physicalSnapshots) {
			const p = item.system.physical ?? {};
			if (![
				"readied",
				"equipped",
				"installed"
			].includes(p.equipState) || equipmentBodyId(physicalSnapshots, item) && equipmentBodyId(physicalSnapshots, item) !== activeBody.id) continue;
			const host = physicalSnapshots.find((entry) => p.hostRef?.uuid && entry.uuid === p.hostRef.uuid || p.hostRef?.relisId && entry.system.meta?.relisId === p.hostRef.relisId);
			const plan = equipmentPlan(physicalSnapshots, activeBody, {
				itemId: item.id,
				state: equipmentState(item),
				hostId: host?.id ?? ""
			});
			for (const message of plan.errors) inventory.diagnostics.push({
				itemId: item.id,
				level: "warning",
				message: `${item.name} : ${message}`
			});
		}
		const inventoryRows = inventory.rows.map((row) => {
			const item = physicalItems.find((candidate) => candidate.id === row.item.id);
			const physical = row.item.system.physical ?? {};
			const pendingState = String(row.item.flags?.relis?.inventoryTransfer?.state ?? "complete");
			const mergeCandidates = physicalSnapshots.filter((candidate) => String(candidate.flags?.relis?.inventoryTransfer?.state ?? "complete") === "complete" && canMergeStacks(row.item, candidate));
			const capacity = row.item.system.capacity ?? {};
			const quantity = Number(physical.quantity ?? 0);
			const counted = String(physical.unit ?? "count") === "count";
			const transferableIds = /* @__PURE__ */ new Set([row.item.id, ...descendantIds(physicalSnapshots, row.item.id)]);
			const canTransfer = inventory.rows.filter((candidate) => transferableIds.has(candidate.item.id)).every((candidate) => {
				const state = candidate.item.system.physical ?? {};
				const amount = Number(state.quantity ?? 0);
				return !candidate.orphaned && !candidate.cyclic && Number.isFinite(amount) && amount > 0 && (state.unit !== "count" || Number.isInteger(amount)) && (candidate.item.type !== "container" || amount === 1) && state.accessibility !== "unavailable" && (candidate.item.flags?.relis?.inventoryTransfer?.state ?? "complete") === "complete";
			});
			const massEach = unitMass(row.item);
			const linked = equipmentLinked(physicalSnapshots, row.item.id);
			const rowClasses = [
				"relis-inventory-row",
				row.item.type === "container" ? "relis-inventory-row--container" : "",
				row.orphaned || row.cyclic ? "relis-inventory-row--error" : ""
			].filter(Boolean).join(" ");
			return {
				id: row.item.id,
				name: row.item.name,
				equipmentLabel: EQUIPMENT_LABELS[equipmentState(row.item)] ?? "État ancien à vérifier",
				equipmentBody: physical.bodyId ? bodies.find((body) => body.id === physical.bodyId)?.name ?? "Corps absent" : "",
				equipmentHost: physical.hostRef?.labelSnapshot ?? "",
				equipmentSlots: slotSummary(physical.equipmentProfile ?? {}),
				technicalNeeds: technicalSummary(physical.equipmentProfile ?? {}, "requiredSlots"),
				technicalCapacity: Object.entries(physical.equipmentProfile?.providedSlots ?? {}).filter(([, n]) => Number(n) > 0).map(([key, n]) => `${TECHNICAL_SLOTS[key] ?? key} : ${technicalUsage(physicalSnapshots, row.item)[key] ?? 0} / ${n}`).join(" ; "),
				equipmentTime: physical.equipmentProfile?.duration || "À arbitrer",
				type: row.item.type,
				typeLabel: game.i18n.localize(`TYPES.Item.${row.item.type}`),
				rowClasses,
				img: item?.img ?? "icons/svg/item-bag.svg",
				depth: row.depth,
				level: row.depth + 1,
				indent: row.depth * 18,
				quantity,
				quantityUnit: QUANTITY_UNIT_LABELS[String(physical.unit ?? "count")] ?? String(physical.unit ?? ""),
				lot: String(row.item.system.provenance?.lotId ?? physical.batchId ?? "").trim(),
				condition: INVENTORY_CONDITION_LABELS[String(physical.condition ?? "intact")] ?? String(physical.condition ?? ""),
				warning: physical.condition !== "intact" || physical.accessibility === "unavailable" || Number(physical.wear ?? 0) > 0 || row.orphaned || row.cyclic,
				wear: physical.wear ?? 0,
				provenanceSource: row.item.system.provenance?.acquiredFromRef?.labelSnapshot || "Non renseignée",
				massEach: displayMeasure(massEach, "kg"),
				volumeEach: displayMeasure(physical.volumeEach ?? null, "L"),
				bulkEach: displayMeasure(physical.bulkEach ?? null, ""),
				accessibility: INVENTORY_ACCESS_LABELS[String(physical.accessibility ?? "stored")] ?? String(physical.accessibility ?? ""),
				location: row.parentId ? physicalItems.find((candidate) => candidate.id === row.parentId)?.name ?? "Conteneur manquant" : physical.equipState === "ground" ? "Au sol" : physical.hostRef?.labelSnapshot ? `Sur ${physical.hostRef.labelSnapshot}` : equipmentState(row.item) === "equipped" ? slotSummary(physical.equipmentProfile ?? {}) : "Inventaire principal",
				isContainer: row.item.type === "container",
				childCount: row.childCount,
				pending: pendingState === "pending",
				quarantined: pendingState === "quarantined",
				hasError: row.orphaned || row.cyclic,
				canSplit: !linked && Number.isFinite(quantity) && validateStackSplit(row.item, counted ? 1 : quantity / 2).length === 0,
				canMerge: !linked && mergeCandidates.length > 0,
				canMove: !linked && (inventoryContainerTargets(physicalSnapshots, row.item.id).some((target) => target.id !== row.parentId && validateInventoryMove(physicalSnapshots, row.item.id, target.id).valid) || Boolean(row.parentId) && validateInventoryMove(physicalSnapshots, row.item.id, null).valid),
				canTransfer: canTransfer && !linked,
				ownMass: displayMeasure(massEach !== null && Number.isFinite(massEach) ? massEach * quantity : null, "kg"),
				subtreeMass: displayMeasure(row.subtreeLoad.mass, "kg"),
				capacityMass: capacity.mass === null || capacity.mass === void 0 ? "Sans limite définie" : `${row.containerUsage?.mass ?? "?"} / ${capacity.mass} kg`,
				capacityVolume: capacity.volume === null || capacity.volume === void 0 ? "Sans limite définie" : `${row.containerUsage?.volume ?? "?"} / ${capacity.volume} L`,
				capacityBulk: capacity.bulk === null || capacity.bulk === void 0 ? "Sans limite définie" : `${row.containerUsage?.bulk ?? "?"} / ${capacity.bulk}`,
				capacityUnits: capacity.units === null || capacity.units === void 0 ? "Sans limite définie" : `${row.containerUsage?.units ?? 0} / ${capacity.units}`
			};
		});
		const itemRows = actorItems.map((item) => ({
			id: item.id,
			name: item.name,
			type: item.type,
			typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
			canRoll: item.type === "action"
		}));
		const relatedItems = itemRows.filter((item) => !isPhysicalItemType(item.type));
		return {
			...context,
			actor: this.actor,
			system: this.actor.system,
			editable: this.actor.isOwner,
			packageVersion: PACKAGE_VERSION,
			inventoryTab: isCharacter ? "inventory" : "capabilities",
			isCharacter,
			isNpc,
			isPerson,
			npcDetailLevel,
			npcCondensed: npcDetailLevel === "condensed",
			npcStandard: npcDetailLevel === "standard",
			npcComplete: npcDetailLevel === "complete",
			npcDetailOptions: NPC_DETAIL_OPTIONS,
			stabilityOptions: STABILITY_OPTIONS,
			actorTypeLabel: game.i18n.localize(`TYPES.Actor.${this.actor.type}`),
			displayName: publicName || this.actor.name,
			tabs,
			attributes,
			skills,
			featuredSkills,
			energyPools,
			bodies,
			activeBody,
			activeBodyNatureLabel: BODY_NATURE_LABELS[String(activeBody?.nature)] ?? String(activeBody?.nature ?? "Non défini"),
			needs,
			stress,
			primaryMovement,
			referenceGroups,
			hasReferences: referenceGroups.some((group) => group.entries.length > 0),
			progression: isCharacter ? this.actor.system.progression : null,
			hasDemoEnergy: energyPools.some((pool) => pool.isDemo),
			items: itemRows,
			relatedItems,
			inventoryRows,
			inventoryGroups: groupInventory(inventoryRows),
			carrying: carriedMass(physicalSnapshots, activeBody ?? { id: "" }),
			canConfigureBody: Boolean(game.user?.isGM),
			equipmentRecovery: Boolean(this.actor.flags?.relis?.equipmentRecovery),
			equipmentOutfits: Array.from(this.actor.system.outfits ?? []).filter((outfit) => outfit.equipmentEntries?.length || String(outfit.id).startsWith("equipment-")),
			hasInventory: inventoryRows.length > 0,
			inventoryDiagnostics: inventory.diagnostics,
			hasInventoryDiagnostics: inventory.diagnostics.length > 0,
			inventoryTotals: {
				itemCount: physicalItems.length,
				mass: displayMeasure(inventory.totalLoad.mass, "kg"),
				volume: displayMeasure(inventory.totalLoad.volume, "L"),
				bulk: displayMeasure(inventory.totalLoad.bulk, "ENC")
			},
			effects,
			effectCount: effects.length,
			itemCount: actorItems.length
		};
	}
	async _onRender(context, options) {
		await super._onRender(context, options);
		const root = this.element;
		this.activateTab(root, this.activeTab);
		root.querySelector("[data-edit-actor-portrait]")?.addEventListener("click", () => {
			openActorPortraitPicker(this.actor);
		});
		for (const button of root.querySelectorAll("[data-equipment-command]")) button.addEventListener("click", () => {
			this.inventoryTask(async () => {
				if (!this.actor.isOwner && !game.user?.isGM) return;
				switch (button.dataset.equipmentCommand) {
					case "state": return this.changeEquipment(button.dataset.itemId ?? "");
					case "body":
						await this.configureCarrying();
						break;
					case "save":
						await this.saveOutfit();
						break;
					case "apply": return this.applyOutfit(button.dataset.outfitId ?? "");
					case "recover": await recoverEquipment(this.actor);
				}
			}, "Commande d’équipement terminée.");
		});
		bindInventoryView(root, `${game.world?.id}.${game.user?.id}.${this.actor.uuid}`, this.inventoryQuery);
		if (!this.actor.isOwner) for (const control of root.querySelectorAll("[data-document-field], [data-owner-control]")) control.disabled = true;
		for (const button of root.querySelectorAll("[data-action='switch-tab']")) {
			button.addEventListener("click", () => {
				this.activateTab(root, button.dataset.tabId, true);
			});
			button.addEventListener("keydown", (event) => {
				this.onTabKeydown(root, event);
			});
		}
		for (const element of root.querySelectorAll("[data-document-field]")) element.addEventListener("change", () => {
			if (!this.actor.isOwner) return;
			const path = element.dataset.documentField;
			if (!path) return;
			this.actor.update({ [path]: fieldValue$1(element) });
		});
		for (const element of root.querySelectorAll("[data-energy-index]")) element.addEventListener("change", () => {
			if (!this.actor.isOwner) return;
			const index = Number(element.dataset.energyIndex);
			if (!Number.isInteger(index)) return;
			const pools = updateResourcePoolCurrent(this.actor.system.energyPools ?? [], index, Number(element.value));
			this.actor.update({ "system.energyPools": pools });
		});
		for (const button of root.querySelectorAll("[data-action='roll-skill']")) button.addEventListener("click", () => {
			if (!this.actor.isOwner) return;
			const skillKey = button.dataset.skillKey ?? "shooting";
			const definition = SKILL_DEFINITIONS[skillKey];
			const difficultyInput = root.querySelector("[data-test-difficulty]");
			this.actor.rollRelisCheck({
				attributeKey: definition?.[1] ?? "dexterity",
				skillKey,
				difficulty: Number(difficultyInput?.value ?? 15),
				label: definition?.[0] ?? skillKey
			});
		});
		for (const button of root.querySelectorAll("[data-action='open-item']")) button.addEventListener("click", () => {
			this.actor.items.get(button.dataset.itemId ?? "")?.sheet.render(true);
		});
		for (const button of root.querySelectorAll("[data-action='roll-action']")) button.addEventListener("click", () => {
			if (!this.actor.isOwner) return;
			const item = this.actor.items.get(button.dataset.itemId ?? "");
			if (item) this.actor.rollAction(item);
		});
		root.querySelector("[data-action='create-inventory-item']")?.addEventListener("click", () => {
			this.createPhysicalItem();
		});
		for (const button of root.querySelectorAll("[data-action='split-inventory-stack']")) button.addEventListener("click", () => {
			this.splitPhysicalStack(button.dataset.itemId ?? "");
		});
		for (const button of root.querySelectorAll("[data-action='merge-inventory-stack']")) button.addEventListener("click", () => {
			this.mergePhysicalStack(button.dataset.itemId ?? "");
		});
		for (const button of root.querySelectorAll("[data-action='move-inventory-item']")) button.addEventListener("click", () => {
			this.movePhysicalItem(button.dataset.itemId ?? "");
		});
		for (const button of root.querySelectorAll("[data-action='transfer-inventory-item']")) button.addEventListener("click", () => {
			this.transferPhysicalItem(button.dataset.itemId ?? "");
		});
		root.querySelector("[data-action='create-demo']")?.addEventListener("click", () => {
			this.createDemo();
		});
	}
	async inventoryTask(task, success) {
		try {
			if (await task() === false) return;
			ui.notifications.info(success);
			await this.render({ force: true });
		} catch (error) {
			console.error("RE:LIS | Opération d’inventaire refusée", error);
			ui.notifications.error(error instanceof Error ? error.message : "Opération d’inventaire refusée.");
		}
	}
	async createPhysicalItem() {
		if (!this.actor.isOwner) return;
		const content = dialogContent();
		dialogText(content, "Nom", "name", "Nouvel objet");
		dialogSelect(content, "Type matériel", "type", PHYSICAL_ITEM_TYPES.map((value) => ({
			value,
			label: game.i18n.localize(`TYPES.Item.${value}`)
		})));
		const result = await askInventoryForm("Créer un Item d’inventaire", content, "Créer");
		if (!result) return;
		await this.inventoryTask(async () => {
			await createInventoryItem(this.actor, String(result.name ?? ""), String(result.type ?? "equipment"));
		}, "Item ajouté à l’inventaire.");
	}
	async splitPhysicalStack(itemId) {
		if (!this.actor.isOwner) return;
		const item = this.actor.items.get(itemId);
		if (!item) return;
		const quantity = Number(item.system.physical?.quantity ?? 0);
		const counted = String(item.system.physical?.unit ?? "count") === "count";
		const content = dialogContent();
		dialogNumber(content, `Quantité à détacher de « ${item.name} »`, "quantity", counted ? 1 : Math.min(quantity / 2, 1), counted ? quantity - 1 : quantity - Number.EPSILON, counted);
		const result = await askInventoryForm("Scinder la pile", content, "Scinder");
		if (!result) return;
		await this.inventoryTask(async () => {
			await splitInventoryStack(this.actor, itemId, Number(result.quantity));
		}, "Pile scindée sans modifier la quantité totale.");
	}
	async mergePhysicalStack(itemId) {
		if (!this.actor.isOwner) return;
		const item = this.actor.items.get(itemId);
		if (!item) return;
		const snapshot = itemSnapshot(item);
		const candidates = Array.from(this.actor.items ?? []).filter((candidate) => canMergeStacks(snapshot, itemSnapshot(candidate)));
		if (!candidates.length) {
			ui.notifications.warn("Aucune pile strictement compatible à fusionner.");
			return;
		}
		const content = dialogContent();
		dialogSelect(content, "Pile absorbée", "sourceId", candidates.map((candidate) => ({
			value: candidate.id,
			label: `${candidate.name} — ${candidate.system.physical.quantity} ${QUANTITY_UNIT_LABELS[String(candidate.system.physical.unit)] ?? candidate.system.physical.unit}`
		})));
		const result = await askInventoryForm(`Fusionner dans « ${item.name} »`, content, "Fusionner");
		if (!result) return;
		await this.inventoryTask(async () => {
			await mergeInventoryStacks(this.actor, itemId, String(result.sourceId ?? ""));
		}, "Piles fusionnées ; le total est conservé.");
	}
	async confirmEquipment(requests, assisted = false) {
		const preview = previewEquipment(this.actor, requests, assisted);
		if (!preview.updates.length) throw new Error(equipmentFailureMessage(preview));
		const content = dialogContent();
		dialogNote(content, `Corps : ${preview.body.name}. Masse finale connue : ${preview.mass.mass} kg ; ${preview.mass.missing} masse(s) manquante(s).`);
		for (const row of preview.rows) dialogNote(content, `${row.name} → ${EQUIPMENT_LABELS[row.request.state] ?? row.request.state}. Temps déclaré : ${row.duration}. ${row.errors.join(" ")} ${row.warnings.join(" ")}`);
		dialogNote(content, "Appliquer confirme que le temps, l’aide et les conditions de la scène ont été respectés. Aucun temps de combat n’est débité automatiquement.");
		if (!await askInventoryForm(assisted ? "Aperçu assisté — seuls les changements valides seront appliqués" : "Aperçu strict de l’équipement", content, "Appliquer")) return false;
		await applyEquipment(this.actor, requests, preview.fingerprint, assisted);
		return true;
	}
	async changeEquipment(itemId) {
		const item = this.actor.items.get(itemId);
		if (!item) return false;
		const snapshot = itemSnapshot(item);
		const content = dialogContent();
		const states = equipmentStates(snapshot);
		dialogSelect(content, "État souhaité", "state", states.map((state) => ({
			value: state,
			label: EQUIPMENT_LABELS[state]
		})));
		const current = equipmentState(snapshot);
		const select = content.querySelector("[name=\"state\"]");
		if (states.includes(current)) select.value = current;
		if (states.includes("installed")) dialogSelect(content, "Hôte (utilisé seulement pour Installer)", "hostId", [{
			value: "",
			label: "Choisir un hôte"
		}, ...Array.from(this.actor.items ?? []).filter((candidate) => candidate.id !== itemId && isPhysicalItemType(candidate.type)).map((candidate) => ({
			value: candidate.id,
			label: candidate.name
		}))]);
		dialogNote(content, "Rangé ne choisit pas de conteneur : utilisez Déplacer pour cela. Au sol retire la masse de la charge portée, sans supprimer l’objet.");
		const result = await askInventoryForm(item.name, content, "Voir l’aperçu");
		if (!result) return false;
		return this.confirmEquipment([{
			itemId,
			state: String(result.state),
			hostId: String(result.hostId ?? "")
		}]);
	}
	async configureCarrying() {
		if (!game.user?.isGM) return;
		const bodies = JSON.parse(JSON.stringify(Array.from(this.actor.system.bodies ?? [])));
		const body = bodies.find((entry) => entry.id === this.actor.system.activeBodyId);
		if (!body) throw new Error("Corps actif absent.");
		const before = JSON.stringify(bodies);
		const profile = body.carrying ?? {};
		const content = dialogContent();
		dialogNote(content, "Renseigner les valeurs de la règle applicable ou une décision MJ. Laisser vide lorsqu’elles sont inconnues ; aucune formule automatique n’est supposée.");
		dialogOptional(content, "Nombre de mains utilisables", "hands", profile.hands, true);
		content.querySelector("[name=\"hands\"]").step = "1";
		dialogOptional(content, "Chargé à partir de (kg)", "loaded", profile.loaded, true);
		dialogOptional(content, "Surchargé à partir de (kg)", "overloaded", profile.overloaded, true);
		dialogText(content, "Source de la règle ou décision MJ", "source", profile.source || "Décision MJ");
		const result = await askInventoryForm(`Portage — ${body.name}`, content, "Enregistrer");
		if (!result) return;
		const nullable = (value) => value === "" || value == null ? null : Number(value);
		const hands = nullable(result.hands), loaded = nullable(result.loaded), overloaded = nullable(result.overloaded);
		if (hands !== null && (!Number.isInteger(hands) || hands < 0)) throw new Error("Le nombre de mains doit être un entier positif ou nul.");
		if (loaded === null !== (overloaded === null) || loaded !== null && (!Number.isFinite(loaded) || loaded <= 0 || !Number.isFinite(overloaded) || overloaded <= loaded)) throw new Error("Renseigner les deux seuils positifs, avec Surchargé supérieur à Chargé.");
		if (JSON.stringify(Array.from(this.actor.system.bodies ?? [])) !== before) throw new Error("Le corps a changé : rouvrir la configuration.");
		body.carrying = {
			...profile,
			hands,
			loaded,
			overloaded,
			source: String(result.source).trim()
		};
		await this.actor.update({ "system.bodies": bodies });
	}
	async saveOutfit() {
		const content = dialogContent();
		dialogSelect(content, "Emplacement à enregistrer ou remplacer", "slot", Array.from({ length: 5 }, (_, index) => ({
			value: String(index),
			label: `Ensemble ${index + 1}`
		})));
		dialogText(content, "Nom de l’ensemble", "name");
		dialogNote(content, "Mémorise les références et états actuels du corps actif. Aucun objet n’est copié. Un emplacement déjà utilisé sera remplacé.");
		const result = await askInventoryForm("Mémoriser l’équipement actuel", content, "Enregistrer");
		if (result) await saveEquipmentOutfit(this.actor, Number(result.slot), String(result.name));
	}
	async applyOutfit(outfitId) {
		const outfit = Array.from(this.actor.system.outfits ?? []).find((entry) => entry.id === outfitId);
		if (!outfit) return false;
		if (!outfit.bodyIds?.includes(this.actor.system.activeBodyId)) throw new Error("Cet ensemble appartient à un autre corps.");
		const content = dialogContent();
		dialogSelect(content, "Application", "mode", [{
			value: "strict",
			label: "Stricte — refuser si une pièce est impossible"
		}, {
			value: "assisted",
			label: "Assistée — appliquer les changements possibles"
		}]);
		dialogNote(content, "Les objets actuellement actifs mais absents de cet ensemble seront rangés sur le même corps. L’aperçu détaille tous les changements.");
		const result = await askInventoryForm(outfit.name, content, "Voir l’aperçu");
		if (!result) return false;
		const entries = Array.from(outfit.equipmentEntries ?? []);
		const releases = Array.from(this.actor.items ?? []).filter((item) => isPhysicalItemType(item.type)).map(itemSnapshot).filter((item) => item.system.physical?.bodyId === this.actor.system.activeBodyId && [
			"held-one",
			"held-two",
			"equipped"
		].includes(equipmentState(item)) && !entries.some((entry) => entry.itemId === item.id)).map((item) => ({
			itemId: item.id,
			state: "stored"
		}));
		return this.confirmEquipment([...releases, ...entries], result.mode === "assisted");
	}
	async movePhysicalItem(itemId) {
		if (!this.actor.isOwner) return;
		const item = this.actor.items.get(itemId);
		if (!item) return;
		const targets = inventoryContainerTargets(Array.from(this.actor.items ?? []).filter((candidate) => isPhysicalItemType(candidate.type)).map(itemSnapshot), itemId);
		const content = dialogContent();
		dialogSelect(content, "Destination", "containerId", [{
			value: "",
			label: "Inventaire principal"
		}, ...targets.map((target) => ({
			value: target.id,
			label: target.name
		}))]);
		const result = await askInventoryForm(`Déplacer « ${item.name} »`, content, "Déplacer");
		if (!result) return;
		await this.inventoryTask(async () => {
			await moveInventoryItem(this.actor, itemId, String(result.containerId ?? "") || null);
		}, "Emplacement mis à jour après contrôle des capacités.");
	}
	async transferPhysicalItem(itemId) {
		if (!this.actor.isOwner) return;
		const item = this.actor.items.get(itemId);
		if (!item) return;
		const actors = Array.from(game.actors?.contents ?? game.actors ?? []).filter((actor) => actor.uuid !== this.actor.uuid && ["character", "npc"].includes(actor.type) && (game.user?.isGM || actor.isOwner));
		if (!actors.length) {
			ui.notifications.warn("Aucun autre Personnage ou PNJ modifiable ne peut recevoir cet Item.");
			return;
		}
		const content = dialogContent();
		dialogSelect(content, "Actor destinataire", "actorUuid", actors.map((actor) => ({
			value: actor.uuid,
			label: actor.name
		})));
		const maximum = Number(item.system.physical?.quantity ?? 0);
		if (item.type !== "container") dialogNumber(content, "Quantité transférée", "quantity", maximum, maximum, String(item.system.physical?.unit ?? "count") === "count");
		const result = await askInventoryForm(`Transférer « ${item.name} »`, content, "Transférer");
		if (!result) return;
		const destination = actors.find((actor) => actor.uuid === String(result.actorUuid ?? ""));
		if (!destination) return;
		await this.inventoryTask(async () => {
			await transferInventoryItem(this.actor, destination, itemId, item.type === "container" ? maximum : Number(result.quantity));
		}, `Transfert vers ${destination.name} terminé sans duplication jouable.`);
	}
	activateTab(root, requested, focus = false) {
		const detailLevel = this.actor.type === "npc" ? String(this.actor.system.detailLevel ?? "standard") : "complete";
		const active = normalizeActorTab(this.actor.type, requested, detailLevel);
		this.activeTab = active;
		for (const button of root.querySelectorAll("[data-action='switch-tab']")) {
			const selected = button.dataset.tabId === active;
			button.setAttribute("aria-selected", String(selected));
			button.tabIndex = selected ? 0 : -1;
			if (selected && focus) button.focus();
		}
		for (const panel of root.querySelectorAll("[data-tab-panel]")) panel.hidden = panel.dataset.tabPanel !== active;
	}
	onTabKeydown(root, event) {
		if (![
			"ArrowLeft",
			"ArrowRight",
			"Home",
			"End"
		].includes(event.key)) return;
		const buttons = Array.from(root.querySelectorAll("[data-action='switch-tab']"));
		const current = buttons.findIndex((button) => button.dataset.tabId === this.activeTab);
		if (current < 0 || buttons.length === 0) return;
		event.preventDefault();
		const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
		this.activateTab(root, buttons[next]?.dataset.tabId, true);
	}
	async createDemo() {
		if (!this.actor.isOwner) return;
		const pools = Array.from(this.actor.system.energyPools ?? [], plainResourcePool);
		if (!pools.some((pool) => pool.key === "ce")) {
			pools.push({
				key: "ce",
				current: 3,
				maximum: 3,
				reserved: 0,
				debt: 0,
				unit: "test"
			});
			await this.actor.update({ "system.energyPools": pools });
		}
		const toCreate = [];
		if (!this.actor.items.some((item) => item.type === "equipment" && item.name === "Module d’essai — 10-C")) toCreate.push({
			name: "Module d’essai — 10-C",
			type: "equipment",
			system: { physical: {
				quantity: 1,
				massEach: 1,
				bulkEach: 1,
				equipState: "stored",
				condition: "intact"
			} }
		});
		if (!this.actor.items.some((item) => item.type === "action" && item.name === "Tir calibré — Démonstration 10-C")) toCreate.push({
			name: "Tir calibré — Démonstration 10-C",
			type: "action",
			system: {
				test: {
					attributeKey: "dexterity",
					skillKey: "shooting",
					difficulty: 15,
					resourceKey: "ce",
					cost: 1
				},
				effect: {
					conditionKey: "calibrated",
					intensity: 1,
					durationRounds: 1
				}
			}
		});
		if (toCreate.length > 0) await this.actor.createEmbeddedDocuments("Item", toCreate);
		ui.notifications.info("Démonstration 10-C préparée : Action, Équipement et 3 CE de test.");
	}
};
//#endregion
//#region src/ui/equipment-profile.ts
var GROUPS = {
	sizes: {
		title: "Tailles compatibles",
		labels: {
			tiny: "Très petit",
			small: "Petit",
			medium: "Moyen",
			large: "Grand",
			huge: "Très grand",
			gargantuan: "Gigantesque"
		}
	},
	natures: {
		title: "Natures corporelles compatibles",
		labels: {
			biological: "Biologique",
			synthetic: "Synthétique",
			hybrid: "Hybride",
			energetic: "Énergétique",
			atypical: "Atypique"
		}
	},
	hostTypes: {
		title: "Types d’hôte autorisés pour l’installation",
		labels: Object.fromEntries(PHYSICAL_ITEM_TYPES.map((type) => [type, type]))
	},
	bodySlots: {
		title: "Emplacements corporels occupés simultanément",
		labels: BODY_SLOTS
	}
};
function equipmentProfileGroups(profile, localize = (value) => value) {
	return Object.entries(GROUPS).map(([key, { title, labels }]) => {
		const selected = Array.isArray(profile[key]) ? profile[key] : [];
		return {
			key,
			title,
			count: selected.length,
			emptyLabel: key === "bodySlots" ? "Aucun emplacement corporel déclaré." : "Aucune restriction déclarée.",
			choices: [.../* @__PURE__ */ new Set([...Object.keys(labels), ...selected])].map((value) => ({
				value,
				groupKey: key,
				checked: selected.includes(value),
				label: key === "hostTypes" && value in labels ? localize(`TYPES.Item.${value}`) : labels[value] ?? value
			}))
		};
	});
}
/** Read live checkbox state, never serialized attributes or truthy form strings. */
function equipmentProfileUpdate(root) {
	const legacyConfirmation = root.querySelectorAll("[data-legacy-slots-confirm]")[0];
	if (legacyConfirmation && !legacyConfirmation.checked) throw new Error("Confirmez le remplacement de l’ancien emplacement après avoir vérifié les choix corporels et techniques.");
	const patch = { "system.physical.equipmentProfile.slotsConfigured": true };
	for (const key of Object.keys(GROUPS)) patch[`system.physical.equipmentProfile.${key}`] = Array.from(root.querySelectorAll(`[data-profile-list="${key}"]`)).filter((input) => input.checked).map((input) => input.value);
	for (const control of root.querySelectorAll("[data-profile-field]")) {
		const key = control.dataset.profileField;
		if (![
			"family",
			"duration",
			"installable",
			"ordinaryLiquid"
		].includes(key ?? "")) continue;
		patch[`system.physical.equipmentProfile.${key}`] = control.type === "checkbox" ? control.checked : control.value.trim();
	}
	for (const field of ["requiredSlots", "providedSlots"]) {
		const controls = root.querySelectorAll(`[data-profile-technical="${field}"]`);
		for (const control of controls) {
			const key = control.dataset.slotKey ?? "";
			const value = control.value.trim() === "" ? 0 : Number(control.value);
			if (!Object.hasOwn(TECHNICAL_SLOTS, key) || !Number.isSafeInteger(value) || value < 0) throw new Error("Les capacités et besoins doivent être des entiers positifs ou nuls.");
			patch[`system.physical.equipmentProfile.${field}.${key}`] = value;
		}
	}
	const errors = slotProfileErrors({ bodySlots: patch["system.physical.equipmentProfile.bodySlots"] });
	if (errors.length) throw new Error(errors.join(" "));
	return patch;
}
function bindEquipmentProfile(root, item, reportError) {
	const section = root.querySelector("[data-equipment-profile]");
	const button = section?.querySelector("[data-save-equipment-profile]");
	if (!section || !button || !item.isOwner) return;
	const status = section.querySelector("[data-profile-status]");
	section.addEventListener("change", () => {
		if (status) status.textContent = "Modifications non enregistrées.";
	});
	button.addEventListener("click", async () => {
		if (!item.isOwner || button.disabled) return;
		button.disabled = true;
		try {
			await saveEquipmentProfile(item, equipmentProfileUpdate(section));
			if (status) status.textContent = "Propriétés enregistrées.";
		} catch (error) {
			reportError(error instanceof Error ? error.message : "Les propriétés n’ont pas pu être enregistrées.");
		} finally {
			button.disabled = !item.isOwner;
		}
	});
}
function technicalSlotRows(profile) {
	return Object.entries(TECHNICAL_SLOTS).map(([key, label]) => ({
		key,
		label,
		required: profile.requiredSlots?.[key] ?? 0,
		provided: profile.providedSlots?.[key] ?? 0
	}));
}
//#endregion
//#region src/sheets/item-sheet.ts
var ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
var HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
var EDITABLE_SURFACE_SELECTOR = "[contenteditable=\"true\"], .ProseMirror[contenteditable]";
var EDITOR_TOOLBAR_SELECTOR = [
	"menu",
	"[role=\"toolbar\"]",
	".editor-menu",
	".prosemirror-menu",
	".ProseMirror-menubar"
].join(", ");
function isElement(value) {
	return Boolean(value && typeof value === "object" && value.nodeType === 1 && value.style?.setProperty);
}
function isEditableSurface(value) {
	if (!isElement(value)) return false;
	return value.isContentEditable || value.getAttribute("contenteditable") === "true";
}
/**
* Find Foundry's live ProseMirror surface even if a future implementation
* places it in a shadow root or an iframe.
*/
function findEditableSurface(root) {
	if (isEditableSurface(root)) return root;
	const direct = root.querySelector(EDITABLE_SURFACE_SELECTOR);
	if (direct) return direct;
	for (const element of root.querySelectorAll("*")) {
		if (element.shadowRoot) {
			const shadowMatch = findEditableSurface(element.shadowRoot);
			if (shadowMatch) return shadowMatch;
		}
		if (element.tagName === "IFRAME") {
			const frameDocument = element.contentDocument;
			if (frameDocument) {
				const frameMatch = findEditableSurface(frameDocument);
				if (frameMatch) return frameMatch;
			}
		}
	}
	return null;
}
function nearestSharedContainer(first, second) {
	let candidate = first.parentElement;
	while (candidate) {
		if (candidate.contains(second)) return candidate;
		candidate = candidate.parentElement;
	}
	return null;
}
function findEditorToolbar(editor, surface) {
	const surfaceRoot = surface.getRootNode();
	const roots = editor.contains(surface) ? [editor] : [surfaceRoot];
	for (const root of roots) for (const toolbar of root.querySelectorAll(EDITOR_TOOLBAR_SELECTOR)) {
		if (toolbar.contains(surface)) continue;
		if (toolbar.querySelectorAll("button, select, a, [role=\"button\"]").length < 3) continue;
		const layout = nearestSharedContainer(toolbar, surface);
		if (layout) return {
			toolbar,
			layout
		};
	}
	return null;
}
function directChildContaining(container, descendant) {
	let child = descendant;
	while (child.parentElement && child.parentElement !== container) child = child.parentElement;
	return child;
}
function arrangeEditorLayout(editor, surface) {
	const editorParts = findEditorToolbar(editor, surface);
	if (!editorParts) return;
	const { toolbar, layout } = editorParts;
	const content = directChildContaining(layout, surface);
	if (layout.dataset.relisEditorLayout === "stacked" && toolbar.dataset.relisEditorToolbar === "true" && content.dataset.relisEditorContent === "true") return;
	layout.dataset.relisEditorLayout = "stacked";
	layout.style.setProperty("display", "flex", "important");
	layout.style.setProperty("flex-direction", "column", "important");
	layout.style.setProperty("align-items", "stretch", "important");
	layout.style.setProperty("gap", "0.45rem", "important");
	layout.style.setProperty("position", "relative", "important");
	layout.style.setProperty("isolation", "isolate", "important");
	layout.style.setProperty("overflow", "visible", "important");
	toolbar.dataset.relisEditorToolbar = "true";
	toolbar.style.setProperty("position", "relative", "important");
	toolbar.style.setProperty("inset", "auto", "important");
	toolbar.style.setProperty("z-index", "20", "important");
	toolbar.style.setProperty("display", "flex", "important");
	toolbar.style.setProperty("flex-wrap", "wrap", "important");
	toolbar.style.setProperty("align-items", "center", "important");
	toolbar.style.setProperty("gap", "0.3rem", "important");
	toolbar.style.setProperty("width", "100%", "important");
	toolbar.style.setProperty("height", "auto", "important");
	toolbar.style.setProperty("min-height", "2.55rem", "important");
	toolbar.style.setProperty("max-height", "none", "important");
	toolbar.style.setProperty("margin", "0", "important");
	toolbar.style.setProperty("padding", "0.35rem", "important");
	toolbar.style.setProperty("box-sizing", "border-box", "important");
	toolbar.style.setProperty("overflow", "visible", "important");
	toolbar.style.setProperty("pointer-events", "auto", "important");
	toolbar.style.setProperty("list-style", "none", "important");
	toolbar.style.setProperty("background", "#123444", "important");
	toolbar.style.setProperty("border", "1px solid #367487", "important");
	toolbar.style.setProperty("border-radius", "4px", "important");
	toolbar.style.setProperty("box-shadow", "none", "important");
	content.dataset.relisEditorContent = "true";
	content.style.setProperty("position", "relative", "important");
	content.style.setProperty("inset", "auto", "important");
	content.style.setProperty("z-index", "1", "important");
	content.style.setProperty("flex", "1 1 auto", "important");
	content.style.setProperty("width", "100%", "important");
	content.style.setProperty("min-height", "12rem", "important");
	content.style.setProperty("box-sizing", "border-box", "important");
	surface.style.setProperty("inset", "auto", "important");
	surface.style.setProperty("width", "100%", "important");
	surface.style.setProperty("min-height", "12rem", "important");
	surface.style.setProperty("margin", "0", "important");
	surface.style.setProperty("padding", "0.55rem 0.65rem", "important");
	surface.style.setProperty("box-sizing", "border-box", "important");
	surface.style.setProperty("pointer-events", "auto", "important");
}
/**
* Foundry's editor surface is created only after the editor opens. Applying
* the contrast directly to that live node avoids relying on private wrapper
* classes or on CSS crossing a shadow-root boundary.
*/
function revealEditableSurface(editor, surface) {
	surface.dataset.relisEditorSurface = "visible";
	surface.classList.add("relis-live-editor-surface");
	arrangeEditorLayout(editor, surface);
	surface.style.setProperty("color", "#e8f7ff", "important");
	surface.style.setProperty("-webkit-text-fill-color", "#e8f7ff", "important");
	surface.style.setProperty("caret-color", "#87f2ff", "important");
	surface.style.setProperty("font-size", "0.9rem", "important");
	surface.style.setProperty("line-height", "1.5", "important");
	surface.style.setProperty("opacity", "1", "important");
	surface.style.setProperty("visibility", "visible", "important");
	surface.style.setProperty("filter", "none", "important");
	surface.style.setProperty("mix-blend-mode", "normal", "important");
	surface.style.setProperty("position", "static", "important");
	surface.style.setProperty("z-index", "auto", "important");
	for (const child of surface.querySelectorAll("*")) {
		child.style.setProperty("color", "inherit", "important");
		child.style.setProperty("-webkit-text-fill-color", "currentColor", "important");
		child.style.setProperty("opacity", "1", "important");
		child.style.setProperty("visibility", "visible", "important");
		child.style.setProperty("filter", "none", "important");
		child.style.setProperty("mix-blend-mode", "normal", "important");
	}
}
function eventEditableSurface(event) {
	return event.composedPath().find(isEditableSurface);
}
function revealEditorSurface(editor, event) {
	const eventSurface = event ? eventEditableSurface(event) : null;
	if (event && !eventSurface) return false;
	const primaryInput = editor._primaryInput;
	const surface = eventSurface || (isEditableSurface(primaryInput) ? primaryInput : isElement(primaryInput) ? findEditableSurface(primaryInput) : null) || findEditableSurface(editor);
	if (!surface) return false;
	revealEditableSurface(editor, surface);
	return true;
}
function scheduleEditorSurfaceReveal(editor) {
	let attempts = 8;
	const reveal = () => {
		if (revealEditorSurface(editor) || --attempts <= 0) return;
		requestAnimationFrame(reveal);
	};
	queueMicrotask(reveal);
}
function optionElements(root) {
	const options = Array.from(root.querySelectorAll("option"));
	for (const element of root.querySelectorAll("*")) if (element.shadowRoot) options.push(...optionElements(element.shadowRoot));
	return [...new Set(options)];
}
function syncSelectedTraitOptions(selector) {
	const value = selector.value;
	const selected = new Set(normalizeTraitIds(value instanceof Set ? Array.from(value) : value));
	for (const option of optionElements(selector)) option.hidden = selected.has(option.value);
}
function fieldValue(target) {
	if (target.dataset.valueType === "boolean") return target.checked;
	if (target.dataset.valueType === "nullable-number") return target.value === "" ? null : Number(target.value);
	return target.dataset.valueType === "number" ? Number(target.value) : target.value;
}
var LEGALITY_LABELS = {
	"": "Non applicable",
	free: "Libre",
	declared: "Déclaré",
	regulated: "Réglementé",
	reserved: "Réservé",
	military: "Militaire",
	sovereign: "Souverain",
	prohibited: "Interdit",
	unrecognized: "Non reconnu"
};
var EQUIP_STATE_LABELS = {
	stored: "Rangé",
	carried: "Rangé",
	readied: "Préparé",
	equipped: "Équipé",
	installed: "Installé",
	ground: "Au sol"
};
var CONDITION_LABELS = {
	intact: "Intact",
	worn: "Usé",
	damaged: "Endommagé",
	broken: "Brisé",
	destroyed: "Détruit"
};
var OWNERSHIP_LABELS = {
	owned: "Possédé",
	loaned: "Prêté",
	issued: "Attribué",
	held: "Détenu",
	evidence: "Pièce à conviction"
};
var ACCESSIBILITY_LABELS = {
	ready: "Prêt",
	accessible: "Accessible",
	stored: "Rangé",
	distant: "Distant",
	unavailable: "Indisponible"
};
var CONTAINER_ACCESS_LABELS = {
	normal: "Accès normal",
	quick: "Accès rapide",
	restricted: "Accès restreint",
	sealed: "Scellé"
};
function options(values, labels) {
	return values.map((value) => ({
		value,
		label: labels[value] ?? value
	}));
}
var RelisItemSheet = class extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: ["relis", "item-sheet"],
		position: {
			width: 760,
			height: 760
		},
		window: { resizable: true }
	};
	static PARTS = { main: { template: "systems/relis/templates/items/item.hbs" } };
	async _prepareContext(optionsValue) {
		const context = await super._prepareContext(optionsValue);
		const system = this.item.system;
		const hasPhysical = isPhysicalItemType(this.item.type);
		const isContainer = this.item.type === "container";
		const applicability = itemFieldApplicability(this.item.type);
		const canEditDescription = Boolean(this.item.isOwner && (game.user?.isGM || system.permissions?.playerEditableDescription));
		const canManageDescriptionPermission = Boolean(this.item.isOwner && game.user?.isGM);
		const canEditTraits = Boolean(this.item.isOwner);
		const selectedTraitIds = normalizeTraitIds(system.traits);
		const traitOptions = traitChoices(selectedTraitIds);
		const description = String(system.description ?? "");
		const enrichedDescription = await foundry.applications.ux.TextEditor.implementation.enrichHTML(description, {
			async: true,
			relativeTo: this.item,
			secrets: this.item.isOwner
		});
		const sourceRef = system.meta?.sourceRef ?? {};
		const hasSourceRef = Boolean(sourceRef.relisId || sourceRef.uuid);
		let sourceDocument = null;
		if (sourceRef.uuid) try {
			sourceDocument = await foundry.utils.fromUuid(String(sourceRef.uuid));
		} catch {
			sourceDocument = null;
		}
		if (!sourceDocument && sourceRef.relisId) sourceDocument = [...Array.from(game.items?.contents ?? game.items ?? []), ...Array.from(game.actors?.contents ?? game.actors ?? []).flatMap((actor) => Array.from(actor.items ?? []))].find((candidate) => candidate.system.meta?.relisId === String(sourceRef.relisId)) ?? null;
		const sourceMissing = hasSourceRef && !sourceDocument;
		const updateAvailable = Boolean(sourceDocument && system.meta.sourceVersion && sourceDocument.system.meta?.contentVersion && system.meta.sourceVersion !== sourceDocument.system.meta.contentVersion);
		const manualOverrides = Array.from(system.provenance?.manualOverrides ?? [], String);
		const badges = [{
			label: this.item.parent ? "Exemplaire" : "Source",
			className: this.item.parent ? "" : "relis-state-chip--source"
		}];
		if (manualOverrides.length > 0) badges.push({
			label: "Modifié",
			className: "relis-state-chip--warning"
		});
		if (sourceMissing) badges.push({
			label: "Source absente",
			className: "relis-state-chip--danger"
		});
		else if (updateAvailable) badges.push({
			label: "Mise à jour disponible",
			className: "relis-state-chip--warning"
		});
		const diagnostics = [];
		if (!system.meta?.relisId) diagnostics.push({
			level: "error",
			icon: "fa-circle-exclamation",
			message: "Identifiant RE:LIS absent."
		});
		if (sourceMissing) diagnostics.push({
			level: "warning",
			icon: "fa-link-slash",
			message: "La source n’est plus résoluble. Cet exemplaire demeure autonome et jouable."
		});
		if (updateAvailable) diagnostics.push({
			level: "info",
			icon: "fa-arrow-up-right-dots",
			message: "Une version plus récente de la source existe. Aucune mise à jour automatique n’est appliquée."
		});
		if (hasPhysical && system.physical?.unit === "count") {
			const quantity = Number(system.physical.quantity);
			if (!Number.isInteger(quantity)) diagnostics.push({
				level: "error",
				icon: "fa-circle-exclamation",
				message: "Une quantité en unités doit être entière."
			});
		}
		let containerUsage = null;
		if (isContainer && this.item.parent) containerUsage = presentInventory(Array.from(this.item.parent.items ?? []).map((item) => {
			const source = item.toObject?.(true) ?? {};
			return {
				id: item.id,
				name: item.name,
				type: item.type,
				uuid: item.uuid,
				system: source.system ?? item.system ?? {},
				flags: source.flags ?? item.flags ?? {}
			};
		})).rows.find((row) => row.item.id === this.item.id)?.containerUsage ?? null;
		return {
			...context,
			item: this.item,
			itemTypeLabel: game.i18n.localize(`TYPES.Item.${this.item.type}`),
			system,
			editable: this.item.isOwner,
			canEditDescription,
			canManageDescriptionPermission,
			canEditTraits,
			description,
			enrichedDescription,
			traitOptions,
			selectedTraits: selectedTraitIds.map((value) => ({
				value,
				label: traitLabel(value)
			})),
			isAction: this.item.type === "action",
			hasPhysical,
			technicalSlotRows: technicalSlotRows(system.physical?.equipmentProfile ?? {}),
			legacyEquipmentSlot: legacySlot(system.physical?.equipmentProfile ?? {}),
			equipmentFamilies: {
				"": "Selon le type d’objet",
				manipulable: "Objet manipulable",
				wearable: "Équipement portable",
				resource: "Ressource ou consommable"
			},
			equipmentProfileGroups: hasPhysical ? equipmentProfileGroups(system.physical?.equipmentProfile ?? {}, (value) => game.i18n.localize(value)) : [],
			isContainer,
			applicability,
			hasCatalog: hasCatalogFields(applicability),
			hasSourceRef,
			itemRole: this.item.parent ? hasSourceRef ? "Exemplaire lié à une source" : "Exemplaire autonome" : "Source ou modèle de monde",
			isOwnedPhysical: Boolean(this.item.parent && hasPhysical),
			equipmentLabel: EQUIP_STATE_LABELS[system.physical?.equipState] ?? "Rangé",
			badges,
			diagnostics,
			manualOverrides,
			requirementCount: Number(system.requirementRefs?.length ?? 0),
			effectRefCount: Number(system.effectRefs?.length ?? 0),
			physicalTotals: hasPhysical ? physicalTotals(system.physical) : null,
			containerUsage,
			qualityOptions: [{
				value: "",
				label: "Non applicable"
			}, ...QUALITY_GRADE_LABELS.map((label, value) => ({
				value,
				label
			}))],
			rarityOptions: [{
				value: "",
				label: "Non applicable"
			}, ...STRUCTURAL_RARITY_LABELS.map((label, value) => ({
				value,
				label
			}))],
			legalityOptions: options(["", ...LEGALITY_STATES], LEGALITY_LABELS),
			quantityUnitOptions: options(QUANTITY_UNITS, {}),
			equipStateOptions: options(EQUIP_STATES.filter((state) => state !== "carried"), EQUIP_STATE_LABELS),
			selectedEquipState: system.physical?.equipState === "carried" ? "stored" : system.physical?.equipState,
			conditionOptions: options(ITEM_CONDITIONS, CONDITION_LABELS),
			ownershipOptions: options(OWNERSHIP_STATES, OWNERSHIP_LABELS),
			accessibilityOptions: options(ACCESSIBILITY_STATES, ACCESSIBILITY_LABELS),
			containerAccessOptions: options(CONTAINER_ACCESS_RULES, CONTAINER_ACCESS_LABELS),
			attributes: Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
				key,
				label
			})),
			skills: Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => ({
				key,
				label: definition[0]
			})),
			masteryRanks: Object.entries(MASTERY_LABELS).map(([key, label]) => ({
				key,
				label
			}))
		};
	}
	async _onRender(context, optionsValue) {
		await super._onRender(context, optionsValue);
		const root = this.element;
		bindEquipmentProfile(root, this.item, (message) => ui.notifications.error(message));
		const descriptionHost = root.querySelector("[data-description-editor-host]");
		if (descriptionHost) {
			const descriptionEditor = foundry.applications.elements.HTMLProseMirrorElement.create({
				name: "system.description",
				value: String(context.description ?? ""),
				enriched: String(context.enrichedDescription ?? ""),
				toggled: true,
				documentUUID: this.item.uuid,
				collaborate: false,
				height: 260,
				disabled: !context.canEditDescription,
				classes: "relis-description-editor",
				dataset: { descriptionEditor: "true" }
			});
			descriptionHost.replaceChildren(descriptionEditor);
			descriptionEditor.addEventListener("open", () => {
				scheduleEditorSurfaceReveal(descriptionEditor);
			});
			for (const eventName of [
				"focusin",
				"beforeinput",
				"input"
			]) descriptionEditor.addEventListener(eventName, (event) => {
				revealEditorSurface(descriptionEditor, event);
			}, { capture: true });
			descriptionEditor.addEventListener("save", (event) => {
				if (!context.canEditDescription) return;
				const value = String(event.currentTarget.value ?? "");
				this.item.update({ "system.description": value });
			});
		}
		if (!this.item.isOwner) for (const control of root.querySelectorAll("input, select, textarea, button")) control.disabled = true;
		for (const element of root.querySelectorAll("[data-document-field]")) element.addEventListener("change", () => {
			if (!this.item.isOwner) return;
			const path = element.dataset.documentField;
			if (!path) return;
			this.item.update({ [path]: fieldValue(element) });
		});
		const traitSelector = root.querySelector("[data-trait-selector]");
		if (traitSelector) {
			requestAnimationFrame(() => syncSelectedTraitOptions(traitSelector));
			traitSelector.addEventListener("change", (event) => {
				if (!context.canEditTraits) return;
				const value = event.currentTarget.value;
				syncSelectedTraitOptions(event.currentTarget);
				this.item.update({ "system.traits": normalizeTraitIds(value instanceof Set ? Array.from(value) : value) });
			});
		}
		root.querySelector("[data-action='edit-image']")?.addEventListener("click", () => {
			if (!this.item.isOwner) return;
			const FilePicker = foundry.applications.apps.FilePicker.implementation;
			new FilePicker({
				type: "image",
				current: this.item.img,
				callback: (path) => this.item.update({ img: path })
			}).render({ force: true });
		});
		root.querySelector("[data-action='test-item']")?.addEventListener("click", () => {
			const actor = this.item.parent;
			if (!actor) {
				ui.notifications.warn(game.i18n.localize("RELIS.Error.ActorRequired"));
				return;
			}
			actor.rollAction(this.item);
		});
	}
};
//#endregion
//#region src/sheets/register.ts
function registerSheets() {
	foundry.documents.collections.Actors.registerSheet("relis", RelisActorSheet, {
		types: ["character", "npc"],
		makeDefault: true
	});
	foundry.documents.collections.Items.registerSheet("relis", RelisItemSheet, {
		types: ITEM_TYPES,
		makeDefault: true
	});
}
//#endregion
//#region src/type-labels.ts
var DOCUMENT_TYPE_REGISTRY = {
	Actor: ACTOR_TYPES,
	Item: ITEM_TYPES,
	JournalEntryPage: JOURNAL_PAGE_TYPES,
	ActiveEffect: ["relisEffect"],
	Combat: [
		"personal",
		"spatial",
		"crisis"
	],
	Combatant: ["participant"],
	ChatMessage: ["relisCard"]
};
function registerDocumentTypeLabels() {
	for (const [documentName, types] of Object.entries(DOCUMENT_TYPE_REGISTRY)) {
		const documentConfig = CONFIG[documentName];
		documentConfig.typeLabels ??= {};
		for (const type of types) documentConfig.typeLabels[type] = `TYPES.${documentName}.${type}`;
	}
}
//#endregion
//#region src/relis.ts
Hooks.once("init", () => {
	console.log(`RE:LIS | Initialisation ${PACKAGE_VERSION}`);
	CONFIG.Actor.documentClass = RelisActor;
	CONFIG.Item.documentClass = RelisItem;
	registerDocumentTypeLabels();
	registerDataModels();
	registerSettings();
	registerSheets();
	registerIdentityHooks();
	registerIntegrityHooks();
	registerItemHooks();
});
Hooks.once("ready", async () => {
	const textScale = Number(game.settings.get("relis", "ui.textScale") ?? 1);
	document.documentElement.style.setProperty("--relis-text-scale", String(textScale));
	document.body.classList.toggle("relis-high-contrast", Boolean(game.settings.get(SYSTEM_ID, "ui.highContrast")));
	if (game.user?.isGM) try {
		await migrateItemCore();
		const recovered = await recoverPendingInventoryTransfers();
		if (recovered > 0) console.log(`RE:LIS | ${recovered} Item(s) de transfert récupéré(s).`);
		ui.notifications.info(game.i18n.format("RELIS.Ready", { version: PACKAGE_VERSION }));
	} catch (error) {
		console.error("RE:LIS | Échec de la migration ou récupération", error);
		ui.notifications.error(game.i18n.localize("RELIS.Error.ItemMigration"));
	}
});
//#endregion

//# sourceMappingURL=relis.mjs.map