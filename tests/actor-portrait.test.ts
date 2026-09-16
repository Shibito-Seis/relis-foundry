import { beforeEach, describe, expect, it, vi } from "vitest";
import { openActorPortraitPicker } from "../src/ui/actor-portrait";

describe("édition du portrait PJ et PNJ", () => {
  let options: any;
  const render = vi.fn();
  beforeEach(() => {
    options = undefined;
    render.mockClear();
    (globalThis as any).foundry = {
      applications: {
        apps: {
          FilePicker: {
            implementation: class {
              constructor(value: any) {
                options = value;
              }
              render = render;
            },
          },
        },
      },
    };
  });
  it("ouvre le sélecteur existant et enregistre seulement l’image de l’Actor", async () => {
    const actor = {
      isOwner: true,
      img: "old.webp",
      update: vi.fn().mockResolvedValue(undefined),
    };
    openActorPortraitPicker(actor);
    expect(options.current).toBe("old.webp");
    expect(options.type).toBe("image");
    expect(render).toHaveBeenCalledWith({ force: true });
    await options.callback("new.webp");
    expect(actor.update).toHaveBeenCalledExactlyOnceWith({ img: "new.webp" });
  });
  it("refuse sans propriété et recontrôle la propriété lors du choix", async () => {
    const actor = { isOwner: false, update: vi.fn() };
    openActorPortraitPicker(actor);
    expect(options).toBeUndefined();
    actor.isOwner = true;
    openActorPortraitPicker(actor);
    actor.isOwner = false;
    await options.callback("new.webp");
    expect(actor.update).not.toHaveBeenCalled();
  });
});
