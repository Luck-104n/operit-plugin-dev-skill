const state = JSON.parse(getState() || "{}");
const packageId = String(state.package_id || "").trim();
const skillRoot = "/sdcard/Download/Operit/skills/SandboxPackage_DEV";
const sourceTypes = `${skillRoot}/types`;
const devRoot = "/sdcard/Download/Operit/dev_package";
const targetTypes = `${devRoot}/types`;

async function run() {
  if (!/^[A-Za-z0-9._-]+$/.test(packageId)) {
    throw new Error("params_json.package_id is required and may contain only letters, digits, dot, underscore and hyphen");
  }
  const sourceInfo = await Tools.Files.exists(sourceTypes, "android");
  if (!sourceInfo.exists || !sourceInfo.isDirectory) {
    throw new Error(`Official types directory is missing: ${sourceTypes}. Update SandboxPackage_DEV first.`);
  }
  await Tools.Files.mkdir(devRoot, true, "android");
  await Tools.Files.mkdir(targetTypes, true, "android");
  await Tools.Files.mkdir(`${devRoot}/${packageId}`, true, "android");

  const listing = await Tools.Files.list(sourceTypes, "android");
  const copied = [];
  for (const entry of listing.entries) {
    if (entry.isDirectory || !entry.name.endsWith(".d.ts")) continue;
    await Tools.Files.copy(`${sourceTypes}/${entry.name}`, `${targetTypes}/${entry.name}`, false, "android", "android");
    copied.push(entry.name);
  }
  if (copied.length === 0) throw new Error(`No .d.ts files found in ${sourceTypes}`);
  return {
    success: true,
    package_id: packageId,
    project_dir: `${devRoot}/${packageId}`,
    types_dir: targetTypes,
    copied_type_count: copied.length,
    copied_types: copied.sort()
  };
}

run().then(complete).catch((error) => complete({ success: false, error: String(error && error.message ? error.message : error) }));
