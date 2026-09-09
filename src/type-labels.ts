import { ACTOR_TYPES, ITEM_TYPES, JOURNAL_PAGE_TYPES } from "./config";

export const DOCUMENT_TYPE_REGISTRY = {
  Actor: ACTOR_TYPES,
  Item: ITEM_TYPES,
  JournalEntryPage: JOURNAL_PAGE_TYPES,
  ActiveEffect: ["relisEffect"],
  Combat: ["personal", "spatial", "crisis"],
  Combatant: ["participant"],
  ChatMessage: ["relisCard"],
} as const;

export function registerDocumentTypeLabels(): void {
  for (const [documentName, types] of Object.entries(DOCUMENT_TYPE_REGISTRY)) {
    const documentConfig = CONFIG[documentName];
    documentConfig.typeLabels ??= {};
    for (const type of types)
      documentConfig.typeLabels[type] = `TYPES.${documentName}.${type}`;
  }
}
