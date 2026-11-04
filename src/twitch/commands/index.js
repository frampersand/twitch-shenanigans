import { createRainbearerHandler } from "./rainbearer.js";
import { createDealWithItHandler } from "./dealwithit.js";
import { createGuessWhosBackHandler } from "./guesswhosback.js";
import { createPortraitHandler } from "./portrait.js";
import { createPmdConfigHandler } from "./pmdconfig.js";
import { createCardStyleHandler } from "./cardstyle.js";
import { createBackgroundHandler } from "./background.js";

/**
 * Chat commands keyed by lowercase name. Every handler receives
 * { client, target, username, login, params, isBroadcaster }.
 */
export function createCommandHandlers(deps) {
  const { io } = deps;

  return {
    "!rainbearer": createRainbearerHandler(),
    "!dealwithit": createDealWithItHandler(io),
    "!guesswhosback": createGuessWhosBackHandler(),
    "!portrait": createPortraitHandler(),
    "!pmdconfig": createPmdConfigHandler(io),
    "!cardstyle": createCardStyleHandler(),
    "!background": createBackgroundHandler(io),
    "!bg": createBackgroundHandler(io),
  };
}
