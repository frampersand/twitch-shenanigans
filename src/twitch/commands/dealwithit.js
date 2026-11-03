import { randomizerCooldownMessages } from "../../../shared/bot-messages.js";
import { HOME_CHANNEL, RESTRICTED_RANDOMIZER_CHANNELS } from "../../config/channels.js";
import { OWNER_LOGIN } from "../../config/users.js";
import { isOffCooldown, checkWarning, setWarning } from "../../services/cooldown.js";
import { randomizeForPlayer } from "../../services/randomizer.js";
import { safeSay } from "../../utils/helpers.js";

/** Twitch logins are 1-25 chars of letters, digits and underscores */
const TWITCH_USERNAME = /^[A-Za-z0-9_]{1,25}$/;

export function createDealWithItHandler(io) {
  return async ({ client, target, username, login, params, isBroadcaster }) => {
    const firstParam = params[1];

    const allowedLogins = RESTRICTED_RANDOMIZER_CHANNELS[target];
    if (allowedLogins) {
      if (allowedLogins.includes(login)) {
        console.log(`Randomizing on restricted channel ${target}`);
        await randomizeForPlayer({ client, io, channel: target, player: username });
      }
      return;
    }

    if (!isOffCooldown(login, "!dealwithit") && login !== OWNER_LOGIN && !isBroadcaster) {
      if (!checkWarning(login, "!dealwithit")) {
        if (target === HOME_CHANNEL) {
          const cooldownMsg = randomizerCooldownMessages(username);
          await safeSay(client, target, cooldownMsg);
        } else {
          await safeSay(client, target, `I'll kindly ask you to stop spamming please @${username}`);
        }
        setWarning(login, "!dealwithit");
      }
      return;
    }

    let player = username;
    if (firstParam) {
      const requested = firstParam.slice(1);
      if (firstParam.startsWith("@") && TWITCH_USERNAME.test(requested)) {
        player = requested;
      } else {
        await safeSay(
          client,
          target,
          `I'm sorry to say, but that's not a valid user. If you want to use this command for someone else, give me their username properly (prefix it with @, please)`
        );
        return;
      }
    }

    console.log("Randomizing on:", target);
    await randomizeForPlayer({ client, io, channel: target, player });
  };
}
