import { createRainbearerHandler } from "./rainbearer.js";
import { createDealWithItHandler } from "./dealwithit.js";
import { createGuessWhosBackHandler } from "./guesswhosback.js";
import { createPortraitHandler } from "./portrait.js";

export function createCommandHandlers(deps) {
  const { io, rainbearerState } = deps;

  return {
    "!rainbearer": createRainbearerHandler(rainbearerState),
    "!dealwithit": createDealWithItHandler(io),
    "!guesswhosback": createGuessWhosBackHandler(),
    "!portrait": createPortraitHandler(io),
  };
}
