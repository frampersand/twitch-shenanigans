import { promises as fs } from "fs";
import path from "path";
import { config } from "../../config/index.js";

const { uniteRosterPath, uniteRosterMetaPath, uniteAssetsFolder } = config;

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

async function readJson(filePath, fallback) {
  try {
    const contents = await fs.readFile(filePath, "utf-8");
    return JSON.parse(contents);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function ensureUniteAssetsFolder() {
  await fs.mkdir(uniteAssetsFolder, { recursive: true });
}

export async function getUniteRoster() {
  return readJson(uniteRosterPath, []);
}

export async function saveUniteRoster(roster) {
  await writeJson(uniteRosterPath, roster);
}

export async function getUniteRosterMeta() {
  const meta = await readJson(uniteRosterMetaPath, {
    lastSync: null,
    connectChecks: {},
  });
  if (!meta.connectChecks) meta.connectChecks = {};
  return meta;
}

export async function saveUniteRosterMeta(meta) {
  await writeJson(uniteRosterMetaPath, meta);
}

export function isSyncStale(lastSync, maxAgeMs = 24 * 60 * 60 * 1000) {
  if (!lastSync) return true;
  const last = new Date(lastSync).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last >= maxAgeMs;
}

export function hasChannelBeenCheckedToday(meta, channel) {
  const key = todayKey();
  const checked = meta.connectChecks?.[key] || [];
  return checked.includes(channel.toLowerCase());
}

export function markChannelCheckedToday(meta, channel) {
  const key = todayKey();
  const normalized = channel.toLowerCase();
  const checked = new Set(meta.connectChecks?.[key] || []);
  checked.add(normalized);
  meta.connectChecks[key] = Array.from(checked);
  return meta;
}

export function getLocalImagePath(slug) {
  return `/unite-assets/${slug}.png`;
}

export function getLocalImageFile(slug) {
  return path.join(uniteAssetsFolder, `${slug}.png`);
}
