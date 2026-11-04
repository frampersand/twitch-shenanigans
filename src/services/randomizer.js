import { randomizerMessages } from "../../shared/bot-messages.js";
import { DEFAULT_GAME, resolveCardStyle } from "../../shared/randomizerGames.js";
import { getCardStyleSetting } from "./randomizerPreferences.js";
import { EVENTS } from "../socket/events.js";
import { randomizerRoom } from "../socket/rooms.js";
import { getRoster } from "./rosters.js";
import { getRandomItem, pause, safeSay } from "../utils/helpers.js";

/** Matches the overlay card animation (5 ticks x 500ms) so chat lands when the card settles */
const CARD_REVEAL_MS = 2500;

/** Each player's last game and role per channel, so the reroll reward rolls the same game */
const lastRolls = new Map();
const MAX_REMEMBERED_ROLLS = 1000;
const rollKey = (channel, player) => `${channel}:${player.toLowerCase()}`;

export function getLastRoll(channel, player) {
  return lastRolls.get(rollKey(channel, player)) ?? { game: DEFAULT_GAME, role: null };
}

/**
 * Pick a character server-side, show it on the channel's randomizer overlays and,
 * when announce is set, post the result to chat once the card reveals.
 */
export async function randomizeForPlayer({
  client,
  io,
  channel,
  player,
  game = DEFAULT_GAME,
  role = null,
  announce = true,
}) {
  const roster = getRoster(game, role);
  if (!roster.length) return;

  const key = rollKey(channel, player);
  lastRolls.delete(key);
  lastRolls.set(key, { game, role });
  // Keep the most recent players only; Maps iterate oldest first
  if (lastRolls.size > MAX_REMEMBERED_ROLLS) lastRolls.delete(lastRolls.keys().next().value);
  const pick = getRandomItem(roster);
  const room = randomizerRoom(channel);
  // The channel's !cardstyle setting; "random" picks a style per roll
  const cardStyle = resolveCardStyle(await getCardStyleSetting(channel));
  io.to(room).emit(EVENTS.RANDOMIZE, player, channel, pick.id, game, cardStyle);

  if (!announce) return;
  // Only talk in chat when an overlay is actually showing the card
  const overlays = await io.in(room).fetchSockets();
  if (!overlays.length) return;

  await pause(CARD_REVEAL_MS);
  await safeSay(client, channel, randomizerMessages(player, pick.name));
}
