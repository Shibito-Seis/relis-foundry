import { describe, expect, it } from "vitest";
import { initialPhysicalState } from "../src/data/item-defaults";
import type { InventoryItemLike } from "../src/rules/inventory";
import {
  ammunitionCompatibility,
  cashSummary,
  energyCompatibility,
  hostPortSummary,
  magazineCompatibility,
  materialDiagnostics,
  materialStatus,
  nestInstalledRows,
  powerSourceCompatibility,
} from "../src/rules/personal-material";

function item(
  id: string,
  type: string,
  system: Record<string, any> = {},
): InventoryItemLike {
  return {
    id,
    uuid: `Actor.test.Item.${id}`,
    name: id,
    type,
    system: {
      meta: { relisId: `ITM-${id}` },
      physical: initialPhysicalState(),
      ...system,
    },
  };
}

describe("10-E4-P — profils matériels personnels", () => {
  it("refuse une compatibilité fondée seulement sur la famille", () => {
    const ammunition = item("ammo", "ammunition", {
      ammunitionProfile: {
        family: "cinétique",
        chamberId: "CH-9X",
        pressureClass: "P2",
        feedInterfaces: ["MAG-A"],
      },
    });
    const weapon = item("weapon", "weapon", {
      weaponProfile: {
        family: "cinétique",
        chamberId: "CH-9Y",
        pressureClass: "P2",
        feedInterface: "MAG-A",
      },
    });
    expect(ammunitionCompatibility(ammunition, weapon).join(" ")).toMatch(
      /Chambre incompatible/,
    );
    weapon.system.weaponProfile.chamberId = "CH-9X";
    expect(ammunitionCompatibility(ammunition, weapon)).toEqual([]);
    weapon.system.weaponProfile.feedInterface = "MAG-B";
    expect(ammunitionCompatibility(ammunition, weapon).join(" ")).toMatch(
      /Interface MAG-B/,
    );
  });

  it("contrôle chambre, pression et interface d’un chargeur détachable", () => {
    const magazine = item("mag", "container", {
      containerKind: "magazine",
      magazineProfile: {
        chamberId: "CH-A",
        pressureClass: "P1",
        interfaceId: "IF-A",
        capacity: 10,
      },
    });
    const weapon = item("weapon", "weapon", {
      weaponProfile: {
        feedKind: "detachable",
        chamberId: "CH-A",
        pressureClass: "P1",
        feedInterface: "IF-B",
      },
    });
    expect(magazineCompatibility(magazine, weapon).join(" ")).toMatch(
      /interface incompatible/,
    );
    weapon.system.weaponProfile.feedInterface = "IF-A";
    expect(magazineCompatibility(magazine, weapon)).toEqual([]);
    const ammunition = item("ammo", "ammunition", {
      ammunitionProfile: {
        chamberId: "CH-A",
        pressureClass: "P1",
        feedInterfaces: [],
      },
    });
    expect(ammunitionCompatibility(ammunition, magazine).join(" ")).toMatch(
      /Interface IF-A/,
    );
  });

  it("diagnostique les profils incomplets sans inventer de valeur", () => {
    const weapon = item("weapon", "weapon", {
      weaponProfile: { feedKind: "internal", loadSequence: [] },
    });
    expect(
      materialDiagnostics(weapon)
        .map((entry) => entry.message)
        .join(" "),
    ).toMatch(/chambre.*pression.*Capacité/i);
    const armor = item("armor", "armor", {
      physical: {
        ...initialPhysicalState(),
        durability: {
          structureCurrent: 11,
          structureMaximum: 10,
          breakingThreshold: 12,
        },
      },
    });
    expect(
      materialDiagnostics(armor)
        .map((entry) => entry.message)
        .join(" "),
    ).toMatch(/dépasse le maximum.*Seuil de brisure/i);
  });

  it("conserve les devises physiques distinctes et ignore les ressources bancaires", () => {
    const credits = item("credits", "resource", {
      physical: { ...initialPhysicalState(), quantity: 12 },
      currencyProfile: {
        physicalCash: true,
        currencyId: "CRD",
        currencyLabel: "Crédits",
        denomination: 5,
      },
    });
    const units = item("units", "resource", {
      physical: { ...initialPhysicalState(), quantity: 3 },
      currencyProfile: {
        physicalCash: true,
        currencyId: "UNIT",
        currencyLabel: "Unités",
        denomination: 2,
      },
    });
    const bank = item("bank", "resource", {
      physical: { ...initialPhysicalState(), quantity: 999 },
      currencyProfile: {
        physicalCash: false,
        currencyId: "CRD",
        denomination: 1,
      },
    });
    const ground = item("ground", "resource", {
      physical: {
        ...initialPhysicalState(),
        quantity: 100,
        equipState: "ground",
      },
      currencyProfile: {
        physicalCash: true,
        currencyId: "CRD",
        currencyLabel: "Crédits",
        denomination: 1,
      },
    });
    const otherBody = item("other", "resource", {
      physical: {
        ...initialPhysicalState(),
        quantity: 100,
        bodyId: "secondary",
      },
      currencyProfile: {
        physicalCash: true,
        currencyId: "CRD",
        currencyLabel: "Crédits",
        denomination: 1,
      },
    });
    expect(
      cashSummary([credits, units, bank, ground, otherBody], "primary"),
    ).toEqual([
      { id: "CRD", label: "Crédits", amount: 60, itemIds: ["credits"] },
      { id: "UNIT", label: "Unités", amount: 6, itemIds: ["units"] },
    ]);
  });

  it("imbrique modules, chargeur et munitions sous leur hôte sans les dupliquer", () => {
    const host = item("host", "weapon", {
      physical: {
        ...initialPhysicalState(),
        equipmentProfile: { providedSlots: { internal: 1 } },
      },
    });
    const magazine = item("magazine", "container", {
      containerKind: "magazine",
      physical: {
        ...initialPhysicalState(),
        equipState: "installed",
        hostRef: { uuid: host.uuid },
        equipmentProfile: { requiredSlots: { internal: 1 } },
      },
    });
    const ammunition = item("ammunition", "ammunition", {
      physical: {
        ...initialPhysicalState(),
        containerRef: { uuid: magazine.uuid },
      },
      ammunitionProfile: { loadOrder: 1 },
    });
    const rows = [host, magazine, ammunition].map((entry) => ({
      id: entry.id,
      name: entry.name,
      type: entry.type,
      depth: 0,
      parentId: entry.id === ammunition.id ? magazine.id : null,
    }));
    expect(nestInstalledRows(rows, [host, magazine, ammunition])).toEqual([
      expect.objectContaining({ id: "host", depth: 0, parentId: null }),
      expect.objectContaining({ id: "magazine", depth: 1, parentId: "host" }),
      expect.objectContaining({
        id: "ammunition",
        depth: 2,
        parentId: "magazine",
      }),
    ]);
    expect(hostPortSummary([host, magazine, ammunition], host)[0]).toEqual(
      expect.objectContaining({
        key: "internal",
        capacity: 1,
        used: 1,
        free: 0,
      }),
    );
  });

  it("présente explicitement un chargeur vide sans fausse réserve sur l’arme", () => {
    const weapon = item("weapon", "weapon", {
      weaponProfile: { feedKind: "detachable" },
      energyProfile: { kind: "internal", current: 3, maximum: 12 },
    });
    expect(materialStatus(weapon, [weapon])).toEqual(["Chargeur vide"]);
  });

  it("transfère seulement entre réserves énergétiques de même format", () => {
    const source = item("battery", "equipment", {
      energyProfile: {
        kind: "battery",
        format: "BAT-L",
        outputClass: "P2",
        current: 12,
        maximum: 12,
      },
    });
    const target = item("device", "equipment", {
      energyProfile: {
        kind: "internal",
        format: "BAT-S",
        powerClass: "P2",
        current: 0,
        maximum: 6,
      },
    });
    expect(energyCompatibility(source, target).join(" ")).toMatch(
      /Format incompatible/,
    );
    target.system.energyProfile.format = "BAT-L";
    expect(energyCompatibility(source, target)).toEqual([]);
    target.system.energyProfile.powerClass = "P3";
    expect(energyCompatibility(source, target).join(" ")).toMatch(
      /Classe de puissance incompatible/,
    );
  });

  it("installe une batterie compatible sans transférer ses CE dans l’arme", () => {
    const weapon = item("laser", "weapon", {
      weaponProfile: {
        familyId: "energyLongGun",
        feedKind: "energy",
        batterySlotCount: 1,
      },
      energyProfile: {
        formatId: "standard",
        format: "standard",
        powerClassId: "standard",
        powerClass: "standard",
        technologyId: "laser",
        technology: "laser",
        interfaceId: "cell",
      },
    });
    const battery = item("battery", "resource", {
      energyProfile: {
        kind: "battery",
        formatId: "standard",
        format: "standard",
        outputClass: "standard",
        technologyId: "laser",
        technology: "laser",
        interfaceId: "cell",
        current: 17,
        maximum: 24,
      },
    });
    expect(
      powerSourceCompatibility(battery, weapon, [weapon, battery]),
    ).toEqual([]);
    battery.system.physical.equipState = "installed";
    battery.system.physical.hostRef = { uuid: weapon.uuid };
    expect(materialStatus(weapon, [weapon, battery])).toContain(
      "Batterie : battery (17/24 CE)",
    );
    expect(energyCompatibility(battery, weapon).join(" ")).toMatch(
      /ne stocke aucun CE transféré/,
    );
  });

  it("installe seulement un cristal de Prana incolore dans la techno-lame dédiée", () => {
    const blade = item("blade", "weapon", {
      weaponProfile: {
        familyId: "martialTechnoBlade",
        technoBladeVariant: "pranaCrystal",
        feedKind: "pranaCrystal",
      },
    });
    const crystal = item("crystal", "resource", {
      energyProfile: {
        kind: "pranaCrystal",
        technologyId: "pranaCrystal",
        interfaceId: "crystalSocket",
      },
    });
    expect(powerSourceCompatibility(crystal, blade, [blade, crystal])).toEqual(
      [],
    );
    crystal.system.physical.equipState = "installed";
    crystal.system.physical.hostRef = { uuid: blade.uuid };
    expect(materialStatus(blade, [blade, crystal])).toContain(
      "Cristal de Prana : crystal · incolore, non accordé",
    );
    expect(energyCompatibility(crystal, blade).join(" ")).toMatch(
      /Prana|aucun CE/i,
    );
  });

  it("ne demande une capacité qu’au magasin interne", () => {
    const detachable = item("pistol", "weapon", {
      weaponProfile: {
        familyId: "handgun",
        feedKind: "detachable",
        chamberId: "BAL-9P",
        pressureClass: "standard",
        feedInterface: "boxMagazine",
      },
    });
    expect(
      materialDiagnostics(detachable)
        .map(({ message }) => message)
        .join(" "),
    ).not.toMatch(/Capacité/);
    detachable.system.weaponProfile.feedKind = "internal";
    expect(
      materialDiagnostics(detachable)
        .map(({ message }) => message)
        .join(" "),
    ).toMatch(/Capacité positive.*magasin interne/i);
  });
});
