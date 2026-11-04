import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";
import { getLastRoll, randomizeForPlayer } from "../services/randomizer.js";
import { setRainbearer } from "../services/rainbearer.js";
import { featureForReward } from "../services/channelRewards.js";
import { safeSay } from "../utils/helpers.js";
import { botReplies } from "../../shared/bot-messages.js";
import { findScene, randomScene, sceneLabel, SHUFFLE_SCENE } from "../../shared/shaderScenes.js";
import { changeBackgroundLive, getCurrentBackground } from "../services/backgroundScenes.js";

/**
 * Reward features (see shared/features.js). Which reward triggers which feature is per
 * channel (dashboard links, falling back to src/config/rewards.js). Returns
 * handleReward(target, rewardId, input, username), resolving to the feature that ran or null.
 * `input` is the first word of the viewer's text: hex colors, dex numbers.
 */
export function createRewardHandlers(deps) {
  const { client, io } = deps;

  const features = {
    sprite: (target, input) => {
      io.to(overlayRoom(target)).emit(EVENTS.SPRITE_NUMBER, input);
    },

    // Rerolls the viewer's last game and role (UNITE if they haven't rolled yet)
    reroll: (target, input, username) =>
      randomizeForPlayer({ client, io, channel: target, player: username, ...getLastRoll(target, username) }),

    rain: async (target, input, username) => {
      io.to(overlayRoom(target)).emit(EVENTS.RAIN);
      await setRainbearer(target, username);
      await safeSay(client, target, botReplies.rain(username));
    },

    color: (target, input) => {
      const color = input[0] === "#" ? input.substring(1) : input;
      if (/^([0-9a-f]{3}){1,2}$/i.test(color)) {
        io.to(overlayRoom(target)).emit(EVENTS.COLOR, color);
        // The Background source keeps its scene and repaints it in this color
        return changeBackgroundLive(io, target, { color });
      } else {
        return safeSay(client, target, botReplies.invalidColor());
      }
    },

    pattern: (target, input) => {
      const number = parseInt(input, 10);
      if (Number.isInteger(number)) {
        io.to(overlayRoom(target)).emit(EVENTS.PATTERN, number);
      } else {
        return safeSay(client, target, botReplies.invalidPattern());
      }
    },
  };

  /**
   * Animated scene: the viewer names one (or its number), or leaves it empty for a random
   * different one. It takes on the current background color. Viewers can't turn on shuffle.
   */
  features.scene = async (target, input, username) => {
    const named = findScene(input);
    const valid = named && named !== SHUFFLE_SCENE;
    const scene = valid ? named : randomScene((await getCurrentBackground(target)).scene);
    await changeBackgroundLive(io, target, { scene });
    const reply = input && !valid ? botReplies.sceneRedeemedUnknown : botReplies.sceneRedeemed;
    await safeSay(client, target, reply(username, sceneLabel(scene)));
  };

  return async function handleReward(target, rewardId, input, username) {
    const feature = await featureForReward(target, rewardId);
    if (!feature) return null;
    await features[feature](target, input, username);
    return feature;
  };
}
