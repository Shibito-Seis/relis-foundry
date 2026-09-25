import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const argument = (name) => {
  const index = argv.indexOf(name);
  return index < 0 ? "" : String(argv[index + 1] ?? "");
};
const biblePath = argument("--bible");
const outputPath = argument("--output");
if (!biblePath || !outputPath || !fs.existsSync(biblePath))
  throw new Error(
    "Usage : node tools/report-k2-specializations.mjs --bible /chemin/Bible.md --output /chemin/rapport.md",
  );

const clean = (value = "") =>
  String(value)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/\s+/g, " ")
    .trim();
const slug = (value) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
const parseRow = (line) => line.split("|").slice(1, -1).map(clean);
const parseTables = (block) => {
  const tables = [];
  for (let index = 0; index < block.length - 1; index += 1) {
    if (!block[index].startsWith("|") || !/^\|[ :-]+\|/.test(block[index + 1]))
      continue;
    const header = parseRow(block[index]);
    const rows = [];
    index += 2;
    while (index < block.length && block[index].startsWith("|")) {
      rows.push(parseRow(block[index]));
      index += 1;
    }
    index -= 1;
    tables.push({ header, rows });
  }
  return tables;
};
const splitHeadings = (block, level) => {
  const marker = `${"#".repeat(level)} `;
  const starts = [];
  block.forEach((line, index) => {
    if (line.startsWith(marker) && !line.startsWith(`${marker}#`))
      starts.push(index);
  });
  return starts.map((start, index) => ({
    heading: clean(block[start].slice(marker.length)),
    lines: block.slice(start + 1, starts[index + 1] ?? block.length),
  }));
};
const headingSection = (block, heading) => {
  const marker = `#### ${heading}`;
  const start = block.findIndex((line) => line.trim() === marker);
  if (start < 0) return [];
  const next = block.findIndex(
    (line, index) => index > start && line.startsWith("#### "),
  );
  return block.slice(start + 1, next < 0 ? block.length : next);
};
const walkJson = (directory) =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return walkJson(target);
    return entry.name.endsWith(".json") ? [target] : [];
  });
const plainWords = (html) =>
  String(html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/giu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;

const lines = fs.readFileSync(biblePath, "utf8").split(/\r?\n/);
const start = lines.findIndex((line) => line.startsWith("## 9. Voies"));
const end = lines.findIndex(
  (line, index) => index > start && line.startsWith("## 10. Postes"),
);
if (start < 0 || end < 0) throw new Error("Chapitre 9 des Voies introuvable.");
const chapter = lines.slice(start, end);
const details = splitHeadings(chapter, 3).filter(({ heading }) =>
  /^9\.\d+\s+/.test(heading),
);
const loadoutTables = parseTables(chapter).filter(
  ({ header }) =>
    header[0] === "Spécialisation" && header[1] === "Paquet spécialisé",
);
if (loadoutTables.length !== 12)
  throw new Error(
    `12 tables de dotation attendues, reçu ${loadoutTables.length}.`,
  );

const sourceDirectory = path.resolve(
  "content/personal/packs/progression-specializations",
);
const currentById = new Map(
  walkJson(sourceDirectory).map((file) => {
    const entry = JSON.parse(fs.readFileSync(file, "utf8"));
    return [entry.relisId, entry];
  }),
);

const report = [
  "# 10-K2-P — Audit et propositions de description des 84 Spécialisations",
  "",
  "**Statut :** rapport de proposition ; aucune de ces descriptions n’est encore publiée dans les compendiums.",
  "",
  "## Constat",
  "",
  "Les 84 Items existent et portent leur Voie, leur dotation principale et leurs références. Leur description actuelle reste toutefois une fiche mécanique de 15 à 24 mots. La Bible fournit pour chaque branche une orientation canonique et une dotation, mais pas toujours un paragraphe narratif autonome.",
  "",
  "Les textes ci-dessous constituent donc une base courte et strictement traçable : première phrase issue de l’orientation de branche, seconde phrase issue de la dotation canonique. Ils devront être validés avant intégration.",
  "",
];

let total = 0;
for (const [pathIndex, detail] of details.slice(0, 12).entries()) {
  const pathName = clean(detail.heading.replace(/^9\.\d+\s+/, ""));
  const branches = headingSection(detail.lines, "Branches possibles").flatMap(
    (line) => {
      const match = line.match(/^[-*] \*\*([^*]+)\*\*\s*:\s*(.+)$/);
      return match ? [{ name: clean(match[1]), summary: clean(match[2]) }] : [];
    },
  );
  const loadouts = new Map(
    loadoutTables[pathIndex].rows.map((row) => [slug(row[0]), row[1]]),
  );
  if (branches.length !== 7)
    throw new Error(
      `${pathName} : 7 branches attendues, reçu ${branches.length}.`,
    );
  report.push(`## ${pathName}`, "");
  for (const [branchIndex, branch] of branches.entries()) {
    const relisId = `PRO-SPE-${String(pathIndex + 1).padStart(2, "0")}-${String(branchIndex + 1).padStart(2, "0")}-${slug(branch.name)}`;
    const current = currentById.get(relisId);
    if (!current) throw new Error(`Spécialisation absente : ${relisId}.`);
    const loadout = loadouts.get(slug(branch.name));
    if (!loadout)
      throw new Error(`Dotation absente : ${pathName} — ${branch.name}.`);
    total += 1;
    report.push(
      `### ${pathName} — ${branch.name}`,
      "",
      `- **État actuel :** ${plainWords(current.system.description)} mots ; Voie et dotation uniquement.`,
      `- **Base canonique :** ${branch.summary}`,
      `- **Proposition :** La branche **${branch.name}** de la Voie **${pathName}** suit l’orientation canonique « ${branch.summary.replace(/[.]$/u, "")} ». Sa dotation principale canonique comprend : ${loadout}`,
      "",
    );
  }
}
if (total !== 84)
  throw new Error(`84 Spécialisations attendues, reçu ${total}.`);
report.push(
  "## Recommandation d’intégration",
  "",
  "1. Valider ou corriger ces 84 bases par Voie.",
  "2. Transformer les formulations approuvées en descriptions naturelles de deux ou trois paragraphes, sans copier les caractéristiques déjà structurées.",
  "3. Conserver séparément la dotation, les prérequis et les futurs effets automatisés.",
  "4. Ajouter ensuite un contrôle automatisé imposant une description narrative minimale à chaque Spécialisation.",
  "",
  "Aucun Journal développé n’est anticipé ici : les Journaux de création restent placés en 10-D3.",
  "",
);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${report.join("\n")}\n`);
console.log(`Rapport écrit : ${outputPath} (${total} Spécialisations).`);
