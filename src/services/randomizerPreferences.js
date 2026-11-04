import { config } from "../config/index.js";
import { readJson, updateJson } from "../utils/jsonStore.js";
import { CARD_STYLES, DEFAULT_CARD_STYLE, RANDOM_CARD_STYLE } from "../../shared/randomizerGames.js";

const { randomizerPreferencesPath } = config;

const normalizeChannel = (channel) => `#${String(channel).replace(/^#/, "").toLowerCase()}`;
const isValidSetting = (style) => style === RANDOM_CARD_STYLE || Object.hasOwn(CARD_STYLES, style);

/** The channel's card style setting ({ "#channel": { cardStyle } }); a style id or "random" */
export async function getCardStyleSetting(channel) {
  const data = await readJson(randomizerPreferencesPath, {});
  const style = data[normalizeChannel(channel)]?.cardStyle;
  return isValidSetting(style) ? style : DEFAULT_CARD_STYLE;
}

export async function setCardStyleSetting(channel, cardStyle) {
  if (!isValidSetting(cardStyle)) throw new Error(`Unknown card style: ${cardStyle}`);
  const key = normalizeChannel(channel);
  await updateJson(randomizerPreferencesPath, {}, (data) => ({
    ...data,
    [key]: { ...data[key], cardStyle },
  }));
}

export async function removeCardStyleSetting(channel) {
  await updateJson(randomizerPreferencesPath, {}, ({ [normalizeChannel(channel)]: _removed, ...rest }) => rest);
}
