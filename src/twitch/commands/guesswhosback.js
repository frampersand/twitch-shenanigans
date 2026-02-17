import { pause } from "../../utils/helpers.js";

const ALLOWED_USERS = ["Frampersand", "FrampsCodes"];

export function createGuessWhosBackHandler() {
  return async (client, target, username) => {
    if (!ALLOWED_USERS.includes(username)) {
      client.say(target, `Certainly not Frampersand, that's for sure`);
      return;
    }

    client.say(target, `Guess who's back catJAM`);
    await pause(2000);
    client.say(target, `Back again catJAM`);
    await pause(2000);
    client.say(target, `Framps is back catJAM`);
    await pause(2000);
    client.say(target, `Tell a friend catJAM`);
  };
}
