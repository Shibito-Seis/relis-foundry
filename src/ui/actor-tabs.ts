export interface ActorTabDefinition {
  id: string;
  label: string;
}

export const CHARACTER_TABS: readonly ActorTabDefinition[] = [
  { id: "summary", label: "Synthèse" },
  { id: "identity", label: "Identité & Corps" },
  { id: "attributes", label: "Attributs & Compétences" },
  { id: "progression", label: "Progression" },
  { id: "capabilities", label: "Capacités & Énergies" },
  { id: "inventory", label: "Inventaire & Garde-Robe" },
  { id: "health", label: "Santé & Survie" },
  { id: "relations", label: "Relations & Journal" },
] as const;

export const NPC_TABS: readonly ActorTabDefinition[] = [
  { id: "summary", label: "Synthèse" },
  { id: "identity", label: "Identité" },
  { id: "mechanics", label: "Mécanique" },
  { id: "capabilities", label: "Capacités & Équipement" },
  { id: "health", label: "Santé" },
  { id: "relations", label: "Relations & Notes" },
] as const;

export function actorTabsForType(
  actorType: string,
): readonly ActorTabDefinition[] {
  return actorType === "npc" ? NPC_TABS : CHARACTER_TABS;
}

export function normalizeActorTab(
  actorType: string,
  requested: string | null | undefined,
): string {
  const tabs = actorTabsForType(actorType);
  return tabs.some((tab) => tab.id === requested)
    ? String(requested)
    : (tabs[0]?.id ?? "summary");
}
