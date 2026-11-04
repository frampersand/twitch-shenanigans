import { config } from "../config/index.js";
import { REWARD_IDS } from "../config/rewards.js";
import { readJson, updateJson } from "../utils/jsonStore.js";
import { REWARD_INFO } from "../../shared/features.js";

/**
 * Which channel point reward triggers which feature, per channel, as linked on the dashboard:
 * { "#channel": { rain: "<reward id>", sprite: ..., color: ..., pattern: ..., reroll: ... } }.
 * The IDs in src/config/rewards.js still work for any feature a channel hasn't linked.
 */
export const REWARD_FEATURES = REWARD_INFO.map((reward) => reward.id);

const LEGACY_FEATURES = {
  [REWARD_IDS.RAIN]: "rain",
  [REWARD_IDS.POKEMON_SPRITE]: "sprite",
  [REWARD_IDS.BACKGROUND_COLOR]: "color",
  [REWARD_IDS.BACKGROUND_SPRITES]: "pattern",
  [REWARD_IDS.REROLL]: "reroll",
};

const { rewardLinksPath } = config;
const normalizeChannel = (channel) => `#${String(channel).replace(/^#/, "").toLowerCase()}`;
let cache = null;

async function load() {
  if (!cache) cache = await readJson(rewardLinksPath, {});
  return cache;
}

export async function getRewardLinks(channel) {
  return { ...(await load())[normalizeChannel(channel)] };
}

/** Link a feature to a reward id, or unlink it with null */
export async function setRewardLink(channel, feature, rewardId) {
  if (!REWARD_FEATURES.includes(feature)) throw new Error(`Unknown reward feature: ${feature}`);
  const key = normalizeChannel(channel);
  cache = await updateJson(rewardLinksPath, {}, (data) => {
    const links = { ...data[key] };
    if (rewardId) links[feature] = rewardId;
    else delete links[feature];
    // A reward triggers one feature: linking it here unlinks it elsewhere
    for (const [other, id] of Object.entries(links)) {
      if (other !== feature && rewardId && id === rewardId) delete links[other];
    }
    return { ...data, [key]: links };
  });
  return getRewardLinks(channel);
}

/** The feature a redemption should trigger on this channel, or null */
export async function featureForReward(channel, rewardId) {
  const links = await getRewardLinks(channel);
  const linked = Object.entries(links).find(([, id]) => id === rewardId)?.[0];
  if (linked) return linked;
  const legacy = LEGACY_FEATURES[rewardId];
  return legacy && !links[legacy] ? legacy : null;
}
