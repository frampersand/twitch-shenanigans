import { cleanString } from "../utils/helpers.js";
import { logReward } from "../utils/rewardLog.js";
import { createRewardHandlers } from "./rewards.js";
import { redemptionEvents } from "../services/eventSub.js";

/**
 * Run EventSub redemptions through the same reward handlers as chat-tagged ones. Handlers
 * get the first word of the viewer's text, like a chat message's first word.
 */
export function listenForRedemptions({ client, io }) {
  const handleReward = createRewardHandlers({ client, io });

  redemptionEvents.on("redemption", async ({ channel, rewardId, rewardTitle, userName, input }) => {
    const log = (outcome) =>
      logReward({ source: "eventsub", channel, rewardId, rewardTitle, user: userName, input, outcome });
    const firstWord = cleanString(cleanString(input).split(" ")[0]);
    try {
      const feature = await handleReward(channel, rewardId, firstWord, userName);
      log(feature ? `handled as ${feature}` : "not linked to a feature");
    } catch (err) {
      log(`failed: ${err.message}`);
      console.error(`[${channel}] reward ${rewardId} failed:`, err);
    }
  });
}
