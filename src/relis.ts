import { PACKAGE_VERSION, SYSTEM_ID } from "./config";
import { registerDataModels } from "./data/models";
import { RelisActor } from "./documents/actor";
import { registerIdentityHooks } from "./hooks/identity";
import { registerIntegrityHooks } from "./hooks/integrity";
import { registerSettings } from "./settings";
import { registerSheets } from "./sheets/register";

Hooks.once("init", () => {
  console.log(`RE:LIS | Initialisation ${PACKAGE_VERSION}`);
  CONFIG.Actor.documentClass = RelisActor;
  registerDataModels();
  registerSettings();
  registerSheets();
  registerIdentityHooks();
  registerIntegrityHooks();
});

Hooks.once("ready", () => {
  const textScale = Number(game.settings.get(SYSTEM_ID, "ui.textScale") ?? 1);
  document.documentElement.style.setProperty(
    "--relis-text-scale",
    String(textScale),
  );
  document.body.classList.toggle(
    "relis-high-contrast",
    Boolean(game.settings.get(SYSTEM_ID, "ui.highContrast")),
  );
  if (game.user?.isGM) ui.notifications.info(game.i18n.localize("RELIS.Ready"));
});
