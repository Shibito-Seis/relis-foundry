import fs from "node:fs";
import path from "node:path";

const argv = process.argv.slice(2);
const bibleIndex = argv.indexOf("--bible");
const biblePath = bibleIndex >= 0 ? argv[bibleIndex + 1] : "";
const projectRoot = process.cwd();

if (!biblePath || !fs.existsSync(biblePath)) {
  throw new Error(
    "Usage : node tools/import-k2-bible.mjs --bible /chemin/RE-LIS_Bible_v163.md",
  );
}

const lines = fs.readFileSync(biblePath, "utf8").split(/\r?\n/);
const outputRoot = path.join(projectRoot, "content", "personal", "packs");
const entries = [];

function clean(value = "") {
  return String(value)
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/<br\s*\/?>/gi, " ; ")
    .replace(/\s+/g, " ")
    .trim();
}

function slug(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toUpperCase();
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function inlineHtml(value = "") {
  return escapeHtml(clean(value));
}

function blockHtml(block) {
  const paragraphs = [];
  let current = [];
  const flush = () => {
    if (!current.length) return;
    paragraphs.push(`<p>${inlineHtml(current.join(" "))}</p>`);
    current = [];
  };
  for (const line of block) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (/^#{1,6} /.test(line) || /^\|/.test(line)) continue;
    if (/^[-*] /.test(line)) {
      flush();
      paragraphs.push(`<p>• ${inlineHtml(line.replace(/^[-*] /, ""))}</p>`);
      continue;
    }
    if (/^\*\*[^*]+:\*\*/.test(line)) continue;
    current.push(line);
  }
  flush();
  return paragraphs.join("\n");
}

function descriptiveHtml(block) {
  const parts = [];
  let paragraph = [];
  let list = [];
  const flushParagraph = () => {
    if (!paragraph.length) return;
    parts.push(`<p>${inlineHtml(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (!list.length) return;
    parts.push(
      `<ul>${list.map((entry) => `<li>${inlineHtml(entry)}</li>`).join("")}</ul>`,
    );
    list = [];
  };
  for (const source of block) {
    const line = source.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^#{1,6} /.test(line) || /^\|/.test(line)) continue;
    if (/^[-*] /.test(line)) {
      flushParagraph();
      list.push(line.replace(/^[-*] /, ""));
      continue;
    }
    flushList();
    if (/^[^.!?]+:$/.test(clean(line))) {
      flushParagraph();
      parts.push(`<h3>${inlineHtml(line.replace(/:$/, ""))}</h3>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushList();
  return parts.join("\n");
}

function headingSection(block, heading, level = 4) {
  const marker = `${"#".repeat(level)} ${heading}`;
  const start = block.findIndex((line) => line.trim() === marker);
  if (start < 0) return [];
  const next = block.findIndex(
    (line, index) => index > start && line.startsWith(`${"#".repeat(level)} `),
  );
  return block.slice(start + 1, next < 0 ? block.length : next);
}

function bulletDefinitions(block) {
  return block.flatMap((line) => {
    const match = line.match(/^[-*] \*\*([^*]+)\*\*\s*:\s*(.+)$/);
    return match ? [{ name: clean(match[1]), summary: clean(match[2]) }] : [];
  });
}

function findLine(prefix, from = 0) {
  return lines.findIndex(
    (line, index) => index >= from && line.startsWith(prefix),
  );
}

function section(startPrefix, endPrefix, from = 0) {
  const start = findLine(startPrefix, from);
  if (start < 0) throw new Error(`Section absente : ${startPrefix}`);
  const end = endPrefix ? findLine(endPrefix, start + 1) : lines.length;
  return {
    start,
    end: end < 0 ? lines.length : end,
    lines: lines.slice(start, end < 0 ? lines.length : end),
  };
}

function parseRow(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => clean(cell));
}

function parseTables(block) {
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
}

function metadata(block) {
  const result = {};
  for (const line of block) {
    const matches = [
      ...line.matchAll(/\*\*([^*]+?)\s*:\*\*\s*(.*?)(?=\s+—\s+\*\*|\s{2,}|$)/g),
    ];
    for (const match of matches) result[clean(match[1])] = clean(match[2]);
  }
  return result;
}

function splitHeadings(block, level) {
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
}

function reference(relisId, type, labelSnapshot = "") {
  return {
    relisId,
    uuid: "",
    documentName: "Item",
    type,
    state: "resolved",
    labelSnapshot,
    missingPolicy: "diagnose",
  };
}

function commonSystem(description, catalog = {}) {
  return {
    description,
    traits: [],
    requirementRefs: [],
    effectRefs: [],
    catalog,
  };
}

function add(pack, entry) {
  if (entries.some((candidate) => candidate.relisId === entry.relisId))
    throw new Error(`relisId dupliqué pendant l’import : ${entry.relisId}`);
  entries.push({ pack, ...entry });
}

// ---------------------------------------------------------------------------
// Création
// ---------------------------------------------------------------------------

const ancestrySection = section("## 5. Ascendances jouables", "### 5.13 ");
const ancestryTable = parseTables(ancestrySection.lines).find(
  (table) => table.header[0] === "Ascendance",
);
if (!ancestryTable) throw new Error("Table canonique des Ascendances absente.");

const ancestryRows = ancestryTable.rows.filter((row) => row[0] !== "Total");
const ancestryDetails = splitHeadings(ancestrySection.lines, 3).filter(
  ({ heading }) => /^5\.\d+\s+/.test(heading),
);
const ancestryDetail = (number) =>
  ancestryDetails.find(({ heading }) => heading.startsWith(`5.${number} `));
const ancestryLoreNumbers = {
  Humain: 1,
  Elman: 2,
  "Demi-Beastkin": 4,
  Elfe: 5,
  "Demi-Elfe": 6,
  Nain: 7,
  "Demi-Nain": 8,
  Gnome: 9,
  "Demi-Gnome": 10,
  IAA: 11,
  Esman: 12,
};
const beastkinDetail = ancestryDetail(3);
const beastkinIdentityHtml = (name, rationale) => {
  const detailLines = beastkinDetail?.lines ?? [];
  const roleStart = detailLines.findIndex(
    (line) => clean(line) === "Rôle mécanique envisagé :",
  );
  const roleLines = roleStart < 0 ? [] : detailLines.slice(roleStart + 1);
  return [
    "<p>Les Beastkins sont des humanoïdes à traits animaux marqués. Leur lignée peut exprimer des sens améliorés, des armes naturelles ou des capacités liées au mouvement et à l’environnement.</p>",
    `<p><strong>Identité de la lignée ${inlineHtml(name)} :</strong> ${inlineHtml(rationale)}</p>`,
    roleLines.length
      ? `<h3>Héritage Beastkin</h3>\n${descriptiveHtml(roleLines)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
};
for (const [index, row] of ancestryRows.entries()) {
  const name = row[0];
  const loreNumber = ancestryLoreNumbers[name];
  const lore = loreNumber
    ? descriptiveHtml(ancestryDetail(loreNumber)?.lines ?? [])
    : "";
  const description = name.startsWith("Beastkin ")
    ? beastkinIdentityHtml(name, row[3])
    : lore;
  add("creation", {
    relisId: `CRE-ANC-${String(index + 1).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "ancestry",
    tags: ["creation", "ascendance"],
    system: commonSystem(
      `${description}\n<h3>Profil d’Ascendance</h3>\n<p><strong>Bonus d’Attribut :</strong> ${inlineHtml(row[1])}</p>\n<p><strong>Malus d’Attribut :</strong> ${inlineHtml(row[2])}</p>\n<p><strong>Logique :</strong> ${inlineHtml(row[3])}</p>`,
      {
        kind: "ancestry",
        sourceSection: "5",
        attributeBonuses: row[1],
        attributePenalty: row[2],
        rationale: row[3],
        selectable: true,
      },
    ),
  });
}

add("creation", {
  relisId: "CRE-ANC-000-BEASTKIN",
  name: "Beastkin",
  type: "ancestry",
  tags: ["creation", "ascendance", "beastkin", "groupe"],
  system: commonSystem(
    `${descriptiveHtml(beastkinDetail?.lines ?? [])}\n<h3>Choix de lignée</h3>\n<p>Cette entrée représente la famille Beastkin. Le personnage choisit une lignée Beastkin canonique ; la fiche parente ne fournit pas de profil d’Attribut autonome.</p>`,
    {
      kind: "ancestry-group",
      sourceSection: "5.3 et 5.16",
      selectable: false,
      memberNames: ancestryRows
        .map((row) => row[0])
        .filter((name) => name.startsWith("Beastkin ")),
    },
  ),
});

const profiles = section("## 6. Profils", "## 7. Origines");
for (const table of parseTables(profiles.lines)) {
  if (table.header[0] !== "Profil") continue;
  for (const row of table.rows) {
    const index =
      entries.filter((entry) => entry.type === "profile").length + 1;
    add("creation", {
      relisId: `CRE-PRO-${String(index).padStart(3, "0")}-${slug(row[0])}`,
      name: row[0],
      type: "profile",
      tags: ["creation", "profil"],
      system: commonSystem(
        `<p><strong>Attribut standard :</strong> ${inlineHtml(row[1])}</p>\n<p><strong>Profil marqué :</strong> ${inlineHtml(row[2])}</p>\n<p><strong>Compétences possibles :</strong> ${inlineHtml(row[3])}</p>\n<p><strong>Avantage typique :</strong> ${inlineHtml(row[4])}</p>`,
        {
          kind: "profile",
          sourceSection: "6",
          standardAttributes: row[1].split(",").map(clean),
          markedProfile: row[2],
          skillChoices: row[3].split(",").map(clean),
          typicalBenefit: row[4],
          qualifiedSkillChoices: 2,
          skillTalentLevel: 1,
        },
      ),
    });
  }
}

const origins = section("## 7. Origines", "## 8. Atouts");
const originTables = parseTables(origins.lines);
const originKinds = [
  ["Milieu social", "milieu-social"],
  ["Affiliation ou communauté", "affiliation"],
  ["Condition d’embarquement", "embarquement"],
  ["Origine complète", "exemple-complet"],
];
for (const [header, kind] of originKinds) {
  const table = originTables.find(
    (candidate) => candidate.header[0] === header,
  );
  if (!table) throw new Error(`Table d’Origines absente : ${header}`);
  table.rows.forEach((row, index) => {
    const code =
      kind === "milieu-social"
        ? "MIL"
        : kind === "affiliation"
          ? "AFF"
          : kind === "embarquement"
            ? "EMB"
            : "EXM";
    add("creation", {
      relisId: `CRE-ORI-${code}-${String(index + 1).padStart(3, "0")}`,
      name: row[0],
      type: "origin",
      tags: ["creation", "origine", kind],
      system: commonSystem(
        `<p>${row.slice(1).map(inlineHtml).join(" — ")}</p>`,
        {
          kind: `origin-${kind}`,
          sourceSection: "7",
          fields: Object.fromEntries(
            table.header
              .slice(1)
              .map((label, column) => [label, row[column + 1]]),
          ),
        },
      ),
    });
  });
}

const assets = section("## 8. Atouts", "## 9. Voies");
const assetTables = parseTables(assets.lines);
for (const [header, type, code] of [
  ["Atout", "advantage", "AVT"],
  ["Handicap", "drawback", "HCP"],
]) {
  const table = assetTables.find((candidate) => candidate.header[0] === header);
  if (!table) throw new Error(`Table absente : ${header}`);
  table.rows.forEach((row, index) => {
    add("creation", {
      relisId: `CRE-${code}-${String(index + 1).padStart(3, "0")}-${slug(row[0])}`,
      name: row[0],
      type,
      tags: ["creation", type === "advantage" ? "atout" : "handicap"],
      system: commonSystem(
        `<p><strong>Valeur :</strong> ${inlineHtml(row[1])}</p>\n<p>${inlineHtml(row[2])}</p>`,
        {
          kind: type,
          sourceSection: "8",
          value: row[1],
          effect: row[2],
        },
      ),
    });
  });
}

const posts = section("## 10. Postes", "## 11. Création");
const postTables = parseTables(posts.lines);
const postNames = [
  ...postTables
    .find((table) => table.header[0] === "Poste principal")
    .rows.map((row) => row[0]),
  ...postTables
    .find((table) => table.header[0] === "Poste secondaire")
    .rows.map((row) => row[0]),
];
const postSections = splitHeadings(posts.lines, 3).filter((entry) =>
  postNames.some((name) => entry.heading.replace(/^10\.\d+\s+/, "") === name),
);
postNames.forEach((name, index) => {
  const detail = postSections.find(
    (entry) => entry.heading.replace(/^10\.\d+\s+/, "") === name,
  );
  const capacityTable = parseTables(detail?.lines ?? []).find(
    (table) => table.header[0] === "Capacité",
  );
  add("creation", {
    relisId: `CRE-PST-${String(index + 1).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "post",
    tags: ["creation", "poste"],
    system: commonSystem(blockHtml(detail?.lines ?? []), {
      kind: "post",
      sourceSection: detail?.heading ?? "10",
      capabilities: (capacityTable?.rows ?? []).map((row) => ({
        name: row[0],
        phase: row[1],
        effect: row[2],
      })),
    }),
  });
});

// ---------------------------------------------------------------------------
// Progression : Voies, Spécialisations, Talents, Actions et Pouvoirs
// ---------------------------------------------------------------------------

const paths = section("## 9. Voies", "## 10. Postes");
const pathTables = parseTables(paths.lines);
const pathAttributeTable = pathTables.find(
  (table) =>
    table.header[0] === "Voie" && table.header[1] === "Attribut clef de Voie",
);
const pathSkillTable = pathTables.find(
  (table) => table.header[0] === "Voie" && table.header[1] === "Famille",
);
const pathBranchTable = pathTables.find(
  (table) => table.header[0] === "Voie" && table.header[1] === "Branches",
);
const pathLoadoutTable = pathTables.find(
  (table) =>
    table.header[0] === "Voie" &&
    table.header[1] === "Équipement de Voie principale",
);
if (
  !pathAttributeTable ||
  !pathSkillTable ||
  !pathBranchTable ||
  !pathLoadoutTable
)
  throw new Error("Tables canoniques des Voies incomplètes.");

const pathIdByName = new Map();
const pathDetails = splitHeadings(paths.lines, 3).filter(({ heading }) =>
  /^9\.\d+\s+/.test(heading),
);
const pathDetailByName = (name) =>
  pathDetails.find(
    ({ heading }) => clean(heading.replace(/^9\.\d+\s+/, "")) === name,
  );
pathAttributeTable.rows.forEach((row, index) => {
  const name = row[0];
  const relisId = `PRO-VOI-${String(index + 1).padStart(3, "0")}-${slug(name)}`;
  pathIdByName.set(name, relisId);
  const skills = pathSkillTable.rows.find((candidate) => candidate[0] === name);
  const branches = pathBranchTable.rows.find(
    (candidate) => candidate[0] === name,
  );
  const loadout = pathLoadoutTable.rows.find(
    (candidate) => candidate[0] === name,
  );
  const detail = pathDetailByName(name);
  const concept = descriptiveHtml(
    headingSection(detail?.lines ?? [], "Concept"),
  );
  const combatRole = descriptiveHtml(
    headingSection(detail?.lines ?? [], "Rôle en combat"),
  );
  const outsideRole = descriptiveHtml(
    headingSection(detail?.lines ?? [], "Rôle hors combat"),
  );
  const branchDefinitions = bulletDefinitions(
    headingSection(detail?.lines ?? [], "Branches possibles"),
  );
  const branchesHtml = branchDefinitions.length
    ? `<ul>${branchDefinitions
        .map(
          ({ name: branchName, summary }) =>
            `<li><strong>${inlineHtml(branchName)} :</strong> ${inlineHtml(summary)}</li>`,
        )
        .join("")}</ul>`
    : "";
  add("progression", {
    relisId,
    name,
    type: "path",
    tags: ["progression", "voie"],
    system: commonSystem(
      `<h3>Concept</h3>\n${concept}\n<h3>Rôle en combat</h3>\n${combatRole}\n<h3>Rôle hors combat</h3>\n${outsideRole}\n<h3>Branches</h3>\n${branchesHtml}\n<h3>Repères de création</h3>\n<p><strong>Attribut clef :</strong> ${inlineHtml(row[1])}</p>\n<p><strong>Compétences :</strong> ${inlineHtml(skills?.slice(1).join(" — ") ?? "")}</p>\n<p><strong>Dotation :</strong> ${inlineHtml(loadout?.[1] ?? "")}</p>`,
      {
        kind: "path",
        sourceSection: "9",
        keyAttributes: row[1].split(/,| ou /).map(clean),
        skillFamily: skills?.[1] ?? "",
        qualifiedSkillTotal: Number(skills?.[2] ?? 0),
        requiredSkills: (skills?.[3] ?? "").split(",").map(clean),
        skillChoices: (skills?.[4] ?? "").split(",").map(clean),
        branchNames: (branches?.[1] ?? "").split(";").map(clean),
        initialLoadout: loadout?.[1] ?? "",
      },
    ),
  });
});

const specializationTables = pathTables.filter(
  (table) =>
    table.header[0] === "Spécialisation" &&
    table.header[1] === "Paquet spécialisé",
);
if (specializationTables.length !== 12)
  throw new Error(
    `12 tables de Spécialisations attendues, reçu ${specializationTables.length}.`,
  );

specializationTables.forEach((table, pathIndex) => {
  const pathName = pathAttributeTable.rows[pathIndex][0];
  table.rows.forEach((row, branchIndex) => {
    const relisId = `PRO-SPE-${String(pathIndex + 1).padStart(2, "0")}-${String(branchIndex + 1).padStart(2, "0")}-${slug(row[0])}`;
    add("progression", {
      relisId,
      name: `${pathName} — ${row[0]}`,
      type: "specialization",
      tags: ["progression", "specialisation", slug(pathName).toLowerCase()],
      system: {
        ...commonSystem(
          `<p><strong>Voie :</strong> ${inlineHtml(pathName)}</p>\n<p><strong>Dotation principale :</strong> ${inlineHtml(row[1])}</p>`,
          {
            kind: "specialization",
            sourceSection: "9",
            pathName,
            branchName: row[0],
            primaryLoadout: row[1],
          },
        ),
        requirementRefs: [
          reference(pathIdByName.get(pathName), "path", pathName),
        ],
      },
    });
  });
});

function addTalentBlock({
  block,
  family,
  sourceSection,
  sequence,
  ancestryName = "",
}) {
  const meta = metadata(block.lines);
  if (!meta.Type) return false;
  const levelMatch = sourceSection.match(/niveau\s+(\d+)/i) ?? [
    null,
    meta.Niveau,
  ];
  const level = Number(levelMatch?.[1] ?? meta.Niveau ?? 1);
  const code =
    family === "ascendance"
      ? `ANC-${slug(ancestryName || "UNIVERSEL")}`
      : family === "competence"
        ? `CMP-${slug(meta.Compétence ?? "INCONNUE")}`
        : family === "vampirique"
          ? "VAM"
          : "GEN";
  add("progression", {
    relisId: `PRO-TAL-${code}-${String(sequence).padStart(3, "0")}`,
    name: block.heading,
    type: "talent",
    tags: ["progression", "talent", family],
    system: {
      ...commonSystem(blockHtml(block.lines), {
        kind: `talent-${family}`,
        sourceSection,
        family: meta.Famille ?? "",
        ancestry: ancestryName,
        skill: meta.Compétence ?? "",
        activation: meta.Type,
        prerequisites: meta.Prérequis ?? "",
        choice: meta.Choix ?? "",
        frequency: meta.Fréquence ?? "",
        trigger: meta.Déclencheur ?? "",
        duration: meta.Durée ?? "",
        metadata: meta,
      }),
      level: Number.isFinite(level) && level > 0 ? level : 1,
      traits: (meta.Traits ?? "").split(",").map(clean),
    },
  });
  return true;
}

const ancestryCatalogStarts = lines
  .map((line, index) => ({ line, index }))
  .filter(({ line }) => /^### 5\.\d+ Catalogue /.test(line));
let ancestryTalentCount = 0;
for (const [catalogIndex, catalog] of ancestryCatalogStarts.entries()) {
  const end =
    ancestryCatalogStarts[catalogIndex + 1]?.index ??
    findLine("## 6. Profils", catalog.index);
  const block = lines.slice(catalog.index, end);
  const ancestryName = clean(catalog.line)
    .replace(/^###\s+5\.\d+\s+Catalogue\s+/, "")
    .replace(/ — architecture générale$/, "")
    .replace(/^universel d'Ascendance$/i, "Universel");
  let levelHeading = catalog.line;
  for (let index = 0; index < block.length; index += 1) {
    if (/^### /.test(block[index])) levelHeading = block[index];
    if (!/^#### /.test(block[index])) continue;
    const next = block.findIndex(
      (line, offset) => offset > index && /^#{3,4} /.test(line),
    );
    const endIndex = next < 0 ? block.length : next;
    const talent = {
      heading: clean(block[index].slice(5)),
      lines: block.slice(index + 1, endIndex),
    };
    if (
      addTalentBlock({
        block: talent,
        family: "ascendance",
        sourceSection: clean(levelHeading),
        sequence: ancestryTalentCount + 1,
        ancestryName,
      })
    )
      ancestryTalentCount += 1;
  }
}

function addHeadingTalents(startPrefix, endPrefix, family, expected) {
  const target = section(startPrefix, endPrefix);
  let count = 0;
  let levelHeading = startPrefix;
  for (let index = 0; index < target.lines.length; index += 1) {
    if (/^### /.test(target.lines[index])) levelHeading = target.lines[index];
    if (!/^#### /.test(target.lines[index])) continue;
    let end = index + 1;
    while (end < target.lines.length && !/^#{2,4} /.test(target.lines[end]))
      end += 1;
    const block = {
      heading: clean(target.lines[index].slice(5)),
      lines: target.lines.slice(index + 1, end),
    };
    if (
      addTalentBlock({
        block,
        family,
        sourceSection: clean(levelHeading),
        sequence: count + 1,
      })
    )
      count += 1;
  }
  if (count !== expected)
    throw new Error(`${expected} Talents ${family} attendus, reçu ${count}.`);
}

addHeadingTalents("### 30.12 Catalogue", "## 31. Catalogue", "vampirique", 24);
addHeadingTalents("## 31. Catalogue", "## 32. Catalogue", "general", 42);

const skillTalents = section("## 32. Catalogue", "## 38. Actions");
let skillTalentCount = 0;
let skillName = "";
let skillLevelHeading = "";
for (let index = 0; index < skillTalents.lines.length; index += 1) {
  const line = skillTalents.lines[index];
  if (
    /^### \d+\.\d+ /.test(line) &&
    !/Architecture|Liste complète|État final/.test(line)
  )
    skillName = clean(line).replace(/^###\s+\d+\.\d+\s+/, "");
  if (/^#### Niveau /.test(line)) skillLevelHeading = clean(line);
  if (!/^##### /.test(line)) continue;
  let end = index + 1;
  while (
    end < skillTalents.lines.length &&
    !/^#{2,5} /.test(skillTalents.lines[end])
  )
    end += 1;
  const block = {
    heading: clean(line.slice(6)),
    lines: skillTalents.lines.slice(index + 1, end),
  };
  const meta = metadata(block.lines);
  if (meta.Compétence && skillName && meta.Compétence !== skillName)
    throw new Error(
      `Talent ${block.heading} rangé sous ${skillName} mais déclaré ${meta.Compétence}.`,
    );
  if (
    addTalentBlock({
      block,
      family: "competence",
      sourceSection: `${skillName} — ${skillLevelHeading}`,
      sequence: skillTalentCount + 1,
    })
  )
    skillTalentCount += 1;
}

if (ancestryTalentCount !== 738)
  throw new Error(
    `738 Talents d’Ascendance attendus, reçu ${ancestryTalentCount}.`,
  );
if (skillTalentCount !== 250)
  throw new Error(
    `250 Talents de compétence attendus, reçu ${skillTalentCount}.`,
  );

const actions = section("### 38.16 Catalogue", "### 38.53 Clôture");
const actionTable = parseTables(actions.lines).find(
  (table) => table.header[0] === "Action universelle",
);
if (!actionTable) throw new Error("Catalogue des Actions universelles absent.");
const actionRows = [...actionTable.rows];
const additionalActionHeadings = [
  "Ramper",
  "Escalader",
  "Nager",
  "Garder l'équilibre",
  "Bondir",
  "Saut en longueur ou en hauteur",
  "Prendre appui",
  "S'accroupir",
  "Se redresser",
  "Se dégager",
  "Se mettre à couvert",
];
for (const wanted of additionalActionHeadings) {
  const index = actions.lines.findIndex((line) => {
    if (!/^#{3,4} /.test(line)) return false;
    const title = clean(line)
      .replace(/^#{3,4}\s+/, "")
      .replace(/^38\.\d+\s+/, "")
      .split(" — ")[0];
    return title === wanted;
  });
  if (index < 0) throw new Error(`Action complémentaire absente : ${wanted}`);
  let end = index + 1;
  while (end < actions.lines.length && !/^#{3,4} /.test(actions.lines[end]))
    end += 1;
  const title = clean(actions.lines[index])
    .replace(/^#{3,4}\s+/, "")
    .replace(/^38\.\d+\s+/, "");
  const [name, cost = "Selon la procédure"] = title.split(" — ").map(clean);
  actionRows.push([
    name,
    cost,
    clean(
      blockHtml(actions.lines.slice(index + 1, end)).replace(/<[^>]+>/g, " "),
    ),
  ]);
}

actionRows.forEach((row, index) => {
  const costNumber = Number(row[1].match(/\d+/)?.[0] ?? 0);
  add("progression", {
    relisId: `PRO-ACT-${String(index + 1).padStart(3, "0")}-${slug(row[0])}`,
    name: row[0],
    type: "action",
    tags: ["progression", "action", "universelle"],
    system: {
      ...commonSystem(
        `<p><strong>Coût :</strong> ${inlineHtml(row[1])}</p>\n<p>${inlineHtml(row[2])}</p>`,
        {
          kind: "universal-action",
          sourceSection: "38",
          activation: row[1],
          summary: row[2],
        },
      ),
      test: {
        configured: false,
        attributeKey: "",
        skillKey: "",
        difficulty: null,
        resourceKey: "",
        cost: costNumber,
      },
      effect: { conditionKey: "", intensity: 0, durationRounds: 0 },
    },
  });
});

const powers = section(
  "### 43.20 Catalogue",
  "### 43.77 Progression qualitative",
);
const powerRows = powers.lines
  .filter((line) => /^\| (?:MAN|PRA|FLX)-(?:\d+|M)-\d+ /.test(line))
  .map(parseRow);
if (powerRows.length !== 252)
  throw new Error(`252 Pouvoirs attendus, reçu ${powerRows.length}.`);
for (const row of powerRows) {
  const relisId = row[0];
  const rankCode = relisId.split("-")[1];
  const level = rankCode === "M" ? 30 : Math.min(30, Number(rankCode) * 3 + 1);
  const hasExplicitRank = /^\d+$/.test(row[1]);
  const offset = hasExplicitRank ? 1 : 0;
  const name = row[1 + offset];
  const activation = row[2 + offset];
  const discipline = row[3 + offset];
  const effect = row[4 + offset];
  const scaling = row[5 + offset];
  const energy = relisId.startsWith("MAN-")
    ? "Mana"
    : relisId.startsWith("PRA-")
      ? "Prana"
      : "Flux";
  add("progression", {
    relisId,
    name,
    type: "power",
    tags: [
      "progression",
      "pouvoir",
      energy.toLowerCase(),
      `rang-${rankCode.toLowerCase()}`,
    ],
    system: {
      ...commonSystem(
        `<p><strong>${inlineHtml(energy)} — Rang ${inlineHtml(rankCode === "M" ? "Mythique" : rankCode)}.</strong></p>\n<p><strong>Activation :</strong> ${inlineHtml(activation)}</p>\n<p><strong>Discipline :</strong> ${inlineHtml(discipline)}</p>\n<p>${inlineHtml(effect)}</p>\n<p><strong>Intensification :</strong> ${inlineHtml(scaling)}</p>`,
        {
          kind: "power-formula",
          sourceSection: "43.20–43.76",
          energy,
          rank: rankCode,
          activation,
          discipline,
          effect,
          scaling,
        },
      ),
      level,
      traits: [energy, discipline],
    },
  });
}

// ---------------------------------------------------------------------------
// Matériel personnel
// ---------------------------------------------------------------------------

function nullableNumber(value) {
  const normalized = clean(value).replace(",", ".").replace(/\s/g, "");
  const match = normalized.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function integerValue(value) {
  const result = nullableNumber(value);
  return result === null ? null : Math.trunc(result);
}

function priceValue(value) {
  const normalized = clean(value).replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function columnsObject(header, row) {
  return Object.fromEntries(
    header.map((label, index) => [label, row[index] ?? ""]),
  );
}

function columnsSummary(header, row) {
  return header
    .map((label, index) => `${clean(label)} : ${clean(row[index] ?? "")}`)
    .filter((value) => !value.endsWith(": "))
    .join(" ; ");
}

function rowDescription(header, row) {
  const meaningful = header
    .map((label, index) => [clean(label), clean(row[index] ?? "")])
    .filter(
      ([label, value]) =>
        value && !["#", "ID", "Code", "Nom", "Objet", "Arme"].includes(label),
    )
    .map(
      ([label, value]) =>
        `<strong>${inlineHtml(label)} :</strong> ${inlineHtml(value)}`,
    );
  return `<p>${meaningful.join(". ")}.</p>`;
}

function physicalBase() {
  return {
    quantity: 1,
    unit: "count",
    massEach: null,
    volumeEach: null,
    bulkEach: null,
    containerRef: reference("", "container"),
    locationKey: "",
    custodianRef: reference("", "Actor"),
    ownershipState: "owned",
    accessibility: "stored",
    maintenanceRefs: [],
    equipState: "stored",
    bodyId: "",
    hands: 0,
    hostRef: reference("", "Item"),
    equipmentProfile: {},
    condition: "intact",
    wear: 0,
    charges: { current: null, maximum: null, unit: "charge" },
    expiresAt: {
      worldTime: null,
      calendarId: "",
      displayOverride: "",
      precision: "exact",
    },
    identified: true,
  };
}

function materialSystem(description, catalog, overrides = {}) {
  return {
    ...commonSystem(description, catalog),
    physical: physicalBase(),
    ...overrides,
  };
}

function headedTables(block) {
  const results = [];
  let heading = "";
  for (let index = 0; index < block.length - 1; index += 1) {
    if (/^### /.test(block[index]))
      heading = clean(block[index]).replace(/^###\s+/, "");
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
    results.push({ heading, header, rows });
  }
  return results;
}

const ACCESS_IDS = {
  Courante: "common",
  Martial: "martial",
  Martiale: "martial",
  Spécialisée: "specialized",
  Lourde: "heavy",
  Naturelle: "natural",
  Improvisée: "improvised",
};
const DEFENSE_IDS = { CAP: "cap", CAE: "cae" };
const DAMAGE_TYPE_IDS = {
  Contondant: "blunt",
  Contondants: "blunt",
  Tranchant: "slashing",
  Tranchants: "slashing",
  Perforant: "piercing",
  Perforants: "piercing",
  Thermique: "thermal",
  Cryogénique: "cryogenic",
  Électrique: "electric",
  Photonique: "photonic",
  Plasma: "plasma",
  Sonique: "sonic",
  Chimique: "chemical",
  Psychique: "psychic",
};

function weaponFamily(heading) {
  if (heading.includes("5-K1")) return "improvisedMelee";
  if (heading.includes("5-K2")) return "martialTechnoBlade";
  if (heading.includes("5-K3")) return "handgun";
  if (heading.includes("5-K4")) return "physicalLongGun";
  if (heading.includes("5-K5")) return "energyLongGun";
  if (heading.includes("5-K6")) return "bowCrossbowThrown";
  if (heading.includes("5-K7")) return "heavyLauncher";
  return "naturalSpecial";
}

function accessId(value) {
  const label = clean(value).split(/[(/]/)[0].trim();
  return ACCESS_IDS[label] ?? "";
}

function handsId(value) {
  const text = clean(value);
  if (/^0|naturelle/i.test(text)) return "natural";
  if (/Montée/i.test(text)) return "mountedOrTwo";
  if (/1\+|1 ou 2|polyvalente/i.test(text)) return "versatile";
  if (/^2/.test(text)) return "two";
  if (/^1/.test(text)) return "one";
  return "";
}

function parseDamage(value) {
  const text = clean(value);
  const dice = text.match(/(\d+)d(4|6|8|10|12)/i);
  const bonus = text.match(/(?:^|\s)([+-]\s*\d+)(?:\s|$)/);
  const typeIds = Object.entries(DAMAGE_TYPE_IDS)
    .filter(([label]) =>
      text.toLocaleLowerCase("fr").includes(label.toLocaleLowerCase("fr")),
    )
    .map(([, id]) => id);
  return {
    damageDice: dice ? Number(dice[1]) : null,
    damageDie: dice ? `d${dice[2]}` : "",
    damageBonus: bonus ? Number(bonus[1].replace(/\s/g, "")) : null,
    damageTypes: [...new Set(typeIds)],
    damageFormula: text,
  };
}

function parseRange(value) {
  const numbers =
    clean(value)
      .match(/\d+(?:[.,]\d+)?/g)
      ?.map((entry) => Number(entry.replace(",", "."))) ?? [];
  return {
    rangeKind: numbers.length
      ? "increments"
      : clean(value).toLowerCase().includes("contact")
        ? "contact"
        : "special",
    range: clean(value),
    rangeOptimal: numbers[0] ?? null,
    rangeMaximum: numbers[1] ?? numbers[0] ?? null,
  };
}

function findColumn(header, ...labels) {
  const index = header.findIndex((value) =>
    labels.some((label) => value === label || value.startsWith(label)),
  );
  return index;
}

const chapter41 = section("## 41. Armes", "## 42. Étape");
const materialTables = headedTables(chapter41.lines);
const weaponTables = materialTables.filter((table) =>
  /^41\.(97|99|101|105|108|110|113|117) /.test(table.heading),
);
const shieldTable = materialTables.find((table) =>
  /^41\.150 /.test(table.heading),
);
const protectionTables = materialTables.filter((table) =>
  /^41\.(125|127|130|132|135|140|142|144|147) /.test(table.heading),
);
const barrierTable = materialTables.find((table) =>
  /^41\.153 /.test(table.heading),
);
const batteryTable = materialTables.find((table) =>
  /^41\.155 /.test(table.heading),
);
const moduleTables = materialTables.filter((table) =>
  /^41\.(158|159|160) /.test(table.heading),
);
const specialAmmunitionTable = materialTables.find((table) =>
  /^41\.181 /.test(table.heading),
);
const grenadeTable = materialTables.find((table) =>
  /^41\.184 /.test(table.heading),
);
const feedTables = materialTables.filter((table) =>
  /^41\.(177|178|179) /.test(table.heading),
);
const chamberTables = materialTables.filter((table) =>
  /^41\.(172|173|174|175) /.test(table.heading),
);

for (const [label, value] of Object.entries({
  weaponTables: weaponTables.length,
  protectionTables: protectionTables.length,
  moduleTables: moduleTables.length,
  feedTables: feedTables.length,
  chamberTables: chamberTables.length,
})) {
  const expectedCount = {
    weaponTables: 8,
    protectionTables: 9,
    moduleTables: 3,
    feedTables: 3,
    chamberTables: 4,
  }[label];
  if (value !== expectedCount)
    throw new Error(
      `${label} : ${expectedCount} tables attendues, reçu ${value}.`,
    );
}
for (const [label, value] of Object.entries({
  shieldTable,
  barrierTable,
  batteryTable,
  specialAmmunitionTable,
  grenadeTable,
}))
  if (!value) throw new Error(`Table matérielle absente : ${label}`);

const feedByWeapon = new Map();
for (const table of feedTables)
  for (const row of table.rows)
    feedByWeapon.set(row[0].replaceAll("’", "'"), {
      chamberingId: row[1].match(/^[A-Z0-9-]+/)?.[0] ?? row[1],
      feed: row[2],
    });

const PRESSURE_CLASS_IDS = {
  Faible: "low",
  "Faible, annulaire": "low",
  "Standard légère": "lightStandard",
  Standard: "standard",
  "Standard lourde": "heavyStandard",
  "Haute pression": "highPressure",
  "Haute vélocité": "highVelocity",
  Magnum: "magnum",
  "Magnum lourde": "heavyMagnum",
  "Magnum automatique": "magnumAutomatic",
  "Fusil léger": "rifleLight",
  "Fusil intermédiaire": "rifleIntermediate",
  "Fusil subsonique": "rifleSubsonic",
  "Fusil de précision intermédiaire": "riflePrecisionIntermediate",
  "Fusil lourd": "rifleHeavy",
  "Précision lourde": "precisionHeavy",
  "Anti-matériel": "antiMateriel",
  "Cartouche légère": "shellLight",
  "Cartouche standard": "shellStandard",
  "Très lourde": "shellHeavy",
};

function feedInterfaceId(value) {
  const text = clean(value).toLocaleLowerCase("fr");
  if (text.includes("tambour")) return "drum";
  if (text.includes("tubulaire")) return "tubularMagazine";
  if (text.includes("barillet")) return "cylinder";
  if (text.includes("cassette")) return "cassette";
  if (text.includes("bande") || text.includes("trémie")) return "belt";
  if (text.includes("rail")) return "rail";
  if (text.includes("réservoir")) return "reservoir";
  if (text.includes("chargeur")) return "boxMagazine";
  if (text.includes("magasin interne") || /^magasin[, ]/.test(text))
    return "internalMagazine";
  if (text.includes("tube") || text.includes("unitaire"))
    return "singleProjectile";
  return "";
}

function batteryFormatId(value) {
  const text = clean(value).toLocaleLowerCase("fr");
  if (text.includes("micro")) return "micro";
  if (text.includes("légère") || text.includes("legere")) return "light";
  if (text.includes("industri")) return "industrial";
  if (text.includes("lourde") || /48\s*ce/.test(text)) return "heavy";
  if (text.includes("standard") || /24\s*ce/.test(text)) return "standard";
  if (/12\s*ce/.test(text)) return "light";
  if (/6\s*ce/.test(text)) return "micro";
  return text ? "special" : "";
}

function technologyId(value) {
  const text = clean(value).toLocaleLowerCase("fr");
  if (text.includes("hexatech") || text.includes("techno-mag"))
    return "technomagical";
  if (text.includes("plasma compact")) return "plasmaCompact";
  if (text.includes("plasma")) return "plasma";
  if (text.includes("chimique avanc")) return "chemicalAdvanced";
  if (text.includes("photovolta")) return "photovoltaic";
  if (text.includes("hybride")) return "hybrid";
  if (text.includes("laser") || text.includes("photon")) return "laser";
  if (text.includes("sonique")) return "sonic";
  if (text.includes("électromagn") || text.includes("gauss"))
    return "electromagnetic";
  if (text.includes("arc") || text.includes("électri")) return "electric";
  return "";
}

const chamberDataById = new Map();
for (const table of chamberTables) {
  const classColumn = findColumn(table.header, "Classe");
  const interfaceColumn = findColumn(table.header, "Interface");
  for (const row of table.rows)
    chamberDataById.set(row[0], {
      pressureClassId:
        classColumn >= 0
          ? (PRESSURE_CLASS_IDS[row[classColumn]] ?? "specializedProjectile")
          : "specializedProjectile",
      interfaceId:
        interfaceColumn >= 0 ? feedInterfaceId(row[interfaceColumn]) : "",
    });
}

function ammunitionFamilyId(chamberingId) {
  if (chamberingId.startsWith("ARW-") || chamberingId.startsWith("BOLT-"))
    return "arrow";
  if (chamberingId.startsWith("CART-")) return "shotgun";
  if (
    ["DARD-", "AIG-", "TRANQ-"].some((prefix) =>
      chamberingId.startsWith(prefix),
    )
  )
    return "dart";
  if (["GL-", "ROQ-", "MIS-"].some((prefix) => chamberingId.startsWith(prefix)))
    return "grenade";
  if (
    ["HARP-", "EM-", "GAUSS-"].some((prefix) => chamberingId.startsWith(prefix))
  )
    return "projectile";
  return chamberingId ? "ballistic" : "";
}

const BOW_CROSSBOW_PROFILES = {
  "Arc court": {
    feedKind: "none",
    chamberingId: "ARW-SHORT",
    pressureClassId: "specializedProjectile",
    ammunitionFamilyIds: ["arrow"],
    reloadProcedure: "Encochage d’une flèche inclus dans le tir.",
  },
  "Arc long": {
    feedKind: "none",
    chamberingId: "ARW-LONG",
    pressureClassId: "specializedProjectile",
    ammunitionFamilyIds: ["arrow"],
    reloadProcedure: "Encochage d’une flèche inclus dans le tir.",
  },
  "Arc composite": {
    feedKind: "none",
    chamberingId: "ARW-COMPOSITE",
    pressureClassId: "specializedProjectile",
    ammunitionFamilyIds: ["arrow"],
    reloadProcedure: "Encochage d’une flèche inclus dans le tir.",
  },
  "Arbalète légère": {
    feedKind: "chamber",
    chamberingId: "BOLT-LIGHT",
    pressureClassId: "specializedProjectile",
    ammunitionFamilyIds: ["arrow"],
    reloadProcedure: "Chargement unitaire d’un carreau.",
  },
  "Arbalète lourde": {
    feedKind: "chamber",
    chamberingId: "BOLT-HEAVY",
    pressureClassId: "specializedProjectile",
    ammunitionFamilyIds: ["arrow"],
    reloadProcedure: "Chargement unitaire d’un carreau.",
  },
  "Arbalète à répétition": {
    feedKind: "internal",
    chamberingId: "BOLT-REPEATING",
    pressureClassId: "specializedProjectile",
    ammunitionFamilyIds: ["arrow"],
    internalCapacity: 6,
    reloadProcedure: "Chargement manuel du magasin interne de six carreaux.",
  },
};

function buildWeaponSystem(table, row, isShield = false) {
  const header = table.header;
  const nameColumn = header[0] === "#" ? 1 : 0;
  const name = row[nameColumn];
  const attackColumn = findColumn(header, "Attaque");
  const defenseColumn = findColumn(header, "Déf.", "Dégâts / Déf.");
  const damageColumn = findColumn(header, "Dégâts", "Dégâts / Déf.");
  const precisionColumn = findColumn(header, "Préc.");
  const handsColumn = findColumn(header, "Mains");
  const rangeColumn = findColumn(header, "Portée");
  const accessColumn = findColumn(header, "Accès");
  const traitsColumn = findColumn(header, "Traits");
  const priceColumn = findColumn(header, "Prix");
  const bulkColumn = findColumn(header, "Enc.");
  const attack = attackColumn >= 0 ? row[attackColumn] : "";
  const damageText = damageColumn >= 0 ? row[damageColumn] : "";
  const damage = parseDamage(damageText);
  const range = parseRange(
    rangeColumn >= 0 ? row[rangeColumn] : isShield ? "Contact" : "",
  );
  const explicitFeed = feedByWeapon.get(name.replaceAll("’", "'"));
  const bowProfile = BOW_CROSSBOW_PROFILES[name];
  const familyId = isShield
    ? "martialTechnoBlade"
    : weaponFamily(table.heading);
  const energyColumn = findColumn(
    header,
    "Batterie",
    "Capacité et Recharge",
    "Capacité",
  );
  const energyText = energyColumn >= 0 ? row[energyColumn] : "";
  const isEnergy =
    /batterie|CE/i.test(energyText) || familyId === "energyLongGun";
  let feedKind = "none";
  let physicalFeedKind = "";
  if (bowProfile) {
    feedKind = bowProfile.feedKind;
    physicalFeedKind = bowProfile.feedKind;
  } else if (explicitFeed) {
    if (/chargeur|cassette|bande|tambour/i.test(explicitFeed.feed))
      physicalFeedKind = "detachable";
    else if (/magasin|barillet|réservoir/i.test(explicitFeed.feed))
      physicalFeedKind = "internal";
    else physicalFeedKind = "chamber";
    feedKind = isEnergy ? "hybrid" : physicalFeedKind;
  } else if (isEnergy) feedKind = "energy";
  else if (["handgun", "physicalLongGun", "heavyLauncher"].includes(familyId))
    feedKind = "chamber";
  const attackLower = attack.toLocaleLowerCase("fr");
  const skillId = attackLower.includes("armes lourdes")
    ? "heavyWeapons"
    : attackLower.includes("tir")
      ? "shooting"
      : familyId === "bowCrossbowThrown"
        ? "shooting"
        : "melee";
  const attributeId = attackLower.includes("technologie")
    ? "technology"
    : attackLower.includes("maîtrise magique")
      ? "magicMastery"
      : attackLower.includes("force")
        ? "force"
        : "dexterity";
  const defenseText = defenseColumn >= 0 ? row[defenseColumn] : "";
  const defenseTarget =
    Object.entries(DEFENSE_IDS).find(([label]) =>
      defenseText.includes(label),
    )?.[1] ?? "profile";
  const modeIds = [];
  const combined = `${traitsColumn >= 0 ? row[traitsColumn] : ""} ${header.map((_, index) => row[index]).join(" ")}`;
  if (/Salve/i.test(combined)) modeIds.push("volley");
  if (/Rafale/i.test(combined)) modeIds.push("burst");
  if (/Automatique/i.test(combined)) modeIds.push("automatic");
  if (/Suppression/i.test(combined)) modeIds.push("suppression");
  const bulk = bulkColumn >= 0 ? nullableNumber(row[bulkColumn]) : null;
  const chamberingId =
    bowProfile?.chamberingId ?? explicitFeed?.chamberingId ?? "";
  const chamberData = chamberDataById.get(chamberingId) ?? {
    pressureClassId: bowProfile?.pressureClassId ?? "",
  };
  const physicalInterfaceId = explicitFeed
    ? feedInterfaceId(explicitFeed.feed)
    : "";
  const targetFormatId = isEnergy ? batteryFormatId(energyText) : "";
  // La technologie décrit l’effet de l’arme, pas la chimie de sa batterie.
  // Elle ne devient une contrainte de logement que si le canon l’exige.
  const targetTechnologyId = "";
  const physical = physicalBase();
  physical.bulkEach = bulk;
  physical.equipmentProfile = isShield
    ? {
        wearForm: "shield",
        family: "manipulable",
        slotsConfigured: true,
        bodySlots: ["shield"],
        shieldHands: integerValue(row[handsColumn]),
      }
    : { family: "manipulable", slotsConfigured: true, bodySlots: [] };
  if (isEnergy) {
    physical.equipmentProfile.providedSlots = { power: 1 };
    physical.equipmentProfile.interfaceIds = ["cell"];
  }
  return materialSystem(
    rowDescription(header, row),
    {
      kind: isShield ? "shield" : "weapon",
      sourceSection: table.heading,
      columns: columnsObject(header, row),
      reloadProfile:
        explicitFeed || bowProfile
          ? {
              unitaryFormula: "1 + Dextérité",
              unitaryFormulaId: "one-plus-dexterity",
              automationLot: "10-F",
              mayLoadOneByOne: true,
            }
          : null,
    },
    {
      level: integerValue(row[findColumn(header, "Niv.")]),
      referencePrice: {
        amount: priceColumn >= 0 ? priceValue(row[priceColumn]) : null,
        currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
        unit: "count",
        quantityBasis: 1,
        sourceRefs: [],
      },
      physical,
      weaponProfile: {
        familyId,
        support: familyId === "naturalSpecial" ? "natural" : "personal",
        access: isShield
          ? accessId(row[accessColumn])
          : accessId(row[accessColumn]),
        attackMode:
          familyId === "naturalSpecial"
            ? "natural"
            : [
                  "handgun",
                  "physicalLongGun",
                  "energyLongGun",
                  "heavyLauncher",
                  "bowCrossbowThrown",
                ].includes(familyId)
              ? familyId === "bowCrossbowThrown" && /javelot|disque/i.test(name)
                ? "thrown"
                : "ranged"
              : "melee",
        defenseTarget,
        handsMode: isShield
          ? handsId(row[handsColumn])
          : handsId(
              handsColumn >= 0
                ? row[handsColumn]
                : familyId.includes("Long") || familyId === "heavyLauncher"
                  ? "2"
                  : "1",
            ),
        skillId,
        attributeId,
        accuracy:
          precisionColumn >= 0 ? nullableNumber(row[precisionColumn]) : null,
        damageDice: damage.damageDice,
        damageDie: damage.damageDie,
        damageBonus: damage.damageBonus,
        damageAttribute:
          damageText.includes("Force") || /javelot|disque/i.test(name)
            ? "force"
            : "none",
        damageFormula: damage.damageFormula,
        damageTypes: damage.damageTypes,
        damageSources:
          familyId === "energyLongGun"
            ? ["energy"]
            : familyId === "martialTechnoBlade" &&
                /photon|phase|vibra/i.test(name)
              ? ["energy"]
              : ["ballistic"],
        penetration: nullableNumber(
          (traitsColumn >= 0 ? row[traitsColumn] : "").match(
            /Pénétration\s+(\d+)/i,
          )?.[1] ?? "",
        ),
        ...range,
        recoil: nullableNumber(row[findColumn(header, "Recul")] ?? ""),
        feedKind,
        hybridPhysicalFeedKind: feedKind === "hybrid" ? physicalFeedKind : "",
        chamberingId,
        chamberId: chamberingId,
        pressureClassId: chamberData.pressureClassId ?? "",
        pressureClass: chamberData.pressureClassId ?? "",
        feedInterfaceId: physicalInterfaceId,
        feedInterface: physicalInterfaceId,
        internalCapacity:
          bowProfile?.internalCapacity ??
          (physicalFeedKind === "internal" || feedKind === "internal"
            ? nullableNumber(explicitFeed?.feed ?? energyText)
            : null),
        batterySlotCount: isEnergy ? 1 : null,
        modeIds,
        ammunitionFamilyIds:
          bowProfile?.ammunitionFamilyIds ??
          (explicitFeed ? [ammunitionFamilyId(chamberingId)] : []),
        acousticSignature: /silenc/i.test(combined)
          ? "silent"
          : /discr/i.test(combined)
            ? "discreet"
            : /déton/i.test(combined)
              ? "detonating"
              : "loud",
        ammunitionConsumption: {
          single:
            explicitFeed || bowProfile?.ammunitionFamilyIds?.length ? 1 : null,
        },
        reloadActions:
          bowProfile?.feedKind === "none" ? 0 : bowProfile ? 1 : null,
        reloadProcedure:
          bowProfile?.reloadProcedure ??
          (explicitFeed
            ? "Chargement manuel : jusqu’à 1 + Dextérité munitions par action, sans dépasser la capacité."
            : ""),
        energyConsumption: {
          single: isEnergy
            ? nullableNumber(
                energyText.match(/(\d+)\s*CE\s*\/\s*tir/i)?.[1] ?? "1",
              )
            : null,
        },
      },
      protectionProfile: isShield
        ? {
            kind: "shield",
            access: accessId(row[accessColumn]),
            constraintSummary: columnsSummary(header, row),
          }
        : undefined,
      energyProfile: isEnergy
        ? {
            kind: "",
            format: targetFormatId,
            formatId: targetFormatId,
            powerClass: targetFormatId,
            powerClassId: targetFormatId,
            technology: targetTechnologyId,
            technologyId: targetTechnologyId,
            interfaceId: "cell",
            current: null,
            maximum: null,
            rechargeable: false,
          }
        : undefined,
    },
  );
}

let weaponCounter = 0;
for (const table of weaponTables) {
  for (const row of table.rows) {
    weaponCounter += 1;
    const name = row[1];
    add("material", {
      relisId: `MAT-WPN-${String(weaponCounter).padStart(3, "0")}-${slug(name)}`,
      name,
      type: "weapon",
      tags: ["materiel", "arme", weaponFamily(table.heading)],
      system: buildWeaponSystem(table, row),
    });
  }
}
for (const row of shieldTable.rows) {
  weaponCounter += 1;
  const name = row[1];
  add("material", {
    relisId: `MAT-WPN-${String(weaponCounter).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "weapon",
    tags: ["materiel", "arme", "bouclier"],
    system: buildWeaponSystem(shieldTable, row, true),
  });
}

// Le profil de Prana a été arrêté après le catalogue chiffré : ses valeurs de
// combat restent volontairement vides jusqu’au moteur 10-F, mais son logement
// de Cœur d’Écarlithe est réel et immédiatement testable.
add("material", {
  relisId: "MAT-WPN-PRANA-TECHNOLAME",
  name: "Techno-lame de Prana",
  type: "weapon",
  tags: ["materiel", "arme", "techno-lame", "prana", "ecarlithe"],
  system: materialSystem(
    "<p>Techno-lame dédiée au Prana. Elle reçoit un Cœur d’Écarlithe réellement installé ; le Cœur n’est pas une batterie et ne contient aucun CE. Activation, désactivation, surcharge et valeurs de combat restent dans 10-F.</p>",
    {
      kind: "prana-techno-blade",
      sourceSection: "81, 86 et 93–99",
      deferredRules: [
        "activation",
        "désactivation",
        "surcharge",
        "résolution de combat",
      ],
    },
    {
      physical: {
        ...physicalBase(),
        equipmentProfile: {
          family: "manipulable",
          slotsConfigured: true,
          bodySlots: [],
          providedSlots: { interface: 1 },
          interfaceIds: ["crystalSocket"],
        },
      },
      weaponProfile: {
        familyId: "martialTechnoBlade",
        technoBladeVariant: "pranaCrystal",
        support: "personal",
        access: "specialized",
        attackMode: "melee",
        defenseTarget: "cap",
        handsMode: "versatile",
        skillId: "melee",
        attributeId: "magicMastery",
        feedKind: "pranaCrystal",
        feedInterfaceId: "crystalSocket",
        ammunitionFamilyIds: [],
        modeIds: [],
      },
      energyProfile: {
        kind: "",
        current: null,
        maximum: null,
        rechargeable: false,
      },
    },
  ),
});

const ARMOR_KIND_BY_HEADING = {
  41.125: "underlayer",
  41.127: "light",
  "41.130": "intermediate",
  41.132: "heavy",
  41.135: "exo",
  "41.140": "underlayer",
  41.142: "light",
  41.144: "light",
  41.147: "light",
};
const WEAR_FORM_BY_HEADING = {
  41.125: "underlayer",
  41.127: "mainArmor",
  "41.130": "mainArmor",
  41.132: "mainArmor",
  41.135: "mainArmor",
  "41.140": "underHelmet",
  41.142: "mainHelmet",
  41.144: "",
  41.147: "mainArmor",
};

let armorCounter = 0;
for (const table of protectionTables) {
  const sectionCode = table.heading.match(/^41\.\d+/)?.[0] ?? "";
  for (const row of table.rows) {
    armorCounter += 1;
    const name = row[1];
    const header = table.header;
    const priceColumn = findColumn(header, "Prix");
    const bulkColumn = findColumn(header, "Enc.");
    const accessColumn = findColumn(header, "Accès");
    const bonusColumn = findColumn(header, "CAP/CAE");
    const solidityColumn = findColumn(header, "Sol. P/E");
    const coverageColumn = findColumn(header, "Couverture", "Zone");
    const bonuses = (row[bonusColumn] ?? "").match(/-?\d+/g)?.map(Number) ?? [];
    const solidities =
      (row[solidityColumn] ?? "").match(/-?\d+/g)?.map(Number) ?? [];
    const physical = physicalBase();
    physical.bulkEach =
      bulkColumn >= 0 ? nullableNumber(row[bulkColumn]) : null;
    const wearForm = WEAR_FORM_BY_HEADING[sectionCode] ?? "";
    physical.equipmentProfile = {
      family: "wearable",
      wearForm,
      slotsConfigured: true,
      bodySlots: wearForm ? [wearForm] : [],
    };
    add("material", {
      relisId: `MAT-ARM-${String(armorCounter).padStart(3, "0")}-${slug(name)}`,
      name,
      type: "armor",
      tags: [
        "materiel",
        "armure",
        ARMOR_KIND_BY_HEADING[sectionCode] ?? "protection",
      ],
      system: materialSystem(
        rowDescription(header, row),
        {
          kind: "armor",
          sourceSection: table.heading,
          columns: columnsObject(header, row),
        },
        {
          level: integerValue(row[findColumn(header, "Niv.")]),
          referencePrice: {
            amount: priceColumn >= 0 ? priceValue(row[priceColumn]) : null,
            currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
            unit: "count",
            quantityBasis: 1,
            sourceRefs: [],
          },
          physical,
          protectionProfile: {
            kind: ARMOR_KIND_BY_HEADING[sectionCode] ?? "light",
            access: accessId(row[accessColumn]),
            capBonus: bonuses[0] ?? null,
            caeBonus: bonuses[1] ?? null,
            solidityPhysical: solidities[0] ?? null,
            solidityEnergy: solidities[1] ?? null,
            coverage:
              coverageColumn >= 0
                ? row[coverageColumn].split(/,|\+/).map(clean)
                : [],
            constraintSummary: columnsSummary(header, row),
          },
          energyProfile:
            sectionCode === "41.135"
              ? { kind: "", current: null, maximum: null, rechargeable: false }
              : undefined,
          supplyProfile: {},
        },
      ),
    });
  }
}

for (const row of barrierTable.rows) {
  const index =
    entries.filter((entry) => entry.tags?.includes("barriere")).length + 1;
  const name = row[1];
  add("material", {
    relisId: `MAT-EQP-BAR-${String(index).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "equipment",
    tags: ["materiel", "equipement", "barriere"],
    system: materialSystem(
      rowDescription(barrierTable.header, row),
      {
        kind: "barrier",
        sourceSection: barrierTable.heading,
        columns: columnsObject(barrierTable.header, row),
      },
      {
        level: integerValue(row[findColumn(barrierTable.header, "Niv.")]),
        referencePrice: {
          amount: priceValue(row[findColumn(barrierTable.header, "Prix")]),
          currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
          unit: "count",
          quantityBasis: 1,
          sourceRefs: [],
        },
        physical: {
          ...physicalBase(),
          equipmentProfile: {
            family: "manipulable",
            functionalCategory: "generator",
            slotsConfigured: true,
            bodySlots: [],
          },
        },
        energyProfile: {
          kind: "",
          current: null,
          maximum: null,
          rechargeable: false,
        },
        supplyProfile: {},
        protectionProfile: {
          kind: "barrier",
          access: "",
          barrierCurrent: nullableNumber(
            row[findColumn(barrierTable.header, "RB")],
          ),
          barrierMaximum: nullableNumber(
            row[findColumn(barrierTable.header, "RB")],
          ),
          barrierKind: /Bulle|Mur/i.test(
            row[findColumn(barrierTable.header, "Type")],
          )
            ? "zone"
            : /Cône|direction/i.test(
                  row[findColumn(barrierTable.header, "Type")],
                )
              ? "directional"
              : "personal",
          barrierCompatibilities: [
            row[findColumn(barrierTable.header, "Compatibilité")],
          ],
          absorptionFormula: row[findColumn(barrierTable.header, "Absorption")],
          activationCost: nullableNumber(
            row[findColumn(barrierTable.header, "Activation")],
          ),
          upkeep: row[findColumn(barrierTable.header, "Entretien")],
          rechargeRatePerCe: 4,
          rechargeDuration: "1 minute",
          interception: row[findColumn(barrierTable.header, "Type")],
          collapseEffect:
            "Effondrement à 0 RB ; réactivation après restauration d’au moins 1 RB.",
          constraintSummary: columnsSummary(barrierTable.header, row),
        },
      },
    ),
  });
}

for (const row of batteryTable.rows) {
  const index =
    entries.filter((entry) => entry.tags?.includes("batterie")).length + 1;
  const name = row[1];
  const capacity = nullableNumber(
    row[findColumn(batteryTable.header, "Capacité")],
  );
  const formatId = batteryFormatId(
    row[findColumn(batteryTable.header, "Format")],
  );
  const outputClass = batteryFormatId(
    row[findColumn(batteryTable.header, "Sortie")],
  );
  const batteryTechnologyId = technologyId(
    row[findColumn(batteryTable.header, "Technologie")],
  );
  const physical = physicalBase();
  physical.bulkEach = nullableNumber(
    row[findColumn(batteryTable.header, "Enc.")],
  );
  physical.equipmentProfile = {
    family: "resource",
    functionalCategory: "power",
    installable: true,
    installationKind: "accessory",
    requiredSlots: { power: 1 },
    compatibleInterfaces: ["cell"],
    slotsConfigured: true,
    bodySlots: [],
  };
  add("material", {
    relisId: `MAT-RES-BAT-${String(index).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "resource",
    tags: ["materiel", "ressource", "batterie"],
    system: materialSystem(
      rowDescription(batteryTable.header, row),
      {
        kind: "battery",
        sourceSection: batteryTable.heading,
        columns: columnsObject(batteryTable.header, row),
      },
      {
        level: integerValue(row[findColumn(batteryTable.header, "Niv.")]),
        referencePrice: {
          amount: priceValue(row[findColumn(batteryTable.header, "Prix")]),
          currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
          unit: "count",
          quantityBasis: 1,
          sourceRefs: [],
        },
        physical,
        energyProfile: {
          kind: "battery",
          format: formatId,
          formatId,
          powerClass: outputClass,
          powerClassId: outputClass,
          technology: batteryTechnologyId,
          technologyId: batteryTechnologyId,
          interfaceId: "cell",
          current: capacity,
          maximum: capacity,
          output: null,
          outputClass,
          cycle: /recharge/i.test(row[findColumn(batteryTable.header, "Cycle")])
            ? "rechargeable"
            : "consumable",
          rechargeDuration:
            row[findColumn(batteryTable.header, "Recharge complète")],
          rechargeable: /recharge/i.test(
            row[findColumn(batteryTable.header, "Cycle")],
          ),
        },
        currencyProfile: {
          physicalCash: false,
          currencyId: "",
          currencyLabel: "",
          denomination: 1,
        },
      },
    ),
  });
}

for (const table of moduleTables) {
  for (const row of table.rows) {
    const index =
      entries.filter((entry) => entry.tags?.includes("module-personnel"))
        .length + 1;
    const name = row[1];
    const priceColumn = findColumn(table.header, "Prix");
    const slotColumn = findColumn(table.header, "Emplacement", "Compatibilité");
    const effectColumn = findColumn(table.header, "Effet principal");
    add("material", {
      relisId: `MAT-EQP-MOD-${String(index).padStart(3, "0")}-${slug(name)}`,
      name,
      type: "equipment",
      tags: ["materiel", "equipement", "module-personnel"],
      system: materialSystem(
        rowDescription(table.header, row),
        {
          kind: "module",
          sourceSection: table.heading,
          columns: columnsObject(table.header, row),
        },
        {
          level: integerValue(row[findColumn(table.header, "Niv.")]),
          referencePrice: {
            amount: priceColumn >= 0 ? priceValue(row[priceColumn]) : null,
            currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
            unit: "count",
            quantityBasis: 1,
            sourceRefs: [],
          },
          physical: {
            ...physicalBase(),
            equipmentProfile: {
              functionalCategory: "module",
              family: "resource",
              installable: true,
              installationKind: "accessory",
              slot: slotColumn >= 0 ? row[slotColumn] : "",
              effectSummary: effectColumn >= 0 ? row[effectColumn] : "",
              slotsConfigured: true,
              bodySlots: [],
            },
          },
          energyProfile: {
            kind: "",
            current: null,
            maximum: null,
            rechargeable: false,
          },
          supplyProfile: {},
        },
      ),
    });
  }
}

const AMMUNITION_VARIANT_IDS = {
  Standard: "standard",
  Subsonique: "subsonic",
  Traçante: "tracer",
  Pénétrante: "penetrating",
  "Non létale": "nonlethal",
  Incendiaire: "incendiary",
  Cryogénique: "cryogenic",
  "Électrique ou EMP": "electricEmp",
  Explosive: "explosive",
  "Chimique ou toxique": "chemical",
  "Techno-magique": "technomagical",
  Chevrotine: "buckshot",
  "Balle de cartouche": "slug",
  "Projectile de brèche": "breaching",
};

function packageQuantity(value) {
  const text = clean(value).toLocaleLowerCase("fr");
  if (/unité|unitaire/.test(text)) return 1;
  return integerValue(text) ?? 1;
}

for (const table of chamberTables) {
  for (const row of table.rows) {
    const relisId = row[0];
    const prefix = relisId.split("-")[0];
    const name = row[1];
    const priceColumn = findColumn(table.header, "Prix standard");
    const packageColumn = findColumn(table.header, "Conditionnement");
    const packagedQuantity =
      packageColumn >= 0 ? packageQuantity(row[packageColumn]) : 1;
    const chamberData = chamberDataById.get(relisId) ?? {};
    add("material", {
      relisId,
      name,
      type: "ammunition",
      tags: ["materiel", "munition", "standard", prefix.toLowerCase()],
      system: materialSystem(
        rowDescription(table.header, row),
        {
          kind: "ammunition-standard",
          sourceSection: table.heading,
          columns: columnsObject(table.header, row),
        },
        {
          referencePrice: {
            amount: priceColumn >= 0 ? priceValue(row[priceColumn]) : null,
            currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
            unit: "count",
            quantityBasis: packagedQuantity,
            sourceRefs: [],
          },
          physical: { ...physicalBase(), quantity: packagedQuantity },
          ammunitionProfile: {
            familyId: ammunitionFamilyId(relisId),
            variantId: "standard",
            chamberingId: relisId,
            chamberId: relisId,
            pressureClassId:
              chamberData.pressureClassId ?? "specializedProjectile",
            pressureClass:
              chamberData.pressureClassId ?? "specializedProjectile",
            // L’interface appartient au chargeur, jamais à la munition libre.
            feedInterfaceIds: [],
            feedInterfaces: [],
            damageTypes: [],
            damageSources:
              prefix === "EM" || prefix === "GAUSS"
                ? ["energy"]
                : ["ballistic"],
            specialTraits: [],
            recoverable: ["DARD", "HARP"].includes(prefix),
            loadOrder: 0,
          },
        },
      ),
    });
  }
}

for (const [weaponName, profile] of Object.entries(BOW_CROSSBOW_PROFILES)) {
  if (!profile.ammunitionFamilyIds?.length) continue;
  const isArrow = profile.chamberingId.startsWith("ARW-");
  const name = `${isArrow ? "Flèche" : "Carreau"} — ${weaponName.toLocaleLowerCase("fr")}`;
  add("material", {
    relisId: profile.chamberingId,
    name,
    type: "ammunition",
    tags: [
      "materiel",
      "munition",
      "projectile",
      isArrow ? "fleche" : "carreau",
    ],
    system: materialSystem(
      `<p>${inlineHtml(name)} conçu pour le standard propre à ${inlineHtml(weaponName)}. Ce projectile se charge à l’unité et peut être récupéré lorsque la fiction le permet.</p>`,
      {
        kind: "ammunition-standard",
        sourceSection: "41.175 et 41.180",
        compatibleWeapon: weaponName,
      },
      {
        physical: { ...physicalBase(), quantity: 1 },
        ammunitionProfile: {
          familyId: "arrow",
          variantId: "standard",
          chamberingId: profile.chamberingId,
          chamberId: profile.chamberingId,
          pressureClassId: "specializedProjectile",
          pressureClass: "specializedProjectile",
          feedInterfaceIds: [],
          feedInterfaces: [],
          damageTypes: [],
          damageSources: ["ballistic"],
          specialTraits: [],
          recoverable: true,
          loadOrder: 0,
        },
      },
    ),
  });
}

for (const row of specialAmmunitionTable.rows) {
  const index =
    entries.filter((entry) => entry.tags?.includes("munition-speciale"))
      .length + 1;
  const name = row[1];
  add("material", {
    relisId: `MAT-AMM-SPC-${String(index).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "ammunition",
    tags: ["materiel", "munition", "munition-speciale"],
    system: materialSystem(
      rowDescription(specialAmmunitionTable.header, row),
      {
        kind: "ammunition-variant",
        sourceSection: specialAmmunitionTable.heading,
        columns: columnsObject(specialAmmunitionTable.header, row),
        restrictions:
          row[
            findColumn(
              specialAmmunitionTable.header,
              "Restrictions principales",
            )
          ],
      },
      {
        level: integerValue(
          row[findColumn(specialAmmunitionTable.header, "Niv.")],
        ),
        referencePrice: {
          amount: priceValue(
            row[findColumn(specialAmmunitionTable.header, "Prix")],
          ),
          currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
          unit: "count",
          quantityBasis: 1,
          sourceRefs: [],
        },
        ammunitionProfile: {
          familyId: "special",
          variantId: AMMUNITION_VARIANT_IDS[name] ?? "",
          chamberingId: "",
          feedInterfaceIds: [],
          effectSummary:
            row[findColumn(specialAmmunitionTable.header, "Effet")],
          specialTraits: [],
          recoverable: false,
          loadOrder: 0,
        },
      },
    ),
  });
}

for (const row of grenadeTable.rows) {
  const index =
    entries.filter((entry) => entry.tags?.includes("explosif-personnel"))
      .length + 1;
  const name = row[1];
  const kind = name.startsWith("Mine")
    ? "mine"
    : name.startsWith("Charge")
      ? "charge"
      : "grenade";
  add("material", {
    relisId: `MAT-CON-EXP-${String(index).padStart(3, "0")}-${slug(name)}`,
    name,
    type: "consumable",
    tags: ["materiel", "consommable", "explosif-personnel"],
    system: materialSystem(
      rowDescription(grenadeTable.header, row),
      {
        kind: "explosive-consumable",
        sourceSection: grenadeTable.heading,
        columns: columnsObject(grenadeTable.header, row),
      },
      {
        level: integerValue(row[findColumn(grenadeTable.header, "Niv.")]),
        referencePrice: {
          amount: priceValue(row[findColumn(grenadeTable.header, "Prix")]),
          currencyRef: reference("MAT-RES-CREDIT", "resource", "Crédit"),
          unit: "count",
          quantityBasis: 1,
          sourceRefs: [],
        },
        consumableProfile: {
          kind,
          actionCost: nullableNumber(
            row[findColumn(grenadeTable.header, "Coût")],
          ),
          area: row[findColumn(grenadeTable.header, "Zone")],
          effectSummary:
            row[findColumn(grenadeTable.header, "Effet principal")],
        },
        energyProfile: {
          kind: "",
          current: null,
          maximum: null,
          rechargeable: false,
        },
      },
    ),
  });
}

// Chargeurs détachables canoniques : seuls les profils explicitement décrits
// comme chargeur, cassette, bande ou tambour deviennent des conteneurs. Les
// magasins internes et barillets restent dans l’arme.
let magazineCounter = 0;
for (const table of feedTables) {
  for (const row of table.rows) {
    const [weaponName, chamberingId, feed] = row;
    if (!/chargeur|cassette|bande|tambour/i.test(feed)) continue;
    magazineCounter += 1;
    const capacity = integerValue(feed.match(/\d+/)?.[0] ?? "");
    const label = `${feed.replace(/,\s*\d+.*/, "")} — ${weaponName}`;
    const canonicalChamberingId =
      chamberingId.match(/^[A-Z0-9-]+/)?.[0] ?? chamberingId;
    const chamberData = chamberDataById.get(canonicalChamberingId) ?? {};
    const interfaceId = feedInterfaceId(feed);
    add("material", {
      relisId: `MAT-CTR-CHG-${String(magazineCounter).padStart(3, "0")}-${slug(weaponName)}`,
      name: label,
      type: "container",
      tags: ["materiel", "conteneur", "chargeur"],
      system: materialSystem(
        `<p><strong>Arme :</strong> ${inlineHtml(weaponName)}</p>\n<p><strong>Chambrage :</strong> ${inlineHtml(chamberingId)}</p>\n<p><strong>Alimentation :</strong> ${inlineHtml(feed)}</p>`,
        {
          kind: "magazine",
          sourceSection: table.heading,
          weaponName,
          chamberingId: canonicalChamberingId,
          feed,
        },
        {
          containerKind: "magazine",
          capacity: { mass: null, volume: null, bulk: null, units: capacity },
          accessRule: "normal",
          magazineProfile: {
            chamberId: canonicalChamberingId,
            pressureClass:
              chamberData.pressureClassId ?? "specializedProjectile",
            interfaceId,
            capacity,
          },
        },
      ),
    });
  }
}

function codeRows(startPrefix, endPrefix, codePrefix) {
  const target = section(startPrefix, endPrefix);
  const seen = new Set();
  const results = [];
  let heading = "";
  for (const line of target.lines) {
    if (/^#{3,6} /.test(line)) heading = clean(line).replace(/^#{3,6}\s+/, "");
    if (!new RegExp(`^\\| ${codePrefix}-\\d{3} \\|`).test(line)) continue;
    const row = parseRow(line);
    if (seen.has(row[0])) continue;
    seen.add(row[0]);
    results.push({ heading, row });
  }
  return results;
}

function genericCatalogEntry({
  relisId,
  name,
  type,
  family,
  sourceSection,
  row,
  tags = [],
  catalog = {},
  overrides = {},
}) {
  const details = row
    .slice(2)
    .map(clean)
    .filter(Boolean)
    .map((value) => inlineHtml(value));
  add("material", {
    relisId,
    name,
    type,
    tags: ["materiel", family, ...tags],
    system: materialSystem(
      `<p><strong>${inlineHtml(name)}</strong> appartient au catalogue ${inlineHtml(family.replaceAll("-", " "))}.</p>${details.length ? `<p>${details.join(". ")}.</p>` : ""}`,
      {
        kind: family,
        sourceSection,
        canonicalRow: row,
        ...catalog,
      },
      overrides,
    ),
  });
}

const stockRows = codeRows("## 47. ", "## 48. ", "STK");
if (stockRows.length !== 48)
  throw new Error(`48 ressources STK attendues, reçu ${stockRows.length}.`);
for (const { heading, row } of stockRows) {
  genericCatalogEntry({
    relisId: row[0],
    name: row[1],
    type: "resource",
    family: "ressource-stock",
    sourceSection: heading,
    row,
    overrides: {
      energyProfile: {
        kind: "",
        current: null,
        maximum: null,
        rechargeable: false,
      },
      currencyProfile: {
        physicalCash: false,
        currencyId: "",
        currencyLabel: "",
        denomination: 1,
      },
    },
  });
}

add("material", {
  relisId: "MAT-RES-CREDIT",
  name: "Crédit physique",
  type: "resource",
  tags: ["materiel", "ressource", "monnaie-physique"],
  system: materialSystem(
    "<p>Crédit matériel porté. Les comptes bancaires, soldes virtuels et virements restent dans 10-J1 et l’application Banque du Datapad.</p>",
    { kind: "physical-currency", sourceSection: "10-E4-P / 10-J1" },
    {
      energyProfile: {
        kind: "",
        current: null,
        maximum: null,
        rechargeable: false,
      },
      currencyProfile: {
        physicalCash: true,
        currencyId: "credit",
        currencyLabel: "Crédit",
        denomination: 1,
      },
    },
  ),
});

const clinicalRows = codeRows("## 54. ", "## 55. ", "CLN");
if (clinicalRows.length !== 48)
  throw new Error(`48 objets CLN attendus, reçu ${clinicalRows.length}.`);
const clinicalEquipment = new Set([
  "CLN-001",
  "CLN-005",
  "CLN-008",
  "CLN-018",
  "CLN-019",
  "CLN-023",
  "CLN-037",
  "CLN-038",
  "CLN-039",
  "CLN-040",
  "CLN-041",
  "CLN-043",
  "CLN-044",
  "CLN-045",
  "CLN-047",
  "CLN-048",
]);
const clinicalContainers = new Set(["CLN-010"]);
for (const { heading, row } of clinicalRows) {
  const type = clinicalContainers.has(row[0])
    ? "container"
    : clinicalEquipment.has(row[0])
      ? "equipment"
      : "consumable";
  const overrides =
    type === "container"
      ? {
          containerKind: "general",
          capacity: { mass: null, volume: 0.5, bulk: null, units: 1 },
          accessRule: "sealed",
          magazineProfile: {},
        }
      : type === "equipment"
        ? {
            energyProfile: {
              kind: "",
              current: null,
              maximum: null,
              rechargeable: false,
            },
            supplyProfile: {},
          }
        : {
            consumableProfile: {
              kind: "medical",
              effectSummary: row.at(-2) ?? "",
            },
            energyProfile: {
              kind: "",
              current: null,
              maximum: null,
              rechargeable: false,
            },
          };
  genericCatalogEntry({
    relisId: row[0],
    name: row[1],
    type,
    family: "clinique",
    sourceSection: heading,
    row,
    overrides,
  });
}

for (const [prefix, expectedCount] of [
  ["ALM", 64],
  ["PHA", 96],
  ["MYS", 96],
  ["UTL", 64],
]) {
  const rows = codeRows("## 55. ", "## 56. ", prefix);
  if (rows.length !== expectedCount)
    throw new Error(
      `${expectedCount} objets ${prefix} attendus, reçu ${rows.length}.`,
    );
  for (const { heading, row } of rows) {
    const numericId = Number(row[0].slice(4));
    let type = "equipment";
    if (
      prefix === "ALM" ||
      prefix === "PHA" ||
      (prefix === "MYS" && Number(row[0].slice(4)) <= 48)
    )
      type = "consumable";
    if (prefix === "MYS" && numericId >= 81) type = "ammunition";
    if (
      prefix === "MYS" &&
      numericId >= 65 &&
      numericId <= 80 &&
      ![69, 74, 79].includes(numericId)
    )
      type = "consumable";
    if (prefix === "UTL" && [29, 39, 63].includes(Number(row[0].slice(4))))
      type = "consumable";
    if (prefix === "UTL" && [41, 42, 61].includes(Number(row[0].slice(4))))
      type = "container";
    const isFocalizer = prefix === "MYS" && numericId >= 49 && numericId <= 64;
    const overrides =
      type === "container"
        ? {
            containerKind: "general",
            capacity: {
              mass: null,
              volume: null,
              bulk: nullableNumber(row[3]),
              units: nullableNumber(row[4]),
            },
            accessRule: "normal",
            magazineProfile: {},
          }
        : type === "consumable"
          ? {
              level: integerValue(row[2]),
              consumableProfile: {
                kind:
                  prefix === "PHA"
                    ? "medical"
                    : prefix === "MYS"
                      ? "matrix"
                      : "utility",
                effectSummary: row.at(-2) ?? row.at(-1) ?? "",
              },
              energyProfile: {
                kind: "",
                current: null,
                maximum: null,
                rechargeable: false,
              },
            }
          : type === "ammunition"
            ? {
                level: integerValue(row[2]),
                ammunitionProfile: {
                  familyId: "technomagical",
                  variantId: "technomagical",
                  chamberingId: "",
                  feedInterfaceIds: [],
                  effectSummary: row.at(-2) ?? "",
                  specialTraits: [],
                  recoverable: false,
                  loadOrder: 0,
                },
              }
            : {
                level: integerValue(row[2]),
                energyProfile: {
                  kind: "",
                  current: null,
                  maximum: null,
                  rechargeable: false,
                },
                supplyProfile: {},
              };
    if (isFocalizer) {
      const ce = integerValue(row[6]);
      overrides.energyProfile = {
        kind: "internal",
        format: "focalizer",
        powerClass: "special",
        technology: "technomagical",
        formatId: "special",
        powerClassId: "special",
        technologyId: "technomagical",
        interfaceId: "",
        current: ce,
        maximum: ce,
        output: null,
        outputClass: "special",
        cycle: "rechargeable",
        rechargeMethod: `Source compatible de ${row[3]}`,
        rechargeMethodId: "technomagical",
        rechargeable: true,
      };
      overrides.physical = {
        ...physicalBase(),
        equipmentProfile: {
          family: "manipulable",
          slotsConfigured: true,
          bodySlots: [],
        },
      };
    }
    const formulaId =
      prefix === "MYS"
        ? row.find((value) => /^(?:MAN|PRA|FLX)-(?:\d+|M)-\d+$/.test(value))
        : "";
    if (formulaId)
      overrides.effectRefs = [reference(formulaId, "power", formulaId)];
    genericCatalogEntry({
      relisId: row[0],
      name: row[1],
      type,
      family:
        prefix === "ALM"
          ? "alimentation"
          : prefix === "PHA"
            ? "pharmacie"
            : prefix === "MYS"
              ? "techno-magie"
              : "utilitaire",
      sourceSection: heading,
      row,
      catalog: {
        ...(formulaId ? { formulaRef: formulaId } : {}),
        ...(isFocalizer
          ? {
              focusProfile: {
                maxRank: integerValue(row[2]),
                source: row[3],
                formulasOrFamily: row[4],
                buffer: row[5],
                ceMaximum: integerValue(row[6]),
                identity: row[7],
                cePerEffectiveRank: "au moins 1 CE par rang effectif",
                bufferRecharge: `source compatible de ${row[3]}`,
                ceDoesNotRefillBuffer: true,
                automationLot: "10-F",
              },
            }
          : {}),
      },
      overrides,
    });
  }
}

add("material", {
  relisId: "MAT-RES-ECARLITHE-BRUTE",
  name: "Écarlithe noire brute",
  type: "resource",
  tags: ["materiel", "ressource", "ecarlithe", "brute"],
  system: materialSystem(
    "<p>Forme naturelle noire de l’Écarlithe. Elle n’est pas installable et n’est pas soumise au questionnaire d’accord.</p>",
    {
      kind: "ecarlithe-raw",
      sourceSection: "93",
      colorState: "black",
      installable: false,
      attunementState: "not-applicable",
    },
    {
      physical: {
        ...physicalBase(),
        equipmentProfile: {
          family: "resource",
          installable: false,
          slotsConfigured: true,
          bodySlots: [],
        },
      },
      energyProfile: {
        kind: "",
        current: null,
        maximum: null,
        rechargeable: false,
      },
      currencyProfile: {
        physicalCash: false,
        currencyId: "",
        currencyLabel: "",
        denomination: 1,
      },
      attunement: {
        state: "not-applicable",
        questionnaireVersion: "",
        answers: {},
        scores: {},
        colorId: "black",
        axisIds: [],
        subjectUuid: "",
        subjectName: "",
        completedAt: "",
        history: [],
      },
    },
  ),
});

add("material", {
  relisId: "MAT-RES-COEUR-ECARLITHE",
  name: "Cœur d’Écarlithe incolore",
  type: "resource",
  tags: ["materiel", "ressource", "ecarlithe", "coeur", "prana"],
  system: materialSystem(
    "<p>Cœur d’Écarlithe incolore, installable et non accordé. Il ne contient aucun CE et n’est jamais une batterie. Le questionnaire détermine sa couleur sans accorder de bonus mécanique en 10-K2-P.</p>",
    {
      kind: "ecarlithe-heart",
      sourceSection: "93–99",
      colorState: "colorless",
      installable: true,
      attunementState: "unattuned",
    },
    {
      physical: {
        ...physicalBase(),
        equipmentProfile: {
          family: "resource",
          functionalCategory: "focus",
          installable: true,
          installationKind: "accessory",
          requiredSlots: { interface: 1 },
          compatibleInterfaces: ["crystalSocket"],
          slotsConfigured: true,
          bodySlots: [],
        },
      },
      energyProfile: {
        kind: "pranaCrystal",
        format: "Cœur d’Écarlithe",
        technology: "Prana",
        technologyId: "pranaCrystal",
        interfaceId: "crystalSocket",
        current: null,
        maximum: null,
        rechargeable: false,
      },
      currencyProfile: {
        physicalCash: false,
        currencyId: "",
        currencyLabel: "",
        denomination: 1,
      },
      attunement: {
        state: "unattuned",
        questionnaireVersion: "",
        answers: {},
        scores: {},
        colorId: "",
        axisIds: [],
        subjectUuid: "",
        subjectName: "",
        completedAt: "",
        history: [],
      },
    },
  ),
});

// Résolution conservatrice des relations qui nomment déjà une autre source
// canonique. Une formulation mécanique (rang, Attribut, Compétence, choix ou
// objet générique) reste dans catalog ; aucune cible n’est inventée.
function normalizedText(value) {
  return clean(value).replaceAll("’", "'").toLocaleLowerCase("fr");
}

function namedReferences(text, candidates, current = null) {
  const haystack = normalizedText(text);
  if (!haystack || /^(aucun|—)$/.test(haystack)) return [];
  const groups = new Map();
  for (const candidate of candidates) {
    if (candidate === current) continue;
    const key = normalizedText(candidate.name);
    if (key.length < 4 || !haystack.includes(key)) continue;
    const list = groups.get(key) ?? [];
    list.push(candidate);
    groups.set(key, list);
  }
  const references = [];
  for (const candidatesWithName of groups.values()) {
    let matches = candidatesWithName;
    const ancestry = current?.system?.catalog?.ancestry;
    const skill = current?.system?.catalog?.skill;
    if (matches.length > 1 && ancestry)
      matches = matches.filter(
        (candidate) => candidate.system?.catalog?.ancestry === ancestry,
      );
    if (matches.length > 1 && skill)
      matches = matches.filter(
        (candidate) => candidate.system?.catalog?.skill === skill,
      );
    if (matches.length !== 1) continue;
    const [match] = matches;
    references.push(reference(match.relisId, match.type, match.name));
  }
  return references.sort((left, right) =>
    left.relisId.localeCompare(right.relisId, "fr"),
  );
}

const talents = entries.filter((entry) => entry.type === "talent");
for (const talent of talents) {
  const prerequisites = String(talent.system.catalog?.prerequisites ?? "");
  talent.system.requirementRefs = namedReferences(
    prerequisites,
    talents,
    talent,
  );
}

const materialEntries = entries.filter((entry) => entry.pack === "material");
for (const entry of entries.filter((candidate) =>
  ["path", "specialization"].includes(candidate.type),
)) {
  const loadout = String(
    entry.system.catalog?.initialLoadout ??
      entry.system.catalog?.primaryLoadout ??
      "",
  );
  entry.system.catalog.loadoutRefs = namedReferences(loadout, materialEntries);
}

const ancestryGroup = entries.find(
  (entry) => entry.relisId === "CRE-ANC-000-BEASTKIN",
);
if (ancestryGroup)
  ancestryGroup.system.catalog.memberRefs = entries
    .filter(
      (entry) =>
        entry.type === "ancestry" &&
        entry.relisId !== ancestryGroup.relisId &&
        entry.name.startsWith("Beastkin "),
    )
    .map((entry) => reference(entry.relisId, entry.type, entry.name));

for (const pathEntry of entries.filter((entry) => entry.type === "path"))
  pathEntry.system.catalog.specializationRefs = entries
    .filter(
      (entry) =>
        entry.type === "specialization" &&
        entry.system.catalog?.pathName === pathEntry.name,
    )
    .map((entry) => reference(entry.relisId, entry.type, entry.name));

const PACK_BY_TYPE = {
  ancestry: "creation-ancestries",
  profile: "creation-profiles",
  origin: "creation-origins",
  advantage: "creation-advantages",
  drawback: "creation-drawbacks",
  post: "creation-posts",
  path: "progression-paths",
  specialization: "progression-specializations",
  action: "progression-actions",
  weapon: "material-weapons",
  armor: "material-armor",
  equipment: "material-equipment",
  consumable: "material-consumables",
  ammunition: "material-ammunition",
  resource: "material-resources",
  container: "material-containers",
};

const WEAPON_FOLDER_LABELS = {
  improvisedMelee: "Mêlée courante et improvisée",
  martialTechnoBlade: "Mêlée martiale et techno-lames",
  handgun: "Armes de poing",
  physicalLongGun: "Armes longues physiques",
  energyLongGun: "Armes longues énergétiques",
  bowCrossbowThrown: "Arcs, arbalètes et armes lancées",
  heavyLauncher: "Armes lourdes et lanceurs",
  naturalSpecial: "Armes naturelles et profils spéciaux",
};

function assignPack(entry) {
  if (entry.type === "talent") {
    const kind = String(entry.system.catalog?.kind ?? "");
    if (kind === "talent-ascendance") return "progression-ancestry-talents";
    if (kind === "talent-competence") return "progression-skill-talents";
    if (kind === "talent-vampirique") return "progression-vampire-talents";
    return "progression-general-talents";
  }
  if (entry.type === "power") {
    if (entry.relisId.startsWith("MAN-")) return "progression-powers-mana";
    if (entry.relisId.startsWith("PRA-")) return "progression-powers-prana";
    return "progression-powers-flux";
  }
  return PACK_BY_TYPE[entry.type];
}

function assignFolder(entry) {
  const catalog = entry.system.catalog ?? {};
  if (entry.type === "origin")
    return String(catalog.kind ?? "Origines").replace(/^origin-/, "");
  if (entry.type === "specialization") return String(catalog.pathName ?? "");
  if (entry.type === "talent")
    return String(
      catalog.ancestry || catalog.skill || catalog.sourceSection || "",
    );
  if (entry.type === "power")
    return `Rang ${String(catalog.rank ?? "non renseigné")}`;
  if (entry.type === "weapon")
    return (
      WEAPON_FOLDER_LABELS[entry.system.weaponProfile?.familyId] ??
      "Autres armes"
    );
  if (entry.type === "armor")
    return String(entry.system.protectionProfile?.kind || "Autres protections");
  if (entry.type === "ammunition")
    return String(
      entry.system.ammunitionProfile?.familyId || "Autres munitions",
    );
  if (entry.type === "container")
    return String(entry.system.containerKind || "Conteneurs généraux");
  if (["equipment", "consumable", "resource"].includes(entry.type))
    return String(catalog.kind || entry.tags?.[1] || "Autres");
  return "";
}

for (const entry of entries) {
  entry.pack = assignPack(entry);
  entry.folder = assignFolder(entry);
  const description = String(entry.system.description ?? "").trim();
  const escapedName = inlineHtml(entry.name);
  if (!description.includes(escapedName))
    entry.system.description = `<p><strong>${escapedName}</strong>.</p>${description}`;
}

const expected = {
  ancestry: 20,
  profile: 52,
  origin: 48,
  advantage: 31,
  drawback: 37,
  post: 11,
  path: 12,
  specialization: 84,
  talent: 1054,
  action: 42,
  power: 252,
  weapon: 111,
  armor: 80,
  equipment: 147,
  consumable: 267,
  ammunition: 66,
  resource: 62,
  container: 28,
};

for (const [type, count] of Object.entries(expected)) {
  const actual = entries.filter((entry) => entry.type === type).length;
  if (actual !== count)
    throw new Error(`${type} : ${count} attendus, reçu ${actual}.`);
}

const dryRun = argv.includes("--dry-run");
if (!dryRun) {
  fs.rmSync(outputRoot, { recursive: true, force: true });
  fs.mkdirSync(outputRoot, { recursive: true });
  for (const { pack, ...entry } of entries) {
    const directory = path.join(
      outputRoot,
      pack,
      entry.folder ? slug(entry.folder).toLocaleLowerCase("fr") : "",
    );
    fs.mkdirSync(directory, { recursive: true });
    const file = path.join(directory, `${entry.relisId}.json`);
    fs.writeFileSync(file, `${JSON.stringify(entry, null, 2)}\n`);
  }
}

const counts = Object.fromEntries(
  [...new Set(entries.map((entry) => entry.pack))]
    .sort()
    .map((pack) => [
      pack,
      entries.filter((entry) => entry.pack === pack).length,
    ]),
);
console.log(
  JSON.stringify({ total: entries.length, counts, expected }, null, 2),
);
