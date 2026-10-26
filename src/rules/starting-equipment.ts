export interface StartingEquipmentPackageContent {
  relisId: string;
  quantity: number;
}

export interface StartingEquipmentPackage {
  id: string;
  label: string;
  cost: number;
  summary: string;
  contents: StartingEquipmentPackageContent[];
  levelOneAvailable: boolean;
  unavailableReason: string;
}

export const STARTING_EQUIPMENT_PACKAGES: StartingEquipmentPackage[] = [
  {
    id: "civil-prudent",
    label: "Civil prudent",
    cost: 2_500,
    summary:
      "Gilet civil, pistolet de service, deux chargeurs garnis, nécessaire d’hygiène et communicateur civil.",
    contents: [
      { relisId: "MAT-ARM-011-GILET-DE-PROTECTION-CIVIL", quantity: 1 },
      { relisId: "MAT-WPN-032-PISTOLET-DE-SERVICE", quantity: 1 },
      { relisId: "MAT-CTR-CHG-002-PISTOLET-DE-SERVICE", quantity: 2 },
      { relisId: "BAL-9P", quantity: 24 },
      { relisId: "UTL-043", quantity: 1 },
      { relisId: "UTL-049", quantity: 1 },
    ],
    levelOneAvailable: true,
    unavailableReason: "",
  },
  {
    id: "securite",
    label: "Sécurité",
    cost: 4_500,
    summary:
      "Gilet balistique, pistolet automatique, deux recharges et casque balistique.",
    contents: [],
    levelOneAvailable: false,
    unavailableReason:
      "Le pistolet automatique canonique est de niveau 3 ; ce paquet dépasse donc la limite de création niveau 1.",
  },
  {
    id: "eclaireur",
    label: "Éclaireur",
    cost: 4_800,
    summary:
      "Armure d’éclaireur, carabine civile, deux recharges et capteurs simples.",
    contents: [],
    levelOneAvailable: false,
    unavailableReason:
      "L’armure d’éclaireur canonique est de niveau 2 ; ce paquet dépasse donc la limite de création niveau 1.",
  },
  {
    id: "technicien",
    label: "Technicien",
    cost: 4_000,
    summary:
      "Tenue rembourrée, pistolet de poche, trousse technique et batterie standard.",
    contents: [
      { relisId: "MAT-ARM-001-TENUE-REMBOURREE", quantity: 1 },
      { relisId: "MAT-WPN-031-PISTOLET-DE-POCHE", quantity: 1 },
      { relisId: "UTL-001", quantity: 1 },
      { relisId: "MAT-RES-BAT-003-BATTERIE-STANDARD", quantity: 1 },
    ],
    levelOneAvailable: true,
    unavailableReason: "",
  },
  {
    id: "medecin-terrain",
    label: "Médecin de terrain",
    cost: 4_800,
    summary:
      "Protection médicale légère, projecteur de dards et consommables de soin.",
    contents: [],
    levelOneAvailable: false,
    unavailableReason:
      "La protection médicale et le projecteur de dards canoniques sont de niveau 2.",
  },
  {
    id: "pilote",
    label: "Pilote",
    cost: 4_800,
    summary:
      "Combinaison blindée de pilote, casque ou interface, arme de poing et cellule.",
    contents: [],
    levelOneAvailable: false,
    unavailableReason:
      "La combinaison et l’interface de pilote canoniques sont de niveau 2.",
  },
  {
    id: "operateur-energetique",
    label: "Opérateur énergétique",
    cost: 5_000,
    summary:
      "Tissu anti-laser, pistolet laser, batterie et protection énergétique légère.",
    contents: [],
    levelOneAvailable: false,
    unavailableReason:
      "Le pistolet laser canonique est de niveau 2 ; ce paquet dépasse donc la limite de création niveau 1.",
  },
  {
    id: "survie-eva",
    label: "Survie EVA",
    cost: 4_500,
    summary:
      "Combinaison orbitale d’urgence, casque antichoc, trousse technique et pistolet compact.",
    contents: [
      {
        relisId: "MAT-ARM-073-COMBINAISON-ORBITALE-D-URGENCE",
        quantity: 1,
      },
      { relisId: "MAT-ARM-055-CASQUE-CIVIL-ANTICHOC", quantity: 1 },
      { relisId: "UTL-001", quantity: 1 },
      { relisId: "MAT-WPN-031-PISTOLET-DE-POCHE", quantity: 1 },
    ],
    levelOneAvailable: true,
    unavailableReason: "",
  },
];

export function startingEquipmentPackage(
  id: string,
): StartingEquipmentPackage | undefined {
  return STARTING_EQUIPMENT_PACKAGES.find((entry) => entry.id === id);
}
