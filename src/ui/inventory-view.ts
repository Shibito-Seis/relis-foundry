/** Presentation only: never writes Actor or Item data. */
export const INVENTORY_CATEGORIES = [
  ["weapon", "Armes"],
  ["armor", "Armures & protections"],
  ["equipment", "Équipement"],
  ["consumable", "Consommables"],
  ["ammunition", "Munitions"],
  ["resource", "Ressources"],
  ["container", "Conteneurs"],
] as const;

export interface InventoryViewRow {
  id: string;
  name: string;
  type: string;
  depth: number;
}

export function groupInventory<T extends InventoryViewRow>(rows: T[]) {
  const groups = INVENTORY_CATEGORIES.map(([id, label]) => ({
    id,
    label,
    inventoryRows: [] as (T & { ancestors: string; path: string })[],
  }));
  const stack: T[] = [];
  let group = groups[0]!;
  for (const row of rows) {
    while (stack.length && stack[stack.length - 1]!.depth >= row.depth)
      stack.pop();
    if (!stack.length)
      group = groups.find((entry) => entry.id === row.type) ?? groups[2]!;
    group.inventoryRows.push({
      ...row,
      ancestors: JSON.stringify(stack.map((entry) => entry.id)),
      path: stack.map((entry) => entry.name).join(" › "),
    });
    stack.push(row);
  }
  return groups;
}

export function normalizeInventorySearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();
}

export function inventoryMatches(
  rows: { id: string; name: string; ancestors: string[] }[],
  query: string,
): Set<string> {
  const needle = normalizeInventorySearch(query);
  const visible = new Set<string>();
  for (const row of rows) {
    if (normalizeInventorySearch(row.name).includes(needle)) {
      visible.add(row.id);
      for (const ancestor of row.ancestors) visible.add(ancestor);
    }
  }
  return visible;
}

export function bindInventoryView(
  root: HTMLElement,
  identity: string,
  queryState: { value: string },
): void {
  const panel = root.querySelector<HTMLElement>("[data-inventory-view]");
  if (!panel) return;
  const key = `relis.inventory-view.v1.${identity}`;
  let folded = new Set<string>();
  let showEmpty = false;
  try {
    const saved = JSON.parse(localStorage.getItem(key) ?? "null");
    if (Array.isArray(saved?.folded))
      folded = new Set(
        saved.folded.filter((value: unknown) => typeof value === "string"),
      );
    showEmpty = saved?.showEmpty === true;
  } catch {
    /* Storage can be disabled; the sheet remains usable. */
  }
  const save = () => {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ folded: [...folded], showEmpty }),
      );
    } catch {
      /* Optional preference. */
    }
  };
  const rows = Array.from(
    panel.querySelectorAll<HTMLElement>("[data-inventory-row]"),
  );
  const descriptors = rows.map((row) => ({
    id: row.dataset.itemId!,
    name: row.dataset.itemName!,
    ancestors: JSON.parse(row.dataset.ancestors ?? "[]") as string[],
  }));
  const categories = Array.from(
    panel.querySelectorAll<HTMLElement>("[data-inventory-category]"),
  );
  const search = panel.querySelector<HTMLInputElement>(
    "[data-inventory-search]",
  )!;
  const emptyToggle = panel.querySelector<HTMLInputElement>(
    "[data-inventory-empty]",
  )!;
  search.value = queryState.value;
  emptyToggle.checked = showEmpty;
  const update = () => {
    const searching = Boolean(normalizeInventorySearch(search.value));
    const matches = inventoryMatches(descriptors, search.value);
    rows.forEach((row, index) => {
      const descriptor = descriptors[index]!;
      row.hidden = searching
        ? !matches.has(descriptor.id)
        : descriptor.ancestors.some((id) => folded.has(`item:${id}`));
    });
    for (const category of categories) {
      const children = Array.from(
        category.querySelectorAll<HTMLElement>("[data-inventory-row]"),
      );
      category.hidden = searching
        ? !children.some((row) => matches.has(row.dataset.itemId!))
        : !showEmpty && children.length === 0;
      category.querySelector<HTMLElement>("[data-category-content]")!.hidden =
        !searching &&
        folded.has(`category:${category.dataset.inventoryCategory}`);
    }
    for (const button of panel.querySelectorAll<HTMLButtonElement>(
      "[data-inventory-fold]",
    )) {
      button.setAttribute(
        "aria-expanded",
        String(searching || !folded.has(button.dataset.inventoryFold!)),
      );
      button.disabled = searching;
    }
    const count = descriptors.filter((row) =>
      normalizeInventorySearch(row.name).includes(
        normalizeInventorySearch(search.value),
      ),
    ).length;
    panel.querySelector<HTMLElement>("[data-inventory-result]")!.textContent =
      searching ? `${count} résultat(s) — chemin des conteneurs inclus` : "";
  };
  search.addEventListener("input", () => {
    queryState.value = search.value;
    update();
  });
  panel
    .querySelector("[data-inventory-clear]")!
    .addEventListener("click", () => {
      search.value = "";
      queryState.value = "";
      update();
      search.focus();
    });
  emptyToggle.addEventListener("change", () => {
    showEmpty = emptyToggle.checked;
    save();
    update();
  });
  for (const button of panel.querySelectorAll<HTMLButtonElement>(
    "[data-inventory-fold]",
  )) {
    button.addEventListener("click", () => {
      const id = button.dataset.inventoryFold!;
      if (folded.has(id)) folded.delete(id);
      else folded.add(id);
      save();
      update();
    });
  }
  update();
}
