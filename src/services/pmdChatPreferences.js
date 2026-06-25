import { promises as fs } from "fs";
import { config } from "../config/index.js";

const { pmdChatPreferencesPath } = config;
const PREFERENCE_ALIASES = {
  solidbubbles: "solidBubbles",
  solidbubblescolor: "solidBubblesColor",
  bubbletextcolor: "bubbleTextColor",
  chatdirection: "chatDirection",
  portraitshape: "portraitShape",
};
const SUPPORTED_PREFERENCES = new Set(Object.values(PREFERENCE_ALIASES));
const CHAT_DIRECTIONS = new Set(["up", "down"]);
const PORTRAIT_SHAPES = new Set(["square", "round", "rounded"]);
const PORTRAIT_SHAPE_INPUT_ALIASES = {
  square: "square",
  round: "round",
  circle: "round",
  rounded: "rounded",
  default: "rounded",
};

export const DEFAULT_CHANNEL_PREFERENCES = {
  solidBubbles: false,
  solidBubblesColor: "#6961a7",
  bubbleTextColor: "#ffffff",
  chatDirection: "up",
  portraitShape: "rounded",
};

function normalizeChannel(channel) {
  if (!channel) return "";
  const withHash = channel.startsWith("#") ? channel : `#${channel}`;
  return withHash.toLowerCase();
}

function parseBooleanPreference(value) {
  const normalized = String(value).toLowerCase();
  if (["true", "1", "yes", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "off"].includes(normalized)) return false;
  return null;
}

function parseColorPreference(value) {
  let color = String(value).trim();
  if (!color.startsWith("#")) {
    color = `#${color}`;
  }
  if (/^#[0-9a-f]{6}$/i.test(color)) {
    return color.toLowerCase();
  }
  if (/^#[0-9a-f]{3}$/i.test(color)) {
    return color.toLowerCase();
  }
  return null;
}

function parsePreferenceValue(preference, rawValue) {
  const normalizedPreference = PREFERENCE_ALIASES[String(preference).toLowerCase()];
  if (!normalizedPreference || !SUPPORTED_PREFERENCES.has(normalizedPreference)) {
    return { error: "unsupported" };
  }
  if (normalizedPreference === "solidBubbles") {
    const parsed = parseBooleanPreference(rawValue);
    if (parsed === null) return { error: "invalid_boolean" };
    return { value: parsed, preference: normalizedPreference };
  }
  if (normalizedPreference === "solidBubblesColor") {
    const parsed = parseColorPreference(rawValue);
    if (parsed === null) return { error: "invalid_color" };
    return { value: parsed, preference: normalizedPreference };
  }
  if (normalizedPreference === "bubbleTextColor") {
    const parsed = parseColorPreference(rawValue);
    if (parsed === null) return { error: "invalid_color" };
    return { value: parsed, preference: normalizedPreference };
  }
  if (normalizedPreference === "chatDirection") {
    const parsed = String(rawValue).toLowerCase();
    if (!CHAT_DIRECTIONS.has(parsed)) return { error: "invalid_chat_direction" };
    return { value: parsed, preference: normalizedPreference };
  }
  if (normalizedPreference === "portraitShape") {
    const parsed = PORTRAIT_SHAPE_INPUT_ALIASES[String(rawValue).toLowerCase()];
    if (!parsed || !PORTRAIT_SHAPES.has(parsed)) return { error: "invalid_portrait_shape" };
    return { value: parsed, preference: normalizedPreference };
  }
  return { error: "unsupported" };
}

function mergeChannelData(data) {
  const merged = new Map();

  for (const entry of data) {
    const channel = normalizeChannel(entry.channel);
    if (!channel) continue;

    const existing = merged.get(channel) || { channel, preferences: {} };
    existing.preferences = {
      ...existing.preferences,
      ...(entry.preferences || {}),
    };
    merged.set(channel, existing);
  }

  return Array.from(merged.values());
}

async function getPreferencesData() {
  try {
    const contents = await fs.readFile(pmdChatPreferencesPath, "utf-8");
    return mergeChannelData(JSON.parse(contents));
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

async function persistPreferencesData(data) {
  await fs.writeFile(pmdChatPreferencesPath, JSON.stringify(mergeChannelData(data), null, 2));
}

export async function getPmdPreferencesForChannel(target) {
  const data = await getPreferencesData();
  const normalizedTarget = normalizeChannel(target);
  const entry = data.find((item) => normalizeChannel(item.channel) === normalizedTarget);

  return {
    ...DEFAULT_CHANNEL_PREFERENCES,
    ...(entry?.preferences || {}),
  };
}

export async function updatePmdPreference({ target, preference, value }) {
  const parsed = parsePreferenceValue(preference, value);
  if (parsed.error) {
    return { error: parsed.error };
  }

  const data = await getPreferencesData();
  const normalizedTarget = normalizeChannel(target);
  const existingIndex = data.findIndex(
    (entry) => normalizeChannel(entry.channel) === normalizedTarget
  );

  if (existingIndex === -1) {
    data.push({
      channel: normalizedTarget,
      preferences: { [parsed.preference]: parsed.value },
    });
  } else {
    data[existingIndex] = {
      ...data[existingIndex],
      channel: normalizedTarget,
      preferences: {
        ...(data[existingIndex].preferences || {}),
        [parsed.preference]: parsed.value,
      },
    };
  }

  await persistPreferencesData(data);
  return { value: parsed.value, preference: parsed.preference };
}

export function getSupportedPmdPreferences() {
  return Array.from(SUPPORTED_PREFERENCES);
}
