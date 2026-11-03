import { HOME_CHANNEL } from "../../config/channels.js";
import { getRainbearer } from "../../services/rainbearer.js";
import { safeSay } from "../../utils/helpers.js";

export function createRainbearerHandler() {
  return async ({ client, target }) => {
    if (target !== HOME_CHANNEL) return;

    const rainbearer = await getRainbearer(target);
    if (!rainbearer) {
      await safeSay(client, target, `There's currently not a rainbearer yet`);
    } else {
      await safeSay(
        client,
        target,
        `The current Rainbearer is ${rainbearer}, pay your respects if you may, for they brought the downpour sounds for our enjoyment!`
      );
    }
  };
}
