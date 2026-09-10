import { RULES_VERSION } from "../config";
import {
  degreeLabel,
  masteryBonus,
  resolveCheck,
  type CheckDegree,
} from "../rules/check";
import { formatRoundDuration, presentCondition } from "../rules/effects";
import { plainResourcePool } from "../rules/resources";

interface RollCheckOptions {
  attributeKey: string;
  skillKey: string;
  difficulty: number;
  label: string;
  resourceKey?: string;
  cost?: number;
  effect?: {
    conditionKey: string;
    intensity: number;
    durationRounds: number;
  };
  sourceItem?: Item;
}

function succeeded(degree: CheckDegree): boolean {
  return degree === "success" || degree === "criticalSuccess";
}

interface EffectMutation {
  effectId: string;
  created: boolean;
  document?: ActiveEffect;
  rollback?: Record<string, unknown>;
}

export class RelisActor extends Actor {
  async rollRelisCheck(options: RollCheckOptions): Promise<void> {
    if (!["character", "npc"].includes(this.type))
      throw new Error(
        "Les jets personnels RE:LIS exigent un Personnage ou un PNJ.",
      );

    const attribute = Number(
      this.system.derived?.attributes?.[options.attributeKey] ??
        this.system.attributes?.[options.attributeKey]?.base ??
        0,
    );
    const rank = String(
      this.system.skills?.[options.skillKey]?.rank ?? "untrained",
    );
    const mastery = masteryBonus(rank);
    const difficulty = Math.max(0, Math.trunc(Number(options.difficulty) || 0));
    const cost = Math.max(0, Math.trunc(Number(options.cost) || 0));
    const resourceKey = String(options.resourceKey ?? "");
    const pools = Array.from(this.system.energyPools ?? [], plainResourcePool);
    const resourceIndex = resourceKey
      ? pools.findIndex((pool) => pool.key === resourceKey)
      : -1;

    if (
      cost > 0 &&
      (resourceIndex < 0 || (pools[resourceIndex]?.current ?? 0) < cost)
    ) {
      ui.notifications.warn(
        game.i18n.localize("RELIS.Error.InsufficientResource"),
      );
      return;
    }

    const roll = await new Roll("1d20 + @attribute + @mastery", {
      attribute,
      mastery,
    }).evaluate();
    const natural = Number(roll.dice[0]?.total ?? roll.total ?? 0);
    const total = Number(roll.total ?? 0);
    const resolution = resolveCheck({ natural, total, difficulty });
    const priorPools = pools.map((pool) => ({ ...pool }));
    let effectMutation: EffectMutation | null = null;

    try {
      if (cost > 0 && resourceIndex >= 0) {
        const pool = pools[resourceIndex];
        if (!pool) throw new Error("Réserve introuvable après validation.");
        pool.current -= cost;
        await this.update({ "system.energyPools": pools });
      }

      if (options.effect?.conditionKey && succeeded(resolution.degree)) {
        effectMutation = await this.applyTemporaryEffect(
          options.effect,
          options.sourceItem?.uuid ?? this.uuid,
        );
      }

      const effectPresentation = options.effect?.conditionKey
        ? presentCondition(options.effect.conditionKey, game.i18n)
        : null;
      const effectDurationRounds = Math.max(
        0,
        Math.trunc(Number(options.effect?.durationRounds) || 0),
      );

      const content = await foundry.applications.handlebars.renderTemplate(
        "systems/relis/templates/chat/check-card.hbs",
        {
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
          effectIntensity: Math.max(
            0,
            Math.trunc(Number(options.effect?.intensity) || 0),
          ),
          effectDuration: formatRoundDuration(effectDurationRounds, game.i18n),
        },
      );

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
            `Total=${total}`,
          ],
        },
      });
    } catch (error) {
      if (effectMutation?.created)
        await this.deleteEmbeddedDocuments("ActiveEffect", [
          effectMutation.effectId,
        ]);
      else if (effectMutation?.document && effectMutation.rollback)
        await effectMutation.document.update(effectMutation.rollback);
      if (cost > 0) await this.update({ "system.energyPools": priorPools });
      throw error;
    }
  }

  private async applyTemporaryEffect(
    effectOptions: NonNullable<RollCheckOptions["effect"]>,
    sourceRef: string,
  ): Promise<EffectMutation> {
    const conditionKey = String(effectOptions.conditionKey);
    const intensity = Math.max(
      0,
      Math.trunc(Number(effectOptions.intensity) || 0),
    );
    const rounds = Math.max(
      0,
      Math.trunc(Number(effectOptions.durationRounds) || 0),
    );
    const presentation = presentCondition(conditionKey, game.i18n);
    const duration = {
      rounds,
      startRound: Number(game.combat?.round ?? 0),
      startTurn: Number(game.combat?.turn ?? 0),
      startTime: Number(game.time?.worldTime ?? 0),
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
        visibility: "document",
      },
    };
    const matchingEffects = (
      Array.from(this.effects ?? []) as ActiveEffect[]
    ).filter(
      (effect) =>
        effect.type === "relisEffect" &&
        effect.origin === sourceRef &&
        String(effect.system?.conditionKey) === conditionKey,
    );
    const [existing, ...legacyDuplicates] = matchingEffects;

    if (legacyDuplicates.length > 0)
      await this.deleteEmbeddedDocuments(
        "ActiveEffect",
        legacyDuplicates.map((effect) => effect.id),
      );

    if (!existing) {
      const [created] = await this.createEmbeddedDocuments("ActiveEffect", [
        effectData,
      ]);
      return {
        effectId: String(created?.id ?? ""),
        created: true,
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
        startTime: existing.duration?.startTime ?? null,
      },
      "system.sourceRef": existing.system?.sourceRef ?? "",
      "system.conditionKey": existing.system?.conditionKey ?? "",
      "system.intensity": existing.system?.intensity ?? 0,
      "system.visibility": existing.system?.visibility ?? "document",
    };
    await existing.update(effectData);
    return {
      effectId: existing.id,
      created: false,
      document: existing,
      rollback,
    };
  }

  async rollAction(action: Item): Promise<void> {
    if (action.type !== "action")
      throw new Error("L’Item transmis n’est pas une Action RE:LIS.");
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
        durationRounds: Number(action.system.effect.durationRounds),
      },
      sourceItem: action,
    });
  }
}
