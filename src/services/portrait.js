import { config } from "../config/index.js";
import { pmdManifestUrl } from "../../shared/cdn.js";
import { readJson, updateJson } from "../utils/jsonStore.js";
import { getRandomItem } from "../utils/helpers.js";

const { portraitUserbasePath, cdnBaseUrl } = config;

export class PortraitNotFoundError extends Error {}

/**
 * In-memory copy of the userbase. This process is the only writer, so it's loaded
 * once and kept in sync on every update (restart to pick up manual edits).
 */
let userDataCache = null;

export async function getPortraitUserData() {
  if (!userDataCache) {
    userDataCache = readJson(portraitUserbasePath, []).catch((err) => {
      userDataCache = null;
      throw err;
    });
  }
  return userDataCache;
}

export async function getPortraitUserDataForChannel(channel) {
  const data = await getPortraitUserData();
  return data.filter((user) => user.channel === channel);
}

export async function updatePortraitUser({ username, portrait, variant, target }) {
  const newUserData = {
    username,
    portrait: portrait || "",
    variant: variant || "",
    channel: target,
  };

  const next = await updateJson(portraitUserbasePath, [], (data) => {
    const existingIndex = data.findIndex(
      (user) => user.username.toLowerCase() === username.toLowerCase() && user.channel === target
    );

    if (existingIndex !== -1) {
      data[existingIndex] = { ...data[existingIndex], ...newUserData };
    } else {
      data.push(newUserData);
    }
    return data;
  });

  userDataCache = Promise.resolve(next);
  return newUserData;
}

/** How long a fetched portrait manifest is trusted before re-fetching */
const MANIFEST_TTL_MS = 6 * 60 * 60 * 1000;
let manifestCache = null;

/**
 * The CDN's PMD manifest maps each portrait folder ("0025") to its emotions ("Happy").
 * Kept in memory; if a refresh fails, the last good copy keeps serving.
 */
async function getPortraitManifest() {
  if (manifestCache && Date.now() - manifestCache.loadedAt < MANIFEST_TTL_MS) {
    return manifestCache.portraits;
  }

  try {
    const response = await fetch(pmdManifestUrl(cdnBaseUrl));
    if (!response.ok) throw new Error(`PMD manifest request failed with status ${response.status}`);
    const { portraits } = await response.json();
    manifestCache = { loadedAt: Date.now(), portraits };
  } catch (err) {
    if (!manifestCache) throw err;
    console.error("Failed to refresh PMD manifest, keeping the cached one:", err.message);
    manifestCache.loadedAt = Date.now();
  }
  return manifestCache.portraits;
}

/** Get a portrait file path (folder/emotion.png) relative to the CDN's portrait folder */
export async function getPortraitFile(portraitNumber = 0, variant = "") {
  const portraits = await getPortraitManifest();
  const folder = portraitNumber
    ? String(portraitNumber).padStart(4, "0")
    : getRandomItem(Object.keys(portraits));

  const emotions = portraits[folder];
  if (!emotions?.length) {
    throw new PortraitNotFoundError(`No portrait folder: ${folder}`);
  }

  const variantMatch = variant && emotions.find(
    (emotion) => emotion.toLowerCase() === variant.toLowerCase()
  );
  return `${folder}/${variantMatch || getRandomItem(emotions)}.png`;
}
