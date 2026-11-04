import { HOME_CHANNEL } from "../config/channels.js";
import { cleanString, safeSay } from "../utils/helpers.js";
import { createRewardHandlers } from "./rewards.js";
import { createCommandHandlers } from "./commands/index.js";
import { welcomeMessages } from "../../shared/bot-messages.js";
import { getPortraitUserDataForChannel } from "../services/portrait.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";
import { redemptionsViaEventSub } from "../services/twitchConnections.js";
import { logReward } from "../utils/rewardLog.js";

/** Setup commands that would just clutter the PMD chat overlay */
const PMD_HIDDEN_COMMANDS = new Set(["!portrait", "!pmdconfig", "!cardstyle", "!background", "!bg"]);

function createMessageHandler(deps) {
  const { client, io } = deps;
  const handleReward = createRewardHandlers({ client, io });
  const commandHandlers = createCommandHandlers({ io });

  async function handleMessage(target, context, msg) {
    const isBroadcaster = Boolean(context?.badges?.broadcaster);
    const username = context["display-name"] || context.username;
    const login = (context.username || "").toLowerCase();
    const params = cleanString(msg).split(" ");
    const rawCommand = cleanString(params[0]);
    const commandName = rawCommand.toLowerCase();
    const rewardId = context["custom-reward-id"];

    // Handle channel rewards (they get the raw first word: hex colors, dex numbers).
    // Channels connected to EventSub get every redemption from there, so skip the chat copy.
    if (rewardId) {
      const viaEventSub = await redemptionsViaEventSub(target);
      const feature = viaEventSub ? null : await handleReward(target, rewardId, rawCommand, username);
      logReward({
        source: "chat",
        channel: target,
        rewardId,
        user: username,
        input: cleanString(msg),
        outcome: viaEventSub ? "skipped (EventSub handles this channel)" : feature ? `handled as ${feature}` : "not linked to a feature",
      });
    }

    // First-time chatter welcome
    if (context["first-msg"] && target === HOME_CHANNEL) {
      const welcomeMessage = welcomeMessages(username);
      await safeSay(client, target, welcomeMessage);
    }

    // PMD portrait overlay for regular chat (exclude StreamElements and the setup commands)
    if (login !== "streamelements" && !PMD_HIDDEN_COMMANDS.has(commandName)) {
      const userDataForChannel = await getPortraitUserDataForChannel(target);
      io.to(overlayRoom(target)).emit(
        EVENTS.PMD_PORTRAIT,
        username,
        msg,
        userDataForChannel,
        context,
        target
      );
    }

    // Chat commands (ordinary chat isn't logged: the Privacy Policy says messages aren't stored)
    const commandHandler = commandHandlers[commandName];
    if (commandHandler) {
      await commandHandler({ client, target, username, login, params, isBroadcaster });
    }
  }

  return async function onMessageHandler(target, context, msg, self) {
    if (self) return;

    // tmi.js doesn't await listeners, so a throw here would be an unhandled rejection and kill the process
    try {
      await handleMessage(target, context, msg);
    } catch (err) {
      console.error(`[${target}] failed to handle message:`, err);
    }
  };
}

export { createMessageHandler };
