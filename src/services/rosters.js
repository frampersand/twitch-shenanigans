import { readFileSync } from "fs";
import path from "path";
import { config } from "../config/index.js";
import { randomizerImageUrl, uniteImageUrl } from "../../shared/cdn.js";
import { RANDOMIZER_GAMES } from "../../shared/randomizerGames.js";

/**
 * Randomizer rosters, one static file per game in src/data/rosters (edit by hand when a
 * game adds characters, and add the art to the sprite CDN). Art is served from the CDN:
 * UNITE from unite/, every other game from randomizer/<game>/.
 */
function imageFor(game, id) {
  if (game === "unite") return uniteImageUrl(id, config.cdnBaseUrl);
  return randomizerImageUrl(game, id, RANDOMIZER_GAMES[game].artExtension, config.cdnBaseUrl);
}

const rosters = Object.fromEntries(
  Object.keys(RANDOMIZER_GAMES).map((game) => {
    const entries = JSON.parse(readFileSync(path.join(config.rostersFolder, `${game}.json`), "utf8"));
    return [game, entries.map((entry) => ({ ...entry, image: imageFor(game, entry.id) }))];
  })
);

/** The game's roster, optionally only one role; [] for an unknown game */
export function getRoster(game, role = null) {
  const roster = rosters[game] ?? [];
  return role ? roster.filter((entry) => entry.role === role) : roster;
}
