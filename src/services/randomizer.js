import { randomizerMessages } from "../../shared/bot-messages.js";
import { EVENTS } from "../socket/events.js";
import { randomizerRoom } from "../socket/rooms.js";
import { getUniteRoster } from "./uniteRoster.js";
import { getRandomItem, pause, safeSay } from "../utils/helpers.js";

/** Matches the overlay card animation (5 ticks x 500ms) so chat lands when the card settles */
const CARD_REVEAL_MS = 2500;

/**
 * Pick a pokemon server-side, show it on the channel's randomizer overlays and,
 * when announce is set, post the result to chat once the card reveals.
 */
export async function randomizeForPlayer({ client, io, channel, player, announce = true }) {
  const roster = getUniteRoster();
  if (!roster.length) return;

  const pick = getRandomItem(roster);
  const room = randomizerRoom(channel);
  io.to(room).emit(EVENTS.RANDOMIZE, player, channel, pick.id);

  if (!announce) return;
  // Only talk in chat when an overlay is actually showing the card
  const overlays = await io.in(room).fetchSockets();
  if (!overlays.length) return;

  await pause(CARD_REVEAL_MS);
  await safeSay(client, channel, randomizerMessages(player, pick.name));
}
