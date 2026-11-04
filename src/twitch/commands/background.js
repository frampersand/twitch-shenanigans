import { safeSay } from "../../utils/helpers.js";
import { botReplies } from "../../../shared/bot-messages.js";
import { findScene, normalizeColor, randomScene, sceneLabel, sceneList, SHUFFLE_SCENE } from "../../../shared/shaderScenes.js";
import {
  changeBackgroundLive,
  getBackgroundDefault,
  getCurrentBackground,
  resetBackground,
} from "../../services/backgroundScenes.js";

const OWN_COLORS = ["off", "none", "own", "default"];

/**
 * `!background <scene|number|plain|random|shuffle>`, `!background color <hex|off>` and
 * `!background reset`: the broadcaster changes the Background source for this stream (the
 * default look is set on the dashboard). `!bg` is the short form.
 */
export function createBackgroundHandler(io) {
  return async ({ client, target, username, params, isBroadcaster }) => {
    if (!isBroadcaster) return;

    const requested = params[1]?.toLowerCase();
    if (!requested) {
      const [now, fallback] = [await getCurrentBackground(target), await getBackgroundDefault(target)];
      await safeSay(client, target, botReplies.backgroundStatus(sceneLabel(now.scene), now.color, sceneLabel(fallback.scene), sceneList()));
      return;
    }

    if (requested === "reset") {
      const look = await resetBackground(io, target);
      await safeSay(client, target, botReplies.backgroundReset(username, sceneLabel(look.scene)));
      return;
    }

    if (requested === "color" || requested === "colour" || requested === "tint") {
      const value = params[2]?.toLowerCase();
      const color = OWN_COLORS.includes(value) ? null : normalizeColor(value);
      if (color === null && !OWN_COLORS.includes(value)) {
        await safeSay(client, target, botReplies.backgroundColorUsage(username));
        return;
      }
      await changeBackgroundLive(io, target, { color });
      await safeSay(client, target, botReplies.backgroundColorSet(username, color));
      return;
    }

    let scene = findScene(requested);
    if (requested === "random") {
      const current = await getCurrentBackground(target);
      scene = randomScene(current.scene === SHUFFLE_SCENE ? undefined : current.scene);
    }
    if (!scene) {
      await safeSay(client, target, botReplies.backgroundUnknown(username, sceneList()));
      return;
    }
    await changeBackgroundLive(io, target, { scene });
    await safeSay(client, target, botReplies.backgroundSet(username, sceneLabel(scene)));
  };
}
