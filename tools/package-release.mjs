import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "system.json"), "utf8"),
);
const buildRoot = path.join(root, "build");
const stage = path.join(buildRoot, "release-stage");
const archive = path.join(buildRoot, `relis-v${manifest.version}.zip`);
const entries = [
  "system.json",
  "scripts",
  "styles",
  "templates",
  "lang",
  "LICENSE",
  "README.md",
  "CHANGELOG.md",
];

if (
  path.basename(stage) !== "release-stage" ||
  path.basename(buildRoot) !== "build"
) {
  throw new Error("Cible de préparation de Release invalide.");
}

fs.rmSync(stage, { recursive: true, force: true });
fs.mkdirSync(stage, { recursive: true });
for (const entry of entries)
  fs.cpSync(path.join(root, entry), path.join(stage, entry), {
    recursive: true,
  });
fs.rmSync(archive, { force: true });
execFileSync("zip", ["-q", "-r", archive, "."], {
  cwd: stage,
  stdio: "inherit",
});
console.log(path.relative(root, archive));
