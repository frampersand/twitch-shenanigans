import { cleanString, safeSay } from "../../utils/helpers.js";
import { botReplies } from "../../../shared/bot-messages.js";
import { OWNER_LOGIN } from "../../config/users.js";
import {
  checkWarning,
  isCoolingDown,
  setWarning,
  startCooldown,
} from "../../services/cooldown.js";
import { isKnownPortrait, updatePortraitUser } from "../../services/portrait.js";

/** Portraits are picked by national dex number */
const DEX_NUMBER = /^\d{1,4}$/;
/** Emotion names are short words like "Happy" or "Teary-Eyed" (a trailing ^ is the flipped version) */
const EMOTION = /^[A-Za-z0-9-]{1,20}\^?$/;
/** A typo doesn't cost the cooldown, so the "not found" reply gets its own short limit instead */
const NOT_FOUND_REPLY_MINUTES = 0.5;

export function createPortraitHandler() {
  return async ({ client, target, username, login, params, isBroadcaster }) => {
    const isOwner = login === OWNER_LOGIN;
    const exempt = isOwner || isBroadcaster;
    if (!exempt && isCoolingDown(login, "!portrait")) {
      if (!checkWarning(login, "!portrait")) {
        await safeSay(client, target, botReplies.spamWarning(username));
        setWarning(login, "!portrait");
      }
      return;
    }

    const portraitName = cleanString(params[1]);
    const variant = cleanString(params[2]);

    if (!portraitName) return;

    try {
      // Saving an unknown number would leave this viewer with a portrait the overlay can't load
      if (!DEX_NUMBER.test(portraitName) || !(await isKnownPortrait(Number(portraitName)))) {
        if (exempt || !isCoolingDown(login, "!portrait:not-found", NOT_FOUND_REPLY_MINUTES)) {
          startCooldown(login, "!portrait:not-found");
          await safeSay(client, target, botReplies.portraitNotFound(username));
        }
        return;
      }

      await updatePortraitUser({
        username,
        portrait: portraitName,
        variant: EMOTION.test(variant) ? variant : "",
        target,
      });
      // Only a saved portrait starts the cooldown
      if (!exempt) startCooldown(login, "!portrait");

      if (isOwner) {
        await safeSay(client, target, botReplies.portraitUpdated(username));
      }
    } catch (err) {
      console.error("Failed to update portrait:", err);
    }
  };
}
