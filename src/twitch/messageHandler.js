import { HOME_CHANNEL } from "../config/channels.js";
import { cleanString, safeSay } from "../utils/helpers.js";
import { createRewardHandlers } from "./rewards.js";
import { createCommandHandlers } from "./commands/index.js";
import { welcomeMessages } from "../../shared/bot-messages.js";
import { getPortraitUserDataForChannel } from "../services/portrait.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";

function createMessageHandler(deps) {
  const { client, io } = deps;
  const rewardHandlers = createRewardHandlers({ client, io });
  const commandHandlers = createCommandHandlers({ io });

  async function handleMessage(target, context, msg) {
    const isBroadcaster = Boolean(context?.badges?.broadcaster);
    const username = context["display-name"] || context.username;
    const login = (context.username || "").toLowerCase();
    const params = cleanString(msg).split(" ");
    const rawCommand = cleanString(params[0]);
    const commandName = rawCommand.toLowerCase();
    const rewardId = context["custom-reward-id"];

    // Handle channel rewards (they get the raw first word: hex colors, dex numbers)
    if (rewardId) {
      const handler = rewardHandlers[rewardId];
      if (handler) {
        await handler(target, context, rawCommand, username);
      }
    }

    // First-time chatter welcome
    if (context["first-msg"] && target === HOME_CHANNEL) {
      const welcomeMessage = welcomeMessages(username);
      await safeSay(client, target, welcomeMessage);
    }

    // PMD portrait overlay for regular chat (exclude StreamElements and commands)
    if (login !== "streamelements" && commandName !== "!portrait" && commandName !== "!pmdconfig") {
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

    // Chat commands
    const commandHandler = commandHandlers[commandName];
    if (commandHandler) {
      await commandHandler({ client, target, username, login, params, isBroadcaster });
    } else {
      console.log(`[${target}] ${username}: ${msg}`);
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
