import { RelisActorSheet } from "./actor-sheet";
import { RelisItemSheet } from "./item-sheet";

export function registerSheets(): void {
  foundry.documents.collections.Actors.registerSheet("relis", RelisActorSheet, {
    types: ["character", "npc"],
    makeDefault: true,
  });
  foundry.documents.collections.Items.registerSheet("relis", RelisItemSheet, {
    types: ["action", "equipment"],
    makeDefault: true,
  });
}
