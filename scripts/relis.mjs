//#region src/config.ts
var SYSTEM_ID = "relis";
var PACKAGE_VERSION = "0.2.0";
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
//#endregion
//#region src/data/models.ts
var fields = foundry.data.fields;
function metaField() {
	return new fields.SchemaField({
		schemaVersion: new fields.StringField({
			required: true,
			blank: false,
			initial: "1"
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
		})
	});
}
function resourcePoolField() {
	return new fields.SchemaField({
		key: new fields.StringField({
			required: true,
			blank: false
		}),
		current: new fields.NumberField({
			required: true,
			min: 0,
			initial: 0
		}),
		maximum: new fields.NumberField({
			required: true,
			min: 0,
			initial: 0
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
			initial: "count"
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
var CharacterData = class extends ReservedData {
	static defineSchema() {
		const attributes = Object.fromEntries(Object.keys(ATTRIBUTE_LABELS).map((key) => [key, attributeField()]));
		const skills = Object.fromEntries(Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => [key, skillField(definition[1])]));
		return {
			...super.defineSchema(),
			identity: new fields.SchemaField({
				primaryName: new fields.StringField({
					required: true,
					blank: true,
					initial: ""
				}),
				publicName: new fields.StringField({
					required: true,
					blank: true,
					initial: ""
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
				})
			}),
			level: new fields.NumberField({
				required: true,
				integer: true,
				min: 1,
				max: 30,
				initial: 1
			}),
			attributes: new fields.SchemaField(attributes),
			skills: new fields.SchemaField(skills),
			health: new fields.SchemaField({ hitPoints: new fields.SchemaField({
				current: new fields.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 10
				}),
				maximum: new fields.NumberField({
					required: true,
					integer: true,
					min: 1,
					initial: 10
				})
			}) }),
			energyPools: new fields.ArrayField(resourcePoolField(), {
				required: true,
				initial: []
			})
		};
	}
	prepareDerivedData() {
		super.prepareDerivedData();
		const attributes = Object.fromEntries(Object.entries(this.attributes).map(([key, score]) => [key, Number(score.base ?? 0)]));
		const skills = Object.fromEntries(Object.entries(this.skills).map(([key, score]) => [key, {
			masteryBonus: masteryBonus(String(score.rank)),
			total: masteryBonus(String(score.rank))
		}]));
		const hitPoints = clampHitPoints(this.health.hitPoints.current, this.health.hitPoints.maximum);
		this.derived = {
			attributes,
			skills,
			trackables: { hitPoints: {
				value: hitPoints.current,
				max: hitPoints.maximum
			} }
		};
	}
};
var ActionData = class extends ReservedData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			test: new fields.SchemaField({
				attributeKey: new fields.StringField({
					required: true,
					blank: false,
					initial: "dexterity"
				}),
				skillKey: new fields.StringField({
					required: true,
					blank: false,
					initial: "shooting"
				}),
				difficulty: new fields.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 15
				}),
				resourceKey: new fields.StringField({
					required: true,
					blank: true,
					initial: ""
				}),
				cost: new fields.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 0
				})
			}),
			effect: new fields.SchemaField({
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
				durationRounds: new fields.NumberField({
					required: true,
					integer: true,
					min: 0,
					initial: 1
				})
			})
		};
	}
};
var EquipmentData = class extends ReservedData {
	static defineSchema() {
		return {
			...super.defineSchema(),
			physical: new fields.SchemaField({
				quantity: new fields.NumberField({
					required: true,
					min: 0,
					initial: 1
				}),
				massEach: new fields.NumberField({
					required: true,
					min: 0,
					initial: 0
				}),
				bulkEach: new fields.NumberField({
					required: true,
					min: 0,
					initial: 0
				}),
				equipState: new fields.StringField({
					required: true,
					blank: false,
					initial: "stored"
				}),
				condition: new fields.StringField({
					required: true,
					blank: false,
					initial: "intact"
				})
			})
		};
	}
};
var RelisEffectData = class extends foundry.abstract.TypeDataModel {
	static defineSchema() {
		return {
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
	for (const type of ACTOR_TYPES) CONFIG.Actor.dataModels[type] = type === "character" ? CharacterData : ReservedData;
	for (const type of ITEM_TYPES) CONFIG.Item.dataModels[type] = type === "action" ? ActionData : type === "equipment" ? EquipmentData : ReservedData;
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
	CONFIG.Actor.trackableAttributes = Object.fromEntries(ACTOR_TYPES.map((type) => [type, type === "character" ? {
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
//#region src/documents/actor.ts
function plainPool(pool) {
	return {
		key: String(pool.key),
		current: Number(pool.current ?? 0),
		maximum: Number(pool.maximum ?? 0),
		reserved: Number(pool.reserved ?? 0),
		debt: Number(pool.debt ?? 0),
		unit: String(pool.unit ?? "count")
	};
}
function succeeded(degree) {
	return degree === "success" || degree === "criticalSuccess";
}
var RelisActor = class extends Actor {
	async rollRelisCheck(options) {
		if (this.type !== "character") throw new Error("La tranche 10-C ne résout que les jets de personnage.");
		const attribute = Number(this.system.attributes?.[options.attributeKey]?.base ?? 0);
		const mastery = masteryBonus(String(this.system.skills?.[options.skillKey]?.rank ?? "untrained"));
		const difficulty = Math.max(0, Math.trunc(Number(options.difficulty) || 0));
		const cost = Math.max(0, Math.trunc(Number(options.cost) || 0));
		const resourceKey = String(options.resourceKey ?? "");
		const pools = Array.from(this.system.energyPools ?? [], plainPool);
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
			const content = await renderTemplate("systems/relis/templates/chat/check-card.hbs", {
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
function isRelisId(value) {
	return typeof value === "string" && /^[0-9A-HJKMNP-TV-Z]{26}$/.test(value);
}
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
	if (isRelisId(current)) return;
	document.updateSource({ "system.meta.relisId": createRelisId() });
}
function registerIdentityHooks() {
	for (const documentName of DOCUMENT_NAMES) Hooks.on(`preCreate${documentName}`, ensureRelisId);
}
//#endregion
//#region src/hooks/integrity.ts
function registerIntegrityHooks() {
	Hooks.on("preUpdateActor", (actor, change) => {
		if (actor.type !== "character") return;
		constrainHitPointUpdate({
			current: Number(actor.system.health?.hitPoints?.current ?? 0),
			maximum: Number(actor.system.health?.hitPoints?.maximum ?? 1)
		}, change);
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
		default: "1"
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
function actorTabsForType(actorType) {
	return actorType === "npc" ? NPC_TABS : CHARACTER_TABS;
}
function normalizeActorTab(actorType, requested) {
	const tabs = actorTabsForType(actorType);
	return tabs.some((tab) => tab.id === requested) ? String(requested) : tabs[0]?.id ?? "summary";
}
//#endregion
//#region src/sheets/actor-sheet.ts
var ActorSheetV2 = foundry.applications.sheets.ActorSheetV2;
var HandlebarsApplicationMixin$1 = foundry.applications.api.HandlebarsApplicationMixin;
function fieldValue$1(target) {
	if (target instanceof HTMLInputElement && target.type === "checkbox") return target.checked;
	if (target.dataset.valueType === "number") return Number(target.value);
	return target.value;
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
	async _prepareContext(options) {
		const context = await super._prepareContext(options);
		const isCharacter = this.actor.type === "character";
		const attributes = isCharacter ? Object.entries(ATTRIBUTE_LABELS).map(([key, label]) => ({
			key,
			label,
			base: this.actor.system.attributes[key].base,
			partial: this.actor.system.attributes[key].partial,
			effective: this.actor.system.derived?.attributes?.[key] ?? 0
		})) : [];
		const skills = isCharacter ? Object.entries(SKILL_DEFINITIONS).map(([key, definition]) => ({
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
		const energyPools = isCharacter ? Array.from(this.actor.system.energyPools ?? []).map((pool, index) => ({
			index,
			key: String(pool.key),
			label: String(pool.key).toLocaleUpperCase("fr"),
			current: Number(pool.current ?? 0),
			maximum: Number(pool.maximum ?? 0),
			reserved: Number(pool.reserved ?? 0),
			debt: Number(pool.debt ?? 0)
		})) : [];
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
		const tabs = actorTabsForType(this.actor.type).map((tab) => ({
			...tab,
			active: tab.id === normalizeActorTab(this.actor.type, this.activeTab),
			tabIndex: tab.id === normalizeActorTab(this.actor.type, this.activeTab) ? 0 : -1
		}));
		const favoriteSkills = skills.filter((skill) => skill.favorite);
		const featuredSkills = favoriteSkills.length > 0 ? favoriteSkills : skills.slice(0, 4);
		const publicName = isCharacter ? String(this.actor.system.identity.publicName ?? "").trim() : "";
		return {
			...context,
			actor: this.actor,
			system: this.actor.system,
			editable: this.actor.isOwner,
			isCharacter,
			isNpc: this.actor.type === "npc",
			actorTypeLabel: game.i18n.localize(`TYPES.Actor.${this.actor.type}`),
			displayName: publicName || this.actor.name,
			tabs,
			attributes,
			skills,
			featuredSkills,
			energyPools,
			items: Array.from(this.actor.items ?? []).map((item) => ({
				id: item.id,
				name: item.name,
				type: item.type,
				typeLabel: game.i18n.localize(`TYPES.Item.${item.type}`),
				canRoll: item.type === "action"
			})),
			effects,
			effectCount: effects.length,
			itemCount: Number(this.actor.items?.size ?? 0)
		};
	}
	async _onRender(context, options) {
		await super._onRender(context, options);
		const root = this.element;
		this.activateTab(root, this.activeTab);
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
		root.querySelector("[data-action='create-demo']")?.addEventListener("click", () => {
			this.createDemo();
		});
	}
	activateTab(root, requested, focus = false) {
		const active = normalizeActorTab(this.actor.type, requested);
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
		const pools = Array.from(this.actor.system.energyPools ?? [], (pool) => ({
			key: String(pool.key),
			current: Number(pool.current),
			maximum: Number(pool.maximum),
			reserved: Number(pool.reserved),
			debt: Number(pool.debt),
			unit: String(pool.unit)
		}));
		if (!pools.some((pool) => pool.key === "ce")) {
			pools.push({
				key: "ce",
				current: 3,
				maximum: 3,
				reserved: 0,
				debt: 0,
				unit: "count"
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
				equipState: "carried",
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
		ui.notifications.info("Démonstration 10-C préparée : Action, Équipement et 3 CE.");
	}
};
//#endregion
//#region src/sheets/item-sheet.ts
var ItemSheetV2 = foundry.applications.sheets.ItemSheetV2;
var HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
function fieldValue(target) {
	return target.dataset.valueType === "number" ? Number(target.value) : target.value;
}
var RelisItemSheet = class extends HandlebarsApplicationMixin(ItemSheetV2) {
	static DEFAULT_OPTIONS = {
		classes: ["relis", "item-sheet"],
		position: {
			width: 560,
			height: 600
		},
		window: { resizable: true }
	};
	static PARTS = { main: { template: "systems/relis/templates/items/item.hbs" } };
	async _prepareContext(options) {
		return {
			...await super._prepareContext(options),
			item: this.item,
			itemTypeLabel: game.i18n.localize(`TYPES.Item.${this.item.type}`),
			system: this.item.system,
			editable: this.item.isOwner,
			isAction: this.item.type === "action",
			isEquipment: this.item.type === "equipment",
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
	async _onRender(context, options) {
		await super._onRender(context, options);
		const root = this.element;
		if (!this.item.isOwner) for (const control of root.querySelectorAll("input, select, button")) control.disabled = true;
		for (const element of root.querySelectorAll("[data-document-field]")) element.addEventListener("change", () => {
			const path = element.dataset.documentField;
			if (!path) return;
			this.item.update({ [path]: fieldValue(element) });
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
		types: ["action", "equipment"],
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
	registerDocumentTypeLabels();
	registerDataModels();
	registerSettings();
	registerSheets();
	registerIdentityHooks();
	registerIntegrityHooks();
});
Hooks.once("ready", () => {
	const textScale = Number(game.settings.get("relis", "ui.textScale") ?? 1);
	document.documentElement.style.setProperty("--relis-text-scale", String(textScale));
	document.body.classList.toggle("relis-high-contrast", Boolean(game.settings.get(SYSTEM_ID, "ui.highContrast")));
	if (game.user?.isGM) ui.notifications.info(game.i18n.localize("RELIS.Ready"));
});
//#endregion

//# sourceMappingURL=relis.mjs.map