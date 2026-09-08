import { RULES_VERSION } from "../config";
import {
  degreeLabel,
  masteryBonus,
  resolveCheck,
  type CheckDegree,
} from "../rules/check";

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

interface PlainResourcePool {
  key: string;
  current: number;
  maximum: number;
  reserved: number;
  debt: number;
  unit: string;
}

function plainPool(pool: any): PlainResourcePool {
  return {
    key: String(pool.key),
    current: Number(pool.current ?? 0),
    maximum: Number(pool.maximum ?? 0),
    reserved: Number(pool.reserved ?? 0),
    debt: Number(pool.debt ?? 0),
    unit: String(pool.unit ?? "count"),
  };
}

function succeeded(degree: CheckDegree): boolean {
  return degree === "success" || degree === "criticalSuccess";
}

export class RelisActor extends Actor {
  async rollRelisCheck(options: RollCheckOptions): Promise<void> {
    if (this.type !== "character")
      throw new Error("La tranche 10-C ne résout que les jets de personnage.");

    const attribute = Number(
      this.system.attributes?.[options.attributeKey]?.base ?? 0,
    );
    const rank = String(
      this.system.skills?.[options.skillKey]?.rank ?? "untrained",
    );
    const mastery = masteryBonus(rank);
    const difficulty = Math.max(0, Math.trunc(Number(options.difficulty) || 0));
    const cost = Math.max(0, Math.trunc(Number(options.cost) || 0));
    const resourceKey = String(options.resourceKey ?? "");
    const pools = Array.from(this.system.energyPools ?? [], plainPool);
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
    let createdEffectId: string | null = null;

    try {
      if (cost > 0 && resourceIndex >= 0) {
        const pool = pools[resourceIndex];
        if (!pool) throw new Error("Réserve introuvable après validation.");
        pool.current -= cost;
        await this.update({ "system.energyPools": pools });
      }

      if (options.effect?.conditionKey && succeeded(resolution.degree)) {
        const [effect] = await this.createEmbeddedDocuments("ActiveEffect", [
          {
            name: `RE:LIS — ${options.effect.conditionKey}`,
            type: "relisEffect",
            icon: "icons/svg/aura.svg",
            origin: options.sourceItem?.uuid ?? this.uuid,
            duration: {
              rounds: Math.max(0, Math.trunc(options.effect.durationRounds)),
            },
            system: {
              sourceRef: options.sourceItem?.uuid ?? this.uuid,
              conditionKey: options.effect.conditionKey,
              intensity: Math.max(0, Math.trunc(options.effect.intensity)),
              visibility: "document",
            },
          },
        ]);
        createdEffectId = effect?.id ?? null;
      }

      const content = await renderTemplate(
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
          effectApplied: Boolean(createdEffectId),
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
      if (createdEffectId)
        await this.deleteEmbeddedDocuments("ActiveEffect", [createdEffectId]);
      if (cost > 0) await this.update({ "system.energyPools": priorPools });
      throw error;
    }
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
