import { constrainHitPointUpdate } from "../rules/health";

export function registerIntegrityHooks(): void {
  Hooks.on(
    "preUpdateActor",
    (actor: Actor, change: Record<string, any>): void => {
      if (actor.type !== "character") return;
      constrainHitPointUpdate(
        {
          current: Number(actor.system.health?.hitPoints?.current ?? 0),
          maximum: Number(actor.system.health?.hitPoints?.maximum ?? 1),
        },
        change,
      );
    },
  );
}
