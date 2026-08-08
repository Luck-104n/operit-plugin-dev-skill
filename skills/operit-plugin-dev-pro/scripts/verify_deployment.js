const state = JSON.parse(getState() || "{}");
const packageId = String(state.package_id || "").trim();
const sourcePath = String(state.source_path || "").trim().replace(/\/+$/, "");
const installedDir = "/sdcard/Android/data/com.ai.assistance.operit/files/packages";

async function run() {
  if (!/^[A-Za-z0-9._-]+$/.test(packageId)) throw new Error("params_json.package_id is invalid");
  if (!sourcePath.startsWith("/sdcard/Download/Operit/dev_package/")) {
    throw new Error("params_json.source_path must be inside /sdcard/Download/Operit/dev_package/");
  }
  const source = await Tools.Files.exists(sourcePath, "android");
  const installedDirectory = await Tools.Files.exists(installedDir, "android");
  const candidates = [];
  if (installedDirectory.exists && installedDirectory.isDirectory) {
    const listing = await Tools.Files.list(installedDir, "android");
    for (const entry of listing.entries) {
      if (entry.name === `${packageId}.toolpkg` || entry.name.includes(packageId)) {
        candidates.push({ name: entry.name, size: entry.size, lastModified: entry.lastModified });
      }
    }
  }
  return {
    success: source.exists && candidates.length > 0,
    package_id: packageId,
    source: { path: sourcePath, exists: source.exists, is_directory: source.isDirectory || false },
    installed_packages_dir_accessible: installedDirectory.exists && installedDirectory.isDirectory,
    installed_candidates: candidates,
    manual_checks: [
      "Confirm manifest version and a unique code marker in the development source",
      "Restart Operit after UI, registration, hook or manifest changes",
      "Open the real UI or call the real tool and inspect runtime logs",
      "Inspect private toolpkg_cache only when current permissions and source layout allow it"
    ]
  };
}

run().then(complete).catch((error) => complete({ success: false, error: String(error && error.message ? error.message : error) }));
