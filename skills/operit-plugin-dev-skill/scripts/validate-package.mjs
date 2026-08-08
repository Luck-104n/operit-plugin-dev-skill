import { existsSync, readFileSync } from "node:fs";
import { open, readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { inflateRawSync } from "node:zlib";

function fail(messages) {
  for (const message of messages) console.error(`ERROR: ${message}`);
  process.exitCode = 1;
}

function parseMetadata(text, source) {
  const match = text.match(/\/\*\s*METADATA\s*([\s\S]*?)\*\//);
  if (!match) return [`${source}: missing /* METADATA ... */ block`];
  try {
    const metadata = JSON.parse(match[1]);
    const errors = [];
    if (!metadata.name) errors.push(`${source}: METADATA.name is required`);
    if (!Array.isArray(metadata.tools) || metadata.tools.length === 0) errors.push(`${source}: METADATA.tools must be a non-empty array`);
    const names = new Set();
    for (const tool of metadata.tools ?? []) {
      if (!tool.name) errors.push(`${source}: every tool needs a name`);
      if (names.has(tool.name)) errors.push(`${source}: duplicate tool name ${tool.name}`);
      names.add(tool.name);
      if (!text.includes(`exports.${tool.name}`)) errors.push(`${source}: missing exports.${tool.name}`);
    }
    return errors;
  } catch (error) {
    // Official packages also use HJSON-style metadata. Validate its stable
    // structure without executing package source as JavaScript.
    const lines = match[1].split(/\r?\n/);
    const packageName = lines.map((line) => line.match(/^\s*name\s*:\s*["']?([A-Za-z0-9_.-]+)/)?.[1]).find(Boolean);
    const toolsStart = lines.findIndex((line) => /^\s*tools\s*:/.test(line));
    if (!packageName || toolsStart < 0) return [`${source}: METADATA must define name and tools`];
    const toolsIndent = lines[toolsStart].match(/^\s*/)[0].length;
    const candidates = [];
    for (const line of lines.slice(toolsStart + 1)) {
      const indent = line.match(/^\s*/)[0].length;
      if (indent <= toolsIndent && /^\s*\]/.test(line)) break;
      const name = line.match(/^\s*name\s*:\s*["']?([A-Za-z0-9_.-]+)/)?.[1];
      if (name) candidates.push({ indent, name });
    }
    if (candidates.length === 0) return [`${source}: METADATA.tools must contain at least one tool`];
    const toolIndent = Math.min(...candidates.map((item) => item.indent));
    const toolNames = candidates.filter((item) => item.indent === toolIndent).map((item) => item.name);
    const errors = [];
    for (const name of new Set(toolNames)) {
      if (!text.includes(`exports.${name}`)) errors.push(`${source}: missing exports.${name}`);
    }
    return errors;
  }
}

function validateManifest(manifest, hasEntry, source) {
  const errors = [];
  if (!manifest.toolpkg_id) errors.push(`${source}: manifest.toolpkg_id is required`);
  if (!manifest.version) errors.push(`${source}: manifest.version is required`);
  if (!manifest.main) errors.push(`${source}: manifest.main is required`);
  const references = [manifest.main];
  for (const item of manifest.subpackages ?? []) references.push(item.entry);
  for (const item of manifest.resources ?? []) references.push(item.path);
  for (const item of manifest.wasm_modules ?? []) references.push(item.path);
  for (const reference of references.filter(Boolean)) {
    const normalized = String(reference).replaceAll("\\", "/").replace(/^\/+/, "");
    if (!hasEntry(normalized)) errors.push(`${source}: referenced path is missing: ${normalized}`);
  }
  return errors;
}

async function validateDirectory(directory) {
  const manifestPath = path.join(directory, "manifest.json");
  if (!existsSync(manifestPath)) return [`${directory}: manifest.json is required for desktop validation`];
  let manifest;
  try { manifest = JSON.parse(await readFile(manifestPath, "utf8")); }
  catch (error) { return [`${manifestPath}: invalid JSON: ${error.message}`]; }
  return validateManifest(manifest, (entry) => existsSync(path.join(directory, ...entry.split("/"))), manifestPath);
}

async function zipEntries(file) {
  const handle = await open(file, "r");
  try {
    const size = (await handle.stat()).size;
    const tailSize = Math.min(size, 65557);
    const tail = Buffer.alloc(tailSize);
    await handle.read(tail, 0, tailSize, size - tailSize);
    const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (eocd < 0) throw new Error("ZIP end record not found");
    const count = tail.readUInt16LE(eocd + 10);
    const centralOffset = tail.readUInt32LE(eocd + 16);
    const entries = new Map();
    let offset = centralOffset;
    for (let index = 0; index < count; index += 1) {
      const header = Buffer.alloc(46);
      await handle.read(header, 0, 46, offset);
      if (header.readUInt32LE(0) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
      const method = header.readUInt16LE(10);
      const compressedSize = header.readUInt32LE(20);
      const fileNameLength = header.readUInt16LE(28);
      const extraLength = header.readUInt16LE(30);
      const commentLength = header.readUInt16LE(32);
      const localOffset = header.readUInt32LE(42);
      const nameBuffer = Buffer.alloc(fileNameLength);
      await handle.read(nameBuffer, 0, fileNameLength, offset + 46);
      entries.set(nameBuffer.toString("utf8"), { method, compressedSize, localOffset });
      offset += 46 + fileNameLength + extraLength + commentLength;
    }
    return { handle, entries };
  } catch (error) {
    await handle.close();
    throw error;
  }
}

async function readZipEntry(handle, entry) {
  const local = Buffer.alloc(30);
  await handle.read(local, 0, 30, entry.localOffset);
  const nameLength = local.readUInt16LE(26);
  const extraLength = local.readUInt16LE(28);
  const data = Buffer.alloc(entry.compressedSize);
  await handle.read(data, 0, data.length, entry.localOffset + 30 + nameLength + extraLength);
  if (entry.method === 0) return data;
  if (entry.method === 8) return inflateRawSync(data);
  throw new Error(`Unsupported ZIP compression method: ${entry.method}`);
}

async function validateArchive(file) {
  const { handle, entries } = await zipEntries(file);
  try {
    if (!entries.has("manifest.json")) return [`${file}: manifest.json must be at archive root`];
    const manifest = JSON.parse((await readZipEntry(handle, entries.get("manifest.json"))).toString("utf8"));
    return validateManifest(manifest, (entry) => entries.has(entry) || [...entries.keys()].some((name) => name.startsWith(`${entry}/`)), file);
  } finally { await handle.close(); }
}

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: node validate-package.mjs <script.js|ToolPkg directory|file.toolpkg>");
  const resolved = path.resolve(input);
  const info = await stat(resolved);
  let errors;
  if (info.isDirectory()) errors = await validateDirectory(resolved);
  else if (resolved.toLowerCase().endsWith(".toolpkg")) errors = await validateArchive(resolved);
  else errors = parseMetadata(readFileSync(resolved, "utf8"), resolved);
  if (errors.length) return fail(errors);
  console.log(`Validation passed: ${resolved}`);
}

main().catch((error) => fail([error.message]));
