import { readFileSync } from "fs";
import { config } from "../config/index.js";
import { uniteImageUrl } from "../../shared/cdn.js";

/**
 * The UNITE roster is static (the game is winding down); edit src/data/uniteRoster.json
 * by hand and add the image to the sprite CDN's unite/ folder for new releases.
 */
const roster = JSON.parse(readFileSync(config.uniteRosterPath, "utf8")).map((entry) => ({
  ...entry,
  image: uniteImageUrl(entry.id, config.cdnBaseUrl),
}));

export function getUniteRoster() {
  return roster;
}
