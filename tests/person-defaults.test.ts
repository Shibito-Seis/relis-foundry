import { describe, expect, it } from "vitest";

import {
  initialBody,
  initialPresentation,
  initialReference,
  normalizePersonSource,
} from "../src/data/person-defaults";

describe("valeurs initiales imbriquées Personnage et PNJ", () => {
  it("fournit chaque collection obligatoire du Corps initial", () => {
    expect(initialBody()).toMatchObject({
      id: "primary",
      criticalFunctions: [],
      locations: [
        {
          id: "core",
          sort: 0,
          status: "active",
          value: "Zone centrale",
          visibility: "document",
        },
      ],
      needs: [],
      integratedItemRefs: [],
    });
  });

  it("fournit les relations obligatoires de la Présentation initiale", () => {
    expect(initialPresentation()).toMatchObject({
      id: "identity",
      bodyIds: ["primary"],
      sourceRef: initialReference(),
      associatedPresentationId: "",
      active: true,
    });
  });

  it("retourne des objets neufs afin d’éviter toute mutation partagée", () => {
    expect(initialBody()).not.toBe(initialBody());
    expect(initialPresentation()).not.toBe(initialPresentation());
    expect(initialReference()).not.toBe(initialReference());
  });

  it("répare une source 0.2.2 partielle avant sa validation", () => {
    const source: Record<string, any> = {
      bodies: [{ id: "legacy", name: "Corps conservé" }],
      presentations: [{ id: "legacy-portrait", active: true }],
    };

    normalizePersonSource(source);

    expect(source.bodies[0]).toMatchObject({
      id: "legacy",
      name: "Corps conservé",
      criticalFunctions: [],
      needs: [],
      integratedItemRefs: [],
    });
    expect(source.bodies[0].locations).toHaveLength(1);
    expect(source.presentations[0]).toMatchObject({
      id: "legacy-portrait",
      sourceRef: initialReference(),
      associatedPresentationId: "",
      active: true,
    });
  });

  it("crée les deux collections minimales pour une ancienne source", () => {
    const source: Record<string, any> = {};
    normalizePersonSource(source);
    expect(source.bodies).toHaveLength(1);
    expect(source.presentations).toHaveLength(1);
    expect(source.activeBodyId).toBe("primary");
  });
});
