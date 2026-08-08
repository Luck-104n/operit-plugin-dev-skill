import { createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { deflateRawSync } from "node:zlib";

const SKIP_DIRS = new Set([".git", ".idea", ".vscode", "node_modules", "src", "tests", "test"]);
const SKIP_FILES = [/\.ts$/i, /\.tsx$/i, /\.map$/i, /\.log$/i, /\.tmp$/i, /\.bak$/i, /^tsconfig(?:\..+)?\.json$/i, /^package-lock\.json$/i, /^pnpm-lock\.yaml$/i];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosTime(date) {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

async function collect(root, current = root) {
  const files = [];
  for (const entry of await readdir(current, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    if (entry.isFile() && SKIP_FILES.some((pattern) => pattern.test(entry.name))) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await collect(root, full));
    else if (entry.isFile()) files.push({ full, name: path.relative(root, full).split(path.sep).join("/") });
  }
  return files;
}

async function writeZip(files, output) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const file of files) {
    const data = await readFile(file.full);
    const compressed = deflateRawSync(data);
    const name = Buffer.from(file.name, "utf8");
    const modified = dosTime((await stat(file.full)).mtime);
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6);
    local.writeUInt16LE(8, 8); local.writeUInt16LE(modified.time, 10); local.writeUInt16LE(modified.date, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(compressed.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
    chunks.push(local, name, compressed);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0); header.writeUInt16LE(20, 4); header.writeUInt16LE(20, 6); header.writeUInt16LE(0x0800, 8);
    header.writeUInt16LE(8, 10); header.writeUInt16LE(modified.time, 12); header.writeUInt16LE(modified.date, 14);
    header.writeUInt32LE(crc, 16); header.writeUInt32LE(compressed.length, 20); header.writeUInt32LE(data.length, 24); header.writeUInt16LE(name.length, 28); header.writeUInt32LE(offset, 42);
    central.push(header, name);
    offset += local.length + name.length + compressed.length;
  }
  const centralSize = central.reduce((sum, chunk) => sum + chunk.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralSize, 12); end.writeUInt32LE(offset, 16);
  await mkdir(path.dirname(output), { recursive: true });
  const stream = createWriteStream(output);
  for (const chunk of [...chunks, ...central, end]) stream.write(chunk);
  await new Promise((resolve, reject) => { stream.end(resolve); stream.on("error", reject); });
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) throw new Error("Usage: node pack-toolpkg.mjs <directory> [--output file.toolpkg]");
  const root = path.resolve(args[0]);
  const outputIndex = args.indexOf("--output");
  const output = path.resolve(outputIndex >= 0 ? args[outputIndex + 1] : `${root}.toolpkg`);
  const manifest = path.join(root, "manifest.json");
  const parsed = JSON.parse(await readFile(manifest, "utf8"));
  if (!parsed.toolpkg_id || !parsed.main) throw new Error("manifest.toolpkg_id and manifest.main are required");
  const files = await collect(root);
  if (!files.some((file) => file.name === "manifest.json")) throw new Error("manifest.json would not be packaged");
  if (!files.some((file) => file.name === String(parsed.main).replaceAll("\\", "/"))) throw new Error(`manifest.main is missing: ${parsed.main}`);
  await writeZip(files, output);
  console.log(`Packed ${files.length} files: ${output}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
