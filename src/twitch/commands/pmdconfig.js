import { EVENTS } from "../../socket/events.js";
import { overlayRoom } from "../../socket/rooms.js";
import { safeSay } from "../../utils/helpers.js";
import { botReplies } from "../../../shared/bot-messages.js";
import {
  getPmdPreferencesForChannel,
  getSupportedPmdPreferences,
  updatePmdPreference,
} from "../../services/pmdChatPreferences.js";

export function createPmdConfigHandler(io) {
  return async ({ client, target, username, params, isBroadcaster }) => {
    if (!isBroadcaster) return;

    const preference = params[1];
    const value = params[2];
    const supported = getSupportedPmdPreferences();

    if (!preference || typeof value === "undefined") {
      await safeSay(client, target, botReplies.pmdUsage(supported));
      return;
    }

    const result = await updatePmdPreference({
      target,
      preference,
      value,
    });

    if (result.error) {
      await safeSay(client, target, botReplies.pmdError(result.error, preference, supported));
      return;
    }

    const channel = target.slice(1).toLowerCase();
    const prefs = await getPmdPreferencesForChannel(target.toLowerCase());
    io.to(overlayRoom(target.toLowerCase())).emit(EVENTS.PMD_CONFIG, channel, prefs);

    await safeSay(client, target, botReplies.pmdSet(username, result.preference, result.value));
  };
}
