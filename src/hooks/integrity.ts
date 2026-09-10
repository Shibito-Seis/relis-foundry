import {
  constrainHitPointUpdate,
  constrainStressUpdate,
} from "../rules/health";

export function registerIntegrityHooks(): void {
  Hooks.on(
    "preUpdateActor",
    (actor: Actor, change: Record<string, any>): void => {
      if (!["character", "npc"].includes(actor.type)) return;
      constrainHitPointUpdate(
        {
          current: Number(actor.system.health?.hitPoints?.current ?? 0),
          maximum: Number(actor.system.health?.hitPoints?.maximum ?? 1),
        },
        change,
      );
      constrainStressUpdate(
        Number(actor.system.health?.stress?.current ?? 0),
        10 + Number(actor.system.derived?.attributes?.willpower ?? 0),
        change,
      );
    },
  );
}
