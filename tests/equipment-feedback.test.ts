import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { previewEquipment, applyEquipment } from "../src/services/inventory";
vi.mock("../src/services/inventory", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../src/services/inventory")>()),
  previewEquipment: vi.fn(),
  applyEquipment: vi.fn(),
}));
let Sheet: any;
beforeAll(async () => {
  (globalThis as any).foundry = {
    applications: {
      sheets: { ActorSheetV2: class {} },
      api: { HandlebarsApplicationMixin: (base: any) => base },
    },
  };
  Sheet = (await import("../src/sheets/actor-sheet")).RelisActorSheet;
});
beforeEach(() => {
  vi.clearAllMocks();
  (globalThis as any).ui = { notifications: { error: vi.fn(), info: vi.fn() } };
});
describe("retour utilisateur des commandes d’équipement", () => {
  it("affiche le motif d’un refus sans notification de succès ni écriture", async () => {
    vi.mocked(previewEquipment).mockReturnValue({
      updates: [],
      rows: [{ name: "Arme locale", errors: ["Mains insuffisantes."] }],
    } as any);
    const sheet = new Sheet();
    sheet.actor = {};
    sheet.render = vi.fn();
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      await sheet.inventoryTask(
        () => sheet.confirmEquipment([{ itemId: "a", state: "held-two" }]),
        "Succès",
      );
      expect(ui.notifications.error).toHaveBeenCalledWith(
        "Équipement refusé — Arme locale : Mains insuffisantes.",
      );
      expect(ui.notifications.info).not.toHaveBeenCalled();
      expect(applyEquipment).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });
  it("reste silencieux en cas d’annulation et annonce seulement une opération appliquée", async () => {
    const sheet = new Sheet();
    sheet.render = vi.fn();
    await sheet.inventoryTask(async () => false, "Succès");
    expect(ui.notifications.info).not.toHaveBeenCalled();
    await sheet.inventoryTask(async () => true, "Succès");
    expect(ui.notifications.info).toHaveBeenCalledExactlyOnceWith("Succès");
  });
});
