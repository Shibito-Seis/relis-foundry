import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const specializationRoot = path.join(
  root,
  "content",
  "personal",
  "packs",
  "progression-specializations",
);
const reportPath = path.join(
  root,
  "docs",
  "10-K2-P-audit-descriptions-specialisations.md",
);
const outputDirectory = path.join(
  root,
  "content",
  "personal",
  "catalogs",
  "progression-specialization-talents",
);
const outputPath = path.join(outputDirectory, "catalogs.json");

const LEVELS = [1, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 21, 23, 25, 28, 30];

const SKILL_IDS = {
  Acrobaties: "acrobatics",
  "Armes lourdes": "heavyWeapons",
  Athlétisme: "athletics",
  Canalisation: "channeling",
  Commandement: "command",
  Commerce: "commerce",
  Culture: "culture",
  Diplomatie: "diplomacy",
  Discrétion: "stealth",
  Endurance: "endurance",
  Ingénierie: "engineering",
  Informatique: "computing",
  Intimidation: "intimidation",
  Investigation: "investigation",
  Médecine: "medicine",
  Mêlée: "melee",
  Navigation: "navigation",
  Pilotage: "piloting",
  "Sang-froid": "composure",
  Sciences: "science",
  Survie: "survival",
  "Systèmes de vaisseau": "shipSystems",
  "Techno-magie": "technomagic",
  Tir: "shooting",
  Tromperie: "deception",
};

const PATH_RULES = {
  Bretteur: [
    ["Mêlée", "Sang-froid", "offense", "defense"],
    ["Mêlée", "Sang-froid", "defense", "support"],
    ["Mêlée", "Athlétisme", "offense", "control"],
    ["Acrobaties", "Mêlée", "mobility", "offense"],
    ["Mêlée", "Acrobaties", "defense", "control"],
    ["Techno-magie", "Mêlée", "energy", "offense"],
    ["Canalisation", "Mêlée", "energy", "offense"],
  ],
  Briseur: [
    ["Mêlée", "Athlétisme", "offense", "control"],
    ["Mêlée", "Endurance", "defense", "support"],
    ["Athlétisme", "Mêlée", "control", "offense"],
    ["Endurance", "Sang-froid", "offense", "defense"],
    ["Mêlée", "Armes lourdes", "offense", "control"],
    ["Athlétisme", "Endurance", "defense", "utility"],
    ["Survie", "Mêlée", "control", "offense"],
  ],
  Tireur: [
    ["Tir", "Investigation", "offense", "control"],
    ["Tir", "Acrobaties", "offense", "mobility"],
    ["Tir", "Discrétion", "stealth", "offense"],
    ["Tir", "Acrobaties", "offense", "mobility"],
    ["Tir", "Armes lourdes", "control", "offense"],
    ["Armes lourdes", "Tir", "offense", "control"],
    ["Techno-magie", "Tir", "energy", "offense"],
  ],
  Soldat: [
    ["Tir", "Commandement", "control", "support"],
    ["Discrétion", "Tir", "stealth", "offense"],
    ["Armes lourdes", "Sang-froid", "control", "offense"],
    ["Mêlée", "Endurance", "defense", "support"],
    ["Commandement", "Sang-froid", "command", "support"],
    ["Tir", "Mêlée", "offense", "mobility"],
    ["Endurance", "Armes lourdes", "defense", "offense"],
  ],
  Médecin: [
    ["Médecine", "Sang-froid", "medical", "support"],
    ["Médecine", "Sang-froid", "medical", "technical"],
    ["Sciences", "Médecine", "utility", "medical"],
    ["Médecine", "Systèmes de vaisseau", "medical", "technical"],
    ["Médecine", "Sciences", "medical", "control"],
    ["Médecine", "Ingénierie", "technical", "medical"],
    ["Canalisation", "Médecine", "energy", "medical"],
  ],
  Channeler: [
    ["Canalisation", "Sciences", "energy", "offense"],
    ["Canalisation", "Endurance", "energy", "offense"],
    ["Canalisation", "Sang-froid", "defense", "energy"],
    ["Canalisation", "Médecine", "medical", "energy"],
    ["Canalisation", "Investigation", "control", "energy"],
    ["Canalisation", "Sang-froid", "energy", "control"],
    ["Canalisation", "Culture", "energy", "support"],
  ],
  "Techno-mage": [
    ["Techno-magie", "Canalisation", "energy", "technical"],
    ["Techno-magie", "Tir", "energy", "offense"],
    ["Techno-magie", "Systèmes de vaisseau", "defense", "energy"],
    ["Techno-magie", "Investigation", "utility", "energy"],
    ["Techno-magie", "Systèmes de vaisseau", "technical", "energy"],
    ["Techno-magie", "Sciences", "energy", "utility"],
    ["Techno-magie", "Sang-froid", "energy", "control"],
  ],
  Ingénieur: [
    ["Ingénierie", "Systèmes de vaisseau", "technical", "support"],
    ["Systèmes de vaisseau", "Ingénierie", "technical", "utility"],
    ["Ingénierie", "Informatique", "technical", "control"],
    ["Ingénierie", "Informatique", "technical", "support"],
    ["Ingénierie", "Discrétion", "control", "technical"],
    ["Ingénierie", "Survie", "technical", "utility"],
    ["Ingénierie", "Armes lourdes", "technical", "offense"],
  ],
  Pilote: [
    ["Pilotage", "Navigation", "pilot", "utility"],
    ["Pilotage", "Tir", "pilot", "offense"],
    ["Pilotage", "Sang-froid", "pilot", "defense"],
    ["Pilotage", "Systèmes de vaisseau", "pilot", "control"],
    ["Pilotage", "Armes lourdes", "pilot", "offense"],
    ["Pilotage", "Informatique", "pilot", "technical"],
    ["Pilotage", "Survie", "pilot", "utility"],
  ],
  Interfaceur: [
    ["Informatique", "Investigation", "technical", "offense"],
    ["Informatique", "Sang-froid", "defense", "technical"],
    ["Diplomatie", "Informatique", "support", "technical"],
    ["Informatique", "Systèmes de vaisseau", "technical", "utility"],
    ["Informatique", "Ingénierie", "technical", "control"],
    ["Systèmes de vaisseau", "Informatique", "control", "technical"],
    ["Techno-magie", "Informatique", "energy", "technical"],
  ],
  Explorateur: [
    ["Survie", "Endurance", "utility", "defense"],
    ["Discrétion", "Investigation", "stealth", "utility"],
    ["Navigation", "Investigation", "utility", "technical"],
    ["Survie", "Investigation", "utility", "control"],
    ["Sciences", "Investigation", "utility", "technical"],
    ["Investigation", "Canalisation", "utility", "energy"],
    ["Survie", "Ingénierie", "utility", "support"],
  ],
  Émissaire: [
    ["Commandement", "Sang-froid", "command", "support"],
    ["Diplomatie", "Culture", "support", "control"],
    ["Commerce", "Diplomatie", "utility", "support"],
    ["Tromperie", "Investigation", "control", "stealth"],
    ["Commandement", "Diplomatie", "support", "command"],
    ["Diplomatie", "Culture", "support", "utility"],
    ["Culture", "Tromperie", "command", "control"],
  ],
};

