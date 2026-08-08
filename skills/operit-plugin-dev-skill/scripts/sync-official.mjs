import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function parseArgs(argv) {
  const index = argv.indexOf("--operit-root");
  if (index < 0 || !argv[index + 1]) {
    throw new Error("Usage: node sync-official.mjs --operit-root <Operit repository>");
  }
  return path.resolve(argv[index + 1]);
}

async function assertFile(file) {
  try {
    await readFile(file);
  } catch {
    throw new Error(`Required official source is missing: ${file}`);
  }
}

async function listFiles(directory, suffix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(suffix))
    .map((entry) => entry.name)
    .sort();
}

async function main() {
  const operitRoot = parseArgs(process.argv.slice(2));
  const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const docs = ["SCRIPT_DEV_GUIDE.md", "TOOLPKG_FORMAT_GUIDE.md"];
  const sourceTypes = path.join(operitRoot, "examples", "types");
  const targetTypes = path.join(skillRoot, "types");
  const targetReferences = path.join(skillRoot, "references");
  const targetExamples = path.join(skillRoot, "examples");

  await assertFile(path.join(operitRoot, "docs", "SCRIPT_DEV_SKILL.md"));
  await mkdir(targetTypes, { recursive: true });
  await mkdir(targetReferences, { recursive: true });
  await mkdir(targetExamples, { recursive: true });

  for (const name of docs) {
    const source = path.join(operitRoot, "docs", name);
    await assertFile(source);
    await copyFile(source, path.join(targetReferences, name));
  }

  const typeFiles = await listFiles(sourceTypes, ".d.ts");
  const existingTypeFiles = await listFiles(targetTypes, ".d.ts");
  for (const name of existingTypeFiles.filter((item) => !typeFiles.includes(item))) {
    await unlink(path.join(targetTypes, name));
  }
  for (const name of typeFiles) {
    await copyFile(path.join(sourceTypes, name), path.join(targetTypes, name));
  }

  const exampleEntries = await readdir(path.join(operitRoot, "examples"), { withFileTypes: true });
  const scripts = exampleEntries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".ts"))
    .map((entry) => entry.name)
    .sort();
  const toolpkgs = [];
  for (const entry of exampleEntries.filter((item) => item.isDirectory())) {
    try {
      await readFile(path.join(operitRoot, "examples", entry.name, "manifest.json"));
      toolpkgs.push(entry.name);
    } catch {
      // A directory without a manifest is not a ToolPkg example.
    }
  }
  toolpkgs.sort();

  const index = {
    generated_from: operitRoot,
    source_revision: await readFile(path.join(operitRoot, ".git", "HEAD"), "utf8").then((v) => v.trim()).catch(() => null),
    ordinary_script_examples: scripts,
    toolpkg_examples: toolpkgs,
    types: typeFiles,
  };
  await writeFile(path.join(targetExamples, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  console.log(`Synced ${docs.length} guides, ${typeFiles.length} type files, ${scripts.length} script examples and ${toolpkgs.length} ToolPkg examples.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
