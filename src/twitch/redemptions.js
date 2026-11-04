import { cleanString } from "../utils/helpers.js";
import { createRewardHandlers } from "./rewards.js";
import { redemptionEvents } from "../services/eventSub.js";

/**
 * Run EventSub redemptions through the same reward handlers as chat-tagged ones. Handlers
 * get the first word of the viewer's text, like a chat message's first word.
 */
export function listenForRedemptions({ client, io }) {
  const rewardHandlers = createRewardHandlers({ client, io });

  redemptionEvents.on("redemption", async ({ channel, rewardId, userName, userLogin, input }) => {
    const handler = rewardHandlers[rewardId];
    if (!handler) return;
    const firstWord = cleanString(cleanString(input).split(" ")[0]);
    try {
      await handler(channel, { username: userLogin, "display-name": userName }, firstWord, userName);
    } catch (err) {
      console.error(`[${channel}] reward ${rewardId} failed:`, err);
    }
  });
}
