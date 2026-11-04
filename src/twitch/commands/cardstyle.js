import { safeSay } from "../../utils/helpers.js";
import { botReplies } from "../../../shared/bot-messages.js";
import { cardStyleLabel, cardStyleList, findCardStyle } from "../../../shared/randomizerGames.js";
import { getCardStyleSetting, setCardStyleSetting } from "../../services/randomizerPreferences.js";

/** `!cardstyle [classic|holo|reel|lockin|random]`: the broadcaster picks the channel's randomizer card */
export function createCardStyleHandler() {
  return async ({ client, target, username, params, isBroadcaster }) => {
    if (!isBroadcaster) return;

    const requested = params[1];
    if (!requested) {
      const current = await getCardStyleSetting(target);
      await safeSay(client, target, botReplies.cardStyleCurrent(cardStyleLabel(current), cardStyleList()));
      return;
    }

    const style = findCardStyle(requested);
    if (!style) {
      await safeSay(client, target, botReplies.cardStyleUnknown(username, cardStyleList()));
      return;
    }
    await setCardStyleSetting(target, style);
    await safeSay(client, target, botReplies.cardStyleSet(username, cardStyleLabel(style)));
  };
}
