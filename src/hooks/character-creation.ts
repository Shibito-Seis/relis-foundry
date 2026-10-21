import { openCharacterCreationAssistant } from "../ui/character-creation-assistant";

export function registerCharacterCreationHooks(): void {
  Hooks.on(
    "renderActorDirectory",
    (_application: any, element: HTMLElement) => {
      const root = element instanceof HTMLElement ? element : element?.[0];
      if (!root || root.querySelector("[data-relis-create-character]")) return;
      if (!game.user?.isGM && !game.user?.can?.("ACTOR_CREATE")) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.relisCreateCharacter = "true";
      button.className = "relis-directory-create";
      button.innerHTML =
        '<i class="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Créer un personnage RE:LIS';
      button.addEventListener("click", () => {
        void openCharacterCreationAssistant();
      });
      const target =
        root.querySelector(".directory-header .header-actions") ??
        root.querySelector(".directory-header") ??
        root;
      target.append(button);
    },
  );
}
