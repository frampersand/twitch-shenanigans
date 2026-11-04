/** !pmdconfig parsing, shared by the server (saves it) and the showcase (previews it) */

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

/** Returns { preference, value } or { error } ("unsupported", "invalid_color", ...) */
export function parsePreferenceValue(preference, rawValue) {
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

export function getSupportedPmdPreferences() {
  return Array.from(SUPPORTED_PREFERENCES);
}
