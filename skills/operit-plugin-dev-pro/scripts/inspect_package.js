const state = JSON.parse(getState() || "{}");
const targetPath = String(state.target_path || "").trim().replace(/\/+$/, "");

async function exists(path) {
  return await Tools.Files.exists(path, "android");
}

async function inspectScript(path) {
  const file = await Tools.Files.read({ path, environment: "android" });
  const source = file.content;
  const errors = [];
  const warnings = [];
  if (!/\/\*\s*METADATA[\s\S]*?\*\//.test(source)) errors.push("Missing METADATA block");
  const exportsFound = [...source.matchAll(/exports\.([A-Za-z0-9_]+)/g)].map((match) => match[1]);
  if (exportsFound.length === 0) errors.push("No exports.<toolName> assignment found");
  if (!/\bcomplete\s*\(/.test(source)) warnings.push("No complete(...) call found; this is acceptable when the package only exports tools");
  return { kind: "sandbox_script", target_path: path, exports: [...new Set(exportsFound)], errors, warnings };
}

async function inspectToolPkg(directory) {
  const manifestPath = `${directory}/manifest.json`;
  const hjsonPath = `${directory}/manifest.hjson`;
  const jsonInfo = await exists(manifestPath);
  if (!jsonInfo.exists) {
    const hjsonInfo = await exists(hjsonPath);
    if (hjsonInfo.exists) {
      return { kind: "toolpkg", target_path: directory, errors: [], warnings: ["manifest.hjson exists; inspect its fields against the official guide because this script does not parse HJSON"] };
    }
    return { kind: "directory", target_path: directory, errors: ["Missing manifest.json or manifest.hjson"], warnings: [] };
  }

  const manifestFile = await Tools.Files.read({ path: manifestPath, environment: "android" });
  const manifest = JSON.parse(manifestFile.content);
  const errors = [];
  const warnings = [];
  if (!manifest.toolpkg_id) errors.push("manifest.toolpkg_id is required");
  if (!manifest.version) errors.push("manifest.version is required");
  if (!manifest.main) errors.push("manifest.main is required");
  const references = [];
  if (manifest.main) references.push({ field: "main", path: manifest.main });
  for (const item of manifest.subpackages || []) if (item.entry) references.push({ field: `subpackage:${item.id || "<unknown>"}`, path: item.entry });
  for (const item of manifest.resources || []) if (item.path) references.push({ field: `resource:${item.key || "<unknown>"}`, path: item.path });
  for (const item of manifest.wasm_modules || []) if (item.path) references.push({ field: `wasm:${item.id || "<unknown>"}`, path: item.path });
  for (const reference of references) {
    const info = await exists(`${directory}/${String(reference.path).replace(/^\/+/, "")}`);
    if (!info.exists) errors.push(`Missing ${reference.field} path: ${reference.path}`);
  }
  const localTypes = await exists(`${directory}/types`);
  if (localTypes.exists) warnings.push("types/ is inside the package; shared types should normally be in dev_package/types/");
  return { kind: "toolpkg", target_path: directory, toolpkg_id: manifest.toolpkg_id, version: manifest.version, references_checked: references.length, errors, warnings };
}

async function run() {
  if (!targetPath.startsWith("/sdcard/Download/Operit/dev_package/")) {
    throw new Error("params_json.target_path must be inside /sdcard/Download/Operit/dev_package/");
  }
  const info = await exists(targetPath);
  if (!info.exists) throw new Error(`Target does not exist: ${targetPath}`);
  const report = info.isDirectory ? await inspectToolPkg(targetPath) : await inspectScript(targetPath);
  return { success: report.errors.length === 0, ...report };
}

run().then(complete).catch((error) => complete({ success: false, error: String(error && error.message ? error.message : error) }));
