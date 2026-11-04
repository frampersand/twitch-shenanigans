import { botReplies, randomizerCooldownMessages } from "../../../shared/bot-messages.js";
import { gameList, parseDealWithItArgs } from "../../../shared/randomizerGames.js";
import { HOME_CHANNEL, RESTRICTED_RANDOMIZER_CHANNELS } from "../../config/channels.js";
import { OWNER_LOGIN } from "../../config/users.js";
import {
  checkWarning,
  isCoolingDown,
  setWarning,
  startCooldown,
} from "../../services/cooldown.js";
import { randomizeForPlayer } from "../../services/randomizer.js";
import { safeSay } from "../../utils/helpers.js";

/** A typo doesn't cost the cooldown, so the help reply gets its own short limit instead */
const HELP_REPLY_MINUTES = 0.5;

/** `!dealwithit [game] [role] [@user]`, arguments in any order; UNITE when no game is named */
export function createDealWithItHandler(io) {
  const command = "!dealwithit";
  return async ({ client, target, username, login, params, isBroadcaster }) => {
    const args = parseDealWithItArgs(params.slice(1));

    const allowedLogins = RESTRICTED_RANDOMIZER_CHANNELS[target];
    if (allowedLogins) {
      // Listed logins only, no cooldown, always for themselves
      if (allowedLogins.includes(login) && !args.error) {
        console.log(`Randomizing on restricted channel ${target}`);
        await randomizeForPlayer({ client, io, channel: target, player: username, game: args.game, role: args.role });
      }
      return;
    }

    const exempt = login === OWNER_LOGIN || isBroadcaster;
    if (!exempt && isCoolingDown(login, command)) {
      if (!checkWarning(login, command)) {
        const cooldownMsg = target === HOME_CHANNEL
          ? randomizerCooldownMessages(username)
          : botReplies.spamWarning(username);
        await safeSay(client, target, cooldownMsg);
        setWarning(login, command);
      }
      return;
    }

    if (args.error) {
      if (exempt || !isCoolingDown(login, `${command}:help`, HELP_REPLY_MINUTES)) {
        startCooldown(login, `${command}:help`);
        const reply = args.error === "invalid_target"
          ? botReplies.invalidDealTarget()
          : botReplies.randomizerHelp(username, gameList());
        await safeSay(client, target, reply);
      }
      return;
    }

    // Only a roll that goes ahead starts the cooldown
    if (!exempt) startCooldown(login, command);
    console.log(`Randomizing ${args.game}${args.role ? ` (${args.role})` : ""} on:`, target);
    await randomizeForPlayer({
      client,
      io,
      channel: target,
      player: args.target ?? username,
      game: args.game,
      role: args.role,
    });
  };
}
