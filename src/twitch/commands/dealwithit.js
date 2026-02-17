import { randomizerCooldownMessages } from "../../../public/lists/bot-messages.js";
import { isOffCooldown, checkWarning, setWarning } from "../../services/cooldown.js";

export function createDealWithItHandler(io) {
  return (client, target, username, firstParam, isBroadcaster) => {
    // BruvHD special case
    if (target === "#bruvhd") {
      if (["BruvHD", "Frampersand"].includes(username)) {
        io.emit("randomize", username, target);
        console.log("Randomizing on BruvHD channel");
      }
      return;
    }

    if (!isOffCooldown(username, "!dealwithit") && username !== "Frampersand" && !isBroadcaster) {
      if (!checkWarning(username, "!dealwithit")) {
        if (target === "#frampersand") {
          const cooldownMsg = randomizerCooldownMessages(username);
          client.say(target, cooldownMsg);
        } else {
          client.say(target, `I'll kindly ask you to stop spamming please @${username}`);
        }
        setWarning(username, "!dealwithit");
      }
      return;
    }

    let player = username;
    if (firstParam) {
      if (firstParam.startsWith("@")) {
        player = firstParam.slice(1);
      } else {
        client.say(
          target,
          `I'm sorry to say, but that's not a valid user. If you want to use this command for someone else, give me their username properly (prefix it with @, please)`
        );
        return;
      }
    }

    console.log("Randomizing on:", target);
    io.emit("randomize", player, target);
  };
}
