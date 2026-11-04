import { REWARD_IDS } from "../config/rewards.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";
import { getLastRoll, randomizeForPlayer } from "../services/randomizer.js";
import { setRainbearer } from "../services/rainbearer.js";
import { safeSay } from "../utils/helpers.js";
import { botReplies } from "../../shared/bot-messages.js";

/** Create reward handlers - each receives (target, context, commandName, username) */
export function createRewardHandlers(deps) {
  const { client, io } = deps;

  const handlers = {
    [REWARD_IDS.POKEMON_SPRITE]: (target, context, commandName) => {
      io.to(overlayRoom(target)).emit(EVENTS.SPRITE_NUMBER, commandName);
    },

    // Rerolls the viewer's last game and role (UNITE if they haven't rolled yet)
    [REWARD_IDS.REROLL]: (target, context, commandName, username) =>
      randomizeForPlayer({ client, io, channel: target, player: username, ...getLastRoll(target, username) }),

    [REWARD_IDS.RAIN]: async (target, context, commandName, username) => {
      io.to(overlayRoom(target)).emit(EVENTS.RAIN);
      await setRainbearer(target, username);
      await safeSay(client, target, botReplies.rain(username));
    },

    [REWARD_IDS.BACKGROUND_COLOR]: (target, context, commandName) => {
      let color = commandName[0] === "#" ? commandName.substring(1) : commandName;
      const regex = /^([0-9a-f]{3}){1,2}$/i;
      if (regex.exec(color)) {
        io.to(overlayRoom(target)).emit(EVENTS.COLOR, color);
      } else {
        return safeSay(client, target, botReplies.invalidColor());
      }
    },

    [REWARD_IDS.BACKGROUND_SPRITES]: (target, context, commandName) => {
      const number = parseInt(commandName);
      if (Number.isInteger(number)) {
        io.to(overlayRoom(target)).emit(EVENTS.PATTERN, number);
      } else {
        return safeSay(client, target, botReplies.invalidPattern());
      }
    },
  };

  return handlers;
}
