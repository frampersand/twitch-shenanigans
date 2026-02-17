import { cleanString } from "../../../public/utils/utils.js";
import { isOffCooldown, checkWarning, setWarning } from "../../services/cooldown.js";
import { updatePortraitUser } from "../../services/portrait.js";

export function createPortraitHandler(io) {
  return async (client, target, username, params, isBroadcaster) => {
    if (!isOffCooldown(username, "!portrait") && username !== "Frampersand" && !isBroadcaster) {
      if (!checkWarning(username, "!portrait")) {
        client.say(target, `I'll kindly ask you to stop spamming please @${username}`);
        setWarning(username, "!portrait");
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

      if (username === "Frampersand") {
        client.say(target, `Your portrait has been updated successfully @${username}`);
      }
    } catch (err) {
      console.error("Failed to update portrait:", err);
    }
  };
}
