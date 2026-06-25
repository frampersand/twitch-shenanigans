import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "../..");

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  cooldownMinutes: 3,
  rootDir,
  portraitsFolder: path.join(rootDir, "public", "assets", "portrait"),
  portraitUserbasePath: path.join(rootDir, "data", "portraitUserbase.json"),
  pmdChatPreferencesPath: path.join(rootDir, "data", "pmdChatPreferences.json"),
  uniteRosterPath: path.join(rootDir, "data", "uniteRoster.json"),
  uniteRosterMetaPath: path.join(rootDir, "data", "uniteRoster.meta.json"),
  uniteAssetsFolder: path.join(rootDir, "data", "unite-assets"),
  pokemonIconsFolder: path.join(rootDir, "public", "assets", "pokemon-icons"),
  twitch: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_AUTH,
  },
};
