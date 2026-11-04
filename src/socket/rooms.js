import { isJoined } from "../services/channelRegistry.js";

/** Normalize to "#name" and return it only if the bot joined that channel */
export function toJoinedChannel(channel) {
  if (typeof channel !== "string") return null;
  const name = channel.replace(/^#/, "").toLowerCase();
  return isJoined(name) ? `#${name}` : null;
}

/** Every overlay source for a channel (sprites, background, rain, PMD chat, randomizer) */
export function overlayRoom(channel) {
  return `overlay:${channel}`;
}

/** Randomizer overlays only: used to decide whether a roll gets announced in chat */
export function randomizerRoom(channel) {
  return `randomizer:${channel}`;
}
