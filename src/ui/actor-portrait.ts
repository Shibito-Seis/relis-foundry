/** Editing the Actor image is distinct from opening its artwork. */
export function openActorPortraitPicker(actor: {
  isOwner: boolean;
  img?: string;
  update(data: Record<string, unknown>): Promise<unknown>;
}): void {
  if (!actor.isOwner) return;
  const FilePicker = foundry.applications.apps.FilePicker.implementation;
  const picker = new FilePicker({
    type: "image",
    current: actor.img ?? "",
    callback: async (path: string) => {
      if (!actor.isOwner || !path) return;
      try {
        await actor.update({ img: path });
      } catch (error) {
        ui.notifications.error(
          error instanceof Error
            ? error.message
            : "Le portrait n’a pas pu être enregistré.",
        );
      }
    },
  });
  void picker.render({ force: true });
}
