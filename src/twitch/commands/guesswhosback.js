import { OWNER_LOGIN, OWNER_ALT_LOGINS } from "../../config/users.js";
import { pause, safeSay } from "../../utils/helpers.js";
import { botReplies } from "../../../shared/bot-messages.js";

const ALLOWED_LOGINS = [OWNER_LOGIN, ...OWNER_ALT_LOGINS];

export function createGuessWhosBackHandler() {
  return async ({ client, target, login }) => {
    if (!ALLOWED_LOGINS.includes(login)) {
      await safeSay(client, target, botReplies.guessWhosBackDenied());
      return;
    }

    for (const [i, line] of botReplies.guessWhosBack.entries()) {
      if (i > 0) await pause(2000);
      await safeSay(client, target, line);
    }
  };
}
