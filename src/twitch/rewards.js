import { REWARD_IDS } from "../config/rewards.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";
import { randomizeForPlayer } from "../services/randomizer.js";
import { setRainbearer } from "../services/rainbearer.js";
import { safeSay } from "../utils/helpers.js";

/** Create reward handlers - each receives (target, context, commandName, username) */
export function createRewardHandlers(deps) {
  const { client, io } = deps;

  const handlers = {
    [REWARD_IDS.POKEMON_SPRITE]: (target, context, commandName) => {
      io.to(overlayRoom(target)).emit(EVENTS.SPRITE_NUMBER, commandName);
    },

    [REWARD_IDS.REROLL]: (target, context, commandName, username) =>
      randomizeForPlayer({ client, io, channel: target, player: username }),

    [REWARD_IDS.RAIN]: async (target, context, commandName, username) => {
      io.to(overlayRoom(target)).emit(EVENTS.RAIN);
      await setRainbearer(target, username);
      await safeSay(
        client,
        target,
        `Hear! hear! and rejoice! ${username} has just summoned the rain! And shall be known from now on as The Rainbearer! Summoner of Storms! Harbinger of the chill vibes!`
      );
    },

    [REWARD_IDS.BACKGROUND_COLOR]: (target, context, commandName) => {
      let color = commandName[0] === "#" ? commandName.substring(1) : commandName;
      const regex = /^([0-9a-f]{3}){1,2}$/i;
      if (regex.exec(color)) {
        io.to(overlayRoom(target)).emit(EVENTS.COLOR, color);
      } else {
        return safeSay(
          client,
          target,
          `I'm sorry :( That's not a valid hex color, use https://colorpicker.me/ copy the hex color, and then try again in a bit`
        );
      }
    },

    [REWARD_IDS.BACKGROUND_SPRITES]: (target, context, commandName) => {
      const number = parseInt(commandName);
      if (Number.isInteger(number)) {
        io.to(overlayRoom(target)).emit(EVENTS.PATTERN, number);
      } else {
        return safeSay(
          client,
          target,
          `I'm sorry but I'll need the number of the pokedex :( Look it up over here -> https://www.pokemon.com/us/pokedex and try again in a bit, please <3`
        );
      }
    },
  };

  return handlers;
}
