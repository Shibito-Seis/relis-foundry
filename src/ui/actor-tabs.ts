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

const NPC_CONDENSED_TABS = NPC_TABS.filter((tab) =>
  ["summary", "identity", "capabilities"].includes(tab.id),
);

const NPC_STANDARD_TABS = NPC_TABS.filter((tab) => tab.id !== "relations");

export function actorTabsForType(
  actorType: string,
  detailLevel = "complete",
): readonly ActorTabDefinition[] {
  if (actorType !== "npc") return CHARACTER_TABS;
  if (detailLevel === "condensed") return NPC_CONDENSED_TABS;
  if (detailLevel === "standard") return NPC_STANDARD_TABS;
  return NPC_TABS;
}

export function normalizeActorTab(
  actorType: string,
  requested: string | null | undefined,
  detailLevel = "complete",
): string {
  const tabs = actorTabsForType(actorType, detailLevel);
  return tabs.some((tab) => tab.id === requested)
    ? String(requested)
    : (tabs[0]?.id ?? "summary");
}
