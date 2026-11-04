import { REWARD_IDS } from "../config/rewards.js";

/**
 * One line per channel point redemption, from chat or EventSub, while rewards are being
 * tested. LOG_REWARDS=false turns it off.
 */
const enabled = process.env.LOG_REWARDS !== "false";
const KNOWN_REWARDS = Object.fromEntries(Object.entries(REWARD_IDS).map(([name, id]) => [id, name.toLowerCase()]));
const MAX_INPUT = 40;

export function logReward({ source, channel, rewardId, rewardTitle, user, input = "", outcome }) {
  if (!enabled) return;
  const name = rewardTitle ? `"${rewardTitle}"` : KNOWN_REWARDS[rewardId] ?? "unknown reward";
  const text = input ? ` text="${input.length > MAX_INPUT ? `${input.slice(0, MAX_INPUT)}…` : input}"` : " (no text)";
  console.log(`[reward] ${channel} ${source}: ${user} redeemed ${name} (${rewardId})${text} -> ${outcome}`);
}

export const rewardLogEnabled = enabled;