function jsonFiles(directory) {
  const files = [];
  const visit = (current) => {
    for (const entry of fs
      .readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "fr"))) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile() && entry.name.endsWith(".json"))
        files.push(absolute);
    }
  };
  visit(directory);
  return files;
}

function normalize(value) {
  return String(value).replaceAll("'", "’").trim();
}

function orientations() {
  const report = fs.readFileSync(reportPath, "utf8");
  const result = new Map();
  const sections = report.split(/^### /gmu).slice(1);
  for (const section of sections) {
    const [heading, ...body] = section.split(/\r?\n/u);
    const match = body.join("\n").match(/^- \*\*Base canonique :\*\* (.+)$/mu);
    if (match)
      result.set(normalize(heading), match[1].trim().replace(/\.$/u, ""));
  }
  return result;
}

const orientationByName = orientations();
const specializations = jsonFiles(specializationRoot)
  .map((file) => JSON.parse(fs.readFileSync(file, "utf8")))
  .sort((left, right) => left.relisId.localeCompare(right.relisId, "fr"));

const pathOffsets = new Map();
const catalogs = specializations.map((specialization) => {
  const { pathName, branchName } = specialization.system.catalog;
  const index = pathOffsets.get(pathName) ?? 0;
  pathOffsets.set(pathName, index + 1);
  const rules = PATH_RULES[pathName]?.[index];
  if (!rules)
    throw new Error(`Profil de branche absent : ${pathName} — ${branchName}.`);
  const orientation = orientationByName.get(normalize(specialization.name));
  if (!orientation)
    throw new Error(`Orientation canonique absente : ${specialization.name}.`);
  if (!SKILL_IDS[rules[0]] || !SKILL_IDS[rules[1]])
    throw new Error(
      `Compétence fermée absente : ${pathName} — ${branchName} (${rules[0]} / ${rules[1]}).`,
    );
  const orientationParts = orientation
    .split(/[,;]/u)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    specializationId: specialization.relisId,
    pathName,
    branchName,
    orientation,
    primarySkillId: SKILL_IDS[rules[0]],
    secondarySkillId: SKILL_IDS[rules[1]],
    activeAxis: orientationParts[0] ?? branchName,
    passiveAxis:
      orientationParts.slice(1).join(", ") || orientationParts[0] || branchName,
    activeProfile: rules[2],
    passiveProfile: rules[3],
  };
});

if (catalogs.length !== 84)
  throw new Error(`84 catalogues attendus, reçu ${catalogs.length}.`);
for (const [pathName, rules] of Object.entries(PATH_RULES)) {
  if (rules.length !== 7)
    throw new Error(`${pathName} doit posséder sept profils de branche.`);
  if ((pathOffsets.get(pathName) ?? 0) !== 7)
    throw new Error(`${pathName} ne possède pas sept Spécialisations sources.`);
}

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      $schema: "../../schemas/specialization-talent-catalogs.schema.json",
      format: "relis.specialization-talent-catalogs",
      formatVersion: 1,
      contentVersion: "1.4.0",
      levels: LEVELS,
      catalogs,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `${catalogs.length} catalogues écrits dans ${path.relative(root, outputPath)}.`,
);
