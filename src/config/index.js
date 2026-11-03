import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";
import { CDN_BASE_URL } from "../../shared/cdn.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "../..");

dotenv.config();

/** Writable state; DATA_DIR lets tests point it at a temp folder */
const dataDir = process.env.DATA_DIR || path.join(rootDir, "data");

export const config = {
  port: process.env.PORT || 3000,
  cooldownMinutes: 3,
  rootDir,
  dataDir,
  /** Sprite CDN for portraits and UNITE art; CDN_BASE_URL lets tests serve a local manifest */
  cdnBaseUrl: process.env.CDN_BASE_URL || CDN_BASE_URL,
  portraitUserbasePath: path.join(dataDir, "portraitUserbase.json"),
  pmdChatPreferencesPath: path.join(dataDir, "pmdChatPreferences.json"),
  rainbearerPath: path.join(dataDir, "rainbearer.json"),
  uniteRosterPath: path.join(rootDir, "src", "data", "uniteRoster.json"),
  /** Shared secret for the admin panel and /pmd-user-data. Unset = admin features disabled. */
  adminToken: process.env.ADMIN_TOKEN || "",
  twitch: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_AUTH,
  },
};
