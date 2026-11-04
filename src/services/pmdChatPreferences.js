import { readJson, updateJson } from "../utils/jsonStore.js";
import { config } from "../config/index.js";
import {
  DEFAULT_CHANNEL_PREFERENCES,
  getSupportedPmdPreferences,
  parsePreferenceValue,
} from "../../shared/pmdPreferences.js";

export { DEFAULT_CHANNEL_PREFERENCES, getSupportedPmdPreferences };

const { pmdChatPreferencesPath } = config;

function normalizeChannel(channel) {
  if (!channel) return "";
  const withHash = channel.startsWith("#") ? channel : `#${channel}`;
  return withHash.toLowerCase();
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
  return mergeChannelData(await readJson(pmdChatPreferencesPath, []));
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

  const normalizedTarget = normalizeChannel(target);

  await updateJson(pmdChatPreferencesPath, [], (raw) => {
    const data = mergeChannelData(raw);
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
    return mergeChannelData(data);
  });

  return { value: parsed.value, preference: parsed.preference };
}

export async function removePmdPreferences(target) {
  const normalizedTarget = normalizeChannel(target);
  await updateJson(pmdChatPreferencesPath, [], (raw) =>
    mergeChannelData(raw).filter((entry) => normalizeChannel(entry.channel) !== normalizedTarget)
  );
}
