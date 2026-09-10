import { PACKAGE_VERSION, SYSTEM_ID } from "./config";
import { registerDataModels } from "./data/models";
import { RelisActor } from "./documents/actor";
import { RelisItem } from "./documents/item";
import { registerIdentityHooks } from "./hooks/identity";
import { registerIntegrityHooks } from "./hooks/integrity";
import { migrateItemCore, registerItemHooks } from "./hooks/items";
import { registerSettings } from "./settings";
import { registerSheets } from "./sheets/register";
import { registerDocumentTypeLabels } from "./type-labels";

Hooks.once("init", () => {
  console.log(`RE:LIS | Initialisation ${PACKAGE_VERSION}`);
  CONFIG.Actor.documentClass = RelisActor;
  CONFIG.Item.documentClass = RelisItem;
  registerDocumentTypeLabels();
  registerDataModels();
  registerSettings();
  registerSheets();
  registerIdentityHooks();
  registerIntegrityHooks();
  registerItemHooks();
});

Hooks.once("ready", async () => {
  const textScale = Number(game.settings.get(SYSTEM_ID, "ui.textScale") ?? 1);
  document.documentElement.style.setProperty(
    "--relis-text-scale",
    String(textScale),
  );
  document.body.classList.toggle(
    "relis-high-contrast",
    Boolean(game.settings.get(SYSTEM_ID, "ui.highContrast")),
  );
  if (game.user?.isGM) {
    try {
      await migrateItemCore();
      ui.notifications.info(game.i18n.localize("RELIS.Ready"));
    } catch (error) {
      console.error("RE:LIS | Échec de la migration 10-E1-P", error);
      ui.notifications.error(game.i18n.localize("RELIS.Error.ItemMigration"));
    }
  }
});
