import { removeChannel } from "./channelRegistry.js";
import { removeCardStyleSetting } from "./randomizerPreferences.js";
import { removeBackgroundSetting } from "./backgroundScenes.js";
import { removePmdPreferences } from "./pmdChatPreferences.js";
import { removeRewardLinks } from "./channelRewards.js";
import { removePortraitUsersForChannel } from "./portrait.js";
import { removeRainbearer } from "./rainbearer.js";
import { getConnectionByLogin, getConnections, removeConnection } from "./twitchConnections.js";
import { unsubscribeBroadcaster } from "./eventSub.js";

/**
 * Remove FramperBot from a channel and delete everything kept about it: the registry entry,
 * settings (card style, PMD chat, background), reward links, viewers' portrait choices, the Rainbearer, the Twitch connection and
 * its EventSub subscription. What the Privacy Policy promises when a broadcaster leaves.
 */
export async function removeChannelAndData(login) {
  const name = login.toLowerCase();
  const channel = `#${name}`;
  const connection = await getConnectionByLogin(name);

  await removeChannel(name);
  await unsubscribeBroadcaster(connection).catch((err) => console.error(`Unsubscribing #${name} failed:`, err.message));
  await removeCardStyleSetting(channel);
  await removeBackgroundSetting(channel);
  await removePmdPreferences(channel);
  await removeRewardLinks(channel);
  await removePortraitUsersForChannel(channel);
  await removeRainbearer(channel);
  if (connection) {
    const userId = Object.entries(await getConnections()).find(([, c]) => c.login === name)?.[0];
    if (userId) await removeConnection(userId);
  }
}
