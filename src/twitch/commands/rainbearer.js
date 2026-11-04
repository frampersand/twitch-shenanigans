import { HOME_CHANNEL } from "../../config/channels.js";
import { getRainbearer } from "../../services/rainbearer.js";
import { safeSay } from "../../utils/helpers.js";
import { botReplies } from "../../../shared/bot-messages.js";

export function createRainbearerHandler() {
  return async ({ client, target }) => {
    if (target !== HOME_CHANNEL) return;

    await safeSay(client, target, botReplies.rainbearer(await getRainbearer(target)));
  };
}
