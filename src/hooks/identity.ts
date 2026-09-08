import { createRelisId, isRelisId } from "../utils/ulid";

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
  if (isRelisId(current)) return;
  document.updateSource({ "system.meta.relisId": createRelisId() });
}

export function registerIdentityHooks(): void {
  for (const documentName of DOCUMENT_NAMES)
    Hooks.on(`preCreate${documentName}`, ensureRelisId);
}
