import { describe, expect, it } from "vitest";
import { ITEM_TYPES } from "../src/config";
import {
  ITEM_FIELD_APPLICABILITY,
  QUALITY_GRADE_LABELS,
  STRUCTURAL_RARITY_LABELS,
  TRAIT_CATALOG,
  hasCatalogFields,
  itemFieldApplicability,
  normalizeTraitIds,
  traitChoices,
} from "../src/data/item-catalog";

describe("présentation conditionnelle des Items 0.3.2", () => {
  it("déclare explicitement l’applicabilité des 26 types", () => {
    expect(Object.keys(ITEM_FIELD_APPLICABILITY).sort()).toEqual(
      [...ITEM_TYPES].sort(),
    );
  });

  it("ne présente aucun faux champ de catalogue sur une Ascendance", () => {
    const fields = itemFieldApplicability("ancestry");
    expect(hasCatalogFields(fields)).toBe(false);
    expect(fields).toEqual({
      level: false,
      quality: false,
      rarity: false,
      legality: false,
      manufacturer: false,
      referencePrice: false,
    });
  });

  it("limite le Talent au Niveau et conserve le catalogue matériel complet", () => {
    expect(itemFieldApplicability("talent")).toMatchObject({
      level: true,
      quality: false,
      referencePrice: false,
    });
    expect(itemFieldApplicability("weapon")).toEqual({
      level: true,
      quality: true,
      rarity: true,
      legality: true,
      manufacturer: true,
      referencePrice: true,
    });
  });

  it("utilise le vocabulaire canonique et une sélection multiple durable", () => {
    expect(TRAIT_CATALOG.length).toBeGreaterThan(200);
    expect(normalizeTraitIds(["Humain", "Survie", "Humain"])).toEqual([
      "humain",
      "survie",
    ]);
    expect(
      traitChoices(["humain", "ancien libre"]).find(
        ({ value }) => value === "humain",
      ),
    ).toMatchObject({ label: "Humain", selected: true, legacy: false });
    expect(
      traitChoices(["ancien libre"]).find(
        ({ value }) => value === "ancien libre",
      ),
    ).toMatchObject({ selected: true, legacy: true });
  });

  it("affiche les noms de qualité et de rareté sans changer leurs grades", () => {
    expect(QUALITY_GRADE_LABELS).toEqual([
      "Improvisée",
      "Rustique",
      "Standard",
      "Précision",
      "Supérieure",
      "Exceptionnelle",
    ]);
    expect(STRUCTURAL_RARITY_LABELS).toEqual([
      "Ubiquitaire",
      "Commune",
      "Spécialisée",
      "Peu commune",
      "Rare",
      "Exceptionnelle",
      "Singulière",
    ]);
  });
});
