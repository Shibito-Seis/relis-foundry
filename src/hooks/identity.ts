import { createWorldItemId } from "../data/item-defaults";
import { createRelisId } from "../utils/ulid";

const DOCUMENT_NAMES = [
  "Actor",
  "Item",
  "JournalEntryPage",
  "ActiveEffect",
  "Combat",
  "Combatant",
  "ChatMessage",
];

function ensureRelisId(document: any): void {
  const current = document.system?.meta?.relisId;
  if (typeof current === "string" && current.trim()) return;
  const isItem =
    document.documentName === "Item" ||
    (typeof Item !== "undefined" && document instanceof Item);
  document.updateSource({
    "system.meta.relisId": isItem ? createWorldItemId() : createRelisId(),
  });
}

export function registerIdentityHooks(): void {
  for (const documentName of DOCUMENT_NAMES)
    Hooks.on(`preCreate${documentName}`, ensureRelisId);
}
