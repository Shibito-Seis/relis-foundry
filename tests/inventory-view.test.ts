import { describe, expect, it } from "vitest";
import {
  groupInventory,
  inventoryMatches,
  normalizeInventorySearch,
} from "../src/ui/inventory-view";

const rows = [
  { id: "loose", name: "Objet libre", type: "weapon", depth: 0 },
  { id: "bag", name: "Sac de test", type: "container", depth: 0 },
  { id: "box", name: "Boîte locale", type: "container", depth: 1 },
  { id: "target", name: "Équipement témoin", type: "equipment", depth: 2 },
  { id: "sibling", name: "Autre objet", type: "resource", depth: 1 },
];

describe("présentation visuelle de l’inventaire", () => {
  it("classe les racines et conserve chaque descendant une seule fois", () => {
    const groups = groupInventory(rows);
    expect(groups).toHaveLength(7);
    expect(
      groups.flatMap((group) => group.inventoryRows).map((row) => row.id),
    ).toEqual(rows.map((row) => row.id));
    expect(
      groups.find((group) => group.id === "equipment")!.inventoryRows,
    ).toHaveLength(0);
    const contained = groups.find(
      (group) => group.id === "container",
    )!.inventoryRows;
    expect(contained).toHaveLength(4);
    expect(contained[2]!.path).toBe("Sac de test › Boîte locale");
    expect(JSON.parse(contained[3]!.ancestors)).toEqual(["bag"]);
  });
  it("retrouve un nom sans accents avec tous ses ancêtres, sans ses voisins", () => {
    const descriptors = groupInventory(rows)
      .flatMap((group) => group.inventoryRows)
      .map((row) => ({ ...row, ancestors: JSON.parse(row.ancestors) }));
    expect([...inventoryMatches(descriptors, " EQUIPEMENT ")].sort()).toEqual([
      "bag",
      "box",
      "target",
    ]);
    expect(inventoryMatches(descriptors, "absent").size).toBe(0);
    expect(inventoryMatches(descriptors, "").size).toBe(5);
    expect(normalizeInventorySearch("ÉTÉ")).toBe("ete");
  });
  it("accepte une liste vide et des racines détachées sans supprimer de ligne", () => {
    expect(
      groupInventory([]).every((group) => group.inventoryRows.length === 0),
    ).toBe(true);
    expect(
      groupInventory([{ ...rows[0]!, depth: 3 }]).flatMap(
        (group) => group.inventoryRows,
      )[0]!.ancestors,
    ).toBe("[]");
  });
});
