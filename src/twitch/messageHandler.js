import { cleanString } from "../../public/utils/utils.js";
import { REWARD_IDS } from "../config/rewards.js";
import { createRewardHandlers } from "./rewards.js";
import { createCommandHandlers } from "./commands/index.js";
import { welcomeMessages } from "../../public/lists/bot-messages.js";
import { getPortraitUserDataForChannel } from "../services/portrait.js";
import { EVENTS } from "../socket/events.js";

function createMessageHandler(deps) {
  const { client, io } = deps;
  const rainbearerState = { current: null };
  const rewardHandlers = createRewardHandlers({ client, io, rainbearerState });
  const commandHandlers = createCommandHandlers({ io, rainbearerState });

  return async function onMessageHandler(target, context, msg, self) {
    if (self) return;

    const isBroadcaster = context?.badges?.broadcaster;
    const username = context["display-name"];
    const params = cleanString(msg).split(" ");
    const commandName = cleanString(params[0]);
    const firstParam = params[1];
    const rewardId = context["custom-reward-id"];

    // Handle channel rewards
    if (rewardId) {
      const handler = rewardHandlers[rewardId];
      if (handler) {
        handler(target, context, commandName, username);
      }
    }

    // First-time chatter welcome
    if (context["first-msg"] && target === "#frampersand") {
      const welcomeMessage = welcomeMessages(username);
      client.say(target, welcomeMessage);
    }

    // PMD portrait overlay for regular chat (exclude StreamElements and !portrait)
    if (username !== "StreamElements" && commandName !== "!portrait") {
      const userDataForChannel = await getPortraitUserDataForChannel(target);
      io.emit(
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
      if (commandName === "!rainbearer") {
        commandHandler(client, target);
      } else if (commandName === "!dealwithit") {
        commandHandler(client, target, username, firstParam, isBroadcaster);
      } else if (commandName === "!guesswhosback") {
        await commandHandler(client, target, username);
      } else if (commandName === "!portrait") {
        await commandHandler(client, target, username, params, isBroadcaster);
      }
    } else {
      console.log(`[${target}] ${username}: ${msg}`);
    }
  };
}

export { createMessageHandler };
