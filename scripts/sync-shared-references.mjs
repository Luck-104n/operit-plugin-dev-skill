import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = path.join(repoRoot, "shared", "references");
const targets = [
  path.join(repoRoot, "skills", "operit-plugin-dev-skill", "references"),
  path.join(repoRoot, "skills", "operit-plugin-dev-pro", "references"),
];
const files = ["COMPOSE_DSL_RULES.md", "DEBUG_PLAYBOOK.md", "CASE_STUDIES_CMS_CME.md"];

async function main() {
  const checkOnly = process.argv.includes("--check");
  const sources = new Map();
  for (const file of files) sources.set(file, await readFile(path.join(sourceRoot, file)));
  for (const target of targets) {
    if (!checkOnly) await mkdir(target, { recursive: true });
    for (const file of files) {
      const destination = path.join(target, file);
      if (checkOnly) {
        const current = await readFile(destination);
        if (!current.equals(sources.get(file))) throw new Error(`Shared reference is out of sync: ${destination}`);
      } else {
        await copyFile(path.join(sourceRoot, file), destination);
      }
    }
  }
  console.log(checkOnly
    ? `Verified ${files.length} shared references across ${targets.length} skills.`
    : `Synced ${files.length} shared references to ${targets.length} skills.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
