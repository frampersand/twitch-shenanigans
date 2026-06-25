import { EVENTS } from "../../socket/events.js";
import { safeSay } from "../../utils/helpers.js";
import {
  getPmdPreferencesForChannel,
  getSupportedPmdPreferences,
  updatePmdPreference,
} from "../../services/pmdChatPreferences.js";

export function createPmdConfigHandler(io) {
  return async (client, target, username, params, isBroadcaster) => {
    if (!isBroadcaster) return;

    const preference = params[1];
    const value = params[2];

    if (!preference || typeof value === "undefined") {
      const supported = getSupportedPmdPreferences().join(", ");
      await safeSay(
        client,
        target,
        `Usage: !pmdconfig <preference> <value> (available: ${supported}). Example: !pmdconfig chatDirection up`
      );
      return;
    }

    const result = await updatePmdPreference({
      target,
      preference,
      value,
    });

    if (result.error === "unsupported") {
      const supported = getSupportedPmdPreferences().join(", ");
      await safeSay(client, target, `Unsupported preference "${preference}". Available: ${supported}`);
      return;
    }

    if (result.error === "invalid_boolean") {
      await safeSay(client, target, `Preference "${preference}" expects true/false.`);
      return;
    }

    if (result.error === "invalid_chat_direction") {
      await safeSay(client, target, `Preference "${preference}" expects up or down.`);
      return;
    }

    if (result.error === "invalid_color") {
      await safeSay(client, target, `Preference "${preference}" expects a hex color (e.g. #6961a7 or 6961a7).`);
      return;
    }

    if (result.error === "invalid_portrait_shape") {
      await safeSay(client, target, `Preference "${preference}" expects square, round, or rounded.`);
      return;
    }

    const channel = target.slice(1).toLowerCase();
    const prefs = await getPmdPreferencesForChannel(target.toLowerCase());
    io.emit(EVENTS.PMD_CONFIG, channel, prefs);

    await safeSay(
      client,
      target,
      `@${username} set ${result.preference}=${String(result.value)}`
    );
  };
}
