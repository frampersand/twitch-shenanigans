import { OWNER_LOGIN, OWNER_ALT_LOGINS } from "../../config/users.js";
import { pause, safeSay } from "../../utils/helpers.js";

const ALLOWED_LOGINS = [OWNER_LOGIN, ...OWNER_ALT_LOGINS];

export function createGuessWhosBackHandler() {
  return async ({ client, target, login }) => {
    if (!ALLOWED_LOGINS.includes(login)) {
      await safeSay(client, target, `Certainly not Frampersand, that's for sure`);
      return;
    }

    await safeSay(client, target, `Guess who's back catJAM`);
    await pause(2000);
    await safeSay(client, target, `Back again catJAM`);
    await pause(2000);
    await safeSay(client, target, `Framps is back catJAM`);
    await pause(2000);
    await safeSay(client, target, `Tell a friend catJAM`);
  };
}
