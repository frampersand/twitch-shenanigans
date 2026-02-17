import { REWARD_IDS } from "../config/rewards.js";

/** Create reward handlers - each receives (client, io, context, target, commandName, { rainbearer, setRainbearer }) */
export function createRewardHandlers(deps) {
  const { client, io, rainbearerState } = deps;

  const handlers = {
    [REWARD_IDS.POKEMON_SPRITE]: (target, context, commandName) => {
      io.emit("sprite-number", commandName);
    },

    [REWARD_IDS.REROLL]: (target, context, commandName, username) => {
      io.emit("randomize", username, target);
    },

    [REWARD_IDS.RAIN]: (target, context, commandName, username) => {
      rainbearerState.current = username;
      io.emit("rain");
      client.say(
        target,
        `Hear! hear! and rejoice! ${username} has just summoned the rain! And shall be known from now on as The Rainbearer! Summoner of Storms! Harbinger of the chill vibes!`
      );
    },

    [REWARD_IDS.BACKGROUND_COLOR]: (target, context, commandName) => {
      let color = commandName[0] === "#" ? commandName.substring(1) : commandName;
      const regex = /^([0-9a-f]{3}){1,2}$/i;
      if (regex.exec(color)) {
        io.emit("color", color);
      } else {
        client.say(
          target,
          `I'm sorry :( That's not a valid hex color, use https://colorpicker.me/ copy the hex color, and then try again in a bit`
        );
      }
    },

    [REWARD_IDS.BACKGROUND_SPRITES]: (target, context, commandName) => {
      const number = parseInt(commandName);
      if (Number.isInteger(number)) {
        io.emit("pattern", number);
      } else {
        client.say(
          target,
          `I'm sorry but I'll need the number of the pokedex :( Look it up over here -> https://www.pokemon.com/us/pokedex and try again in a bit, please <3`
        );
      }
    },
  };

  return handlers;
}
