import { cleanString, safeSay } from "../../utils/helpers.js";
import { OWNER_LOGIN } from "../../config/users.js";
import { isOffCooldown, checkWarning, setWarning } from "../../services/cooldown.js";
import { updatePortraitUser } from "../../services/portrait.js";

export function createPortraitHandler() {
  return async ({ client, target, username, login, params, isBroadcaster }) => {
    const isOwner = login === OWNER_LOGIN;
    if (!isOffCooldown(login, "!portrait") && !isOwner && !isBroadcaster) {
      if (!checkWarning(login, "!portrait")) {
        await safeSay(client, target, `I'll kindly ask you to stop spamming please @${username}`);
        setWarning(login, "!portrait");
      }
      return;
    }

    const portraitName = cleanString(params[1]);
    const variant = cleanString(params[2]);

    if (!portraitName) return;

    try {
      await updatePortraitUser({
        username,
        portrait: portraitName,
        variant,
        target,
      });

      if (isOwner) {
        await safeSay(client, target, `Your portrait has been updated successfully @${username}`);
      }
    } catch (err) {
      console.error("Failed to update portrait:", err);
    }
  };
}
