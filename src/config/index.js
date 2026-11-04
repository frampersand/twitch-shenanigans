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
  randomizerPreferencesPath: path.join(dataDir, "randomizerPreferences.json"),
  rostersFolder: path.join(rootDir, "src", "data", "rosters"),
  twitchConnectionsPath: path.join(dataDir, "twitchConnections.json"),
  rewardLinksPath: path.join(dataDir, "rewardLinks.json"),
  channelsPath: path.join(dataDir, "channels.json"),
  /** Safety cap on self-serve sign-ups (Twitch also limits how many chats an unverified bot joins) */
  maxChannels: Number.parseInt(process.env.MAX_CHANNELS ?? "", 10) || 50,
  /** Bump when the EULA or Privacy Policy changes materially; stored with each sign-up */
  termsVersion: "2026-11",
  /** Shared secret for the admin panel and /pmd-user-data. Unset = admin features disabled. */
  adminToken: process.env.ADMIN_TOKEN || "",
  /** Where this app is reachable from the internet, e.g. https://overlay.example.com (no trailing slash) */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  /** Signs login session cookies; without it sessions only last until the next restart */
  sessionSecret: process.env.SESSION_SECRET || "",
  twitch: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_AUTH,
  },
  /**
   * Twitch application (dev.twitch.tv console) for "Log in with Twitch" and EventSub.
   * The URLs are overridable so tests can point them at a fake Twitch.
   */
  twitchApp: {
    clientId: process.env.TWITCH_CLIENT_ID || "",
    clientSecret: process.env.TWITCH_CLIENT_SECRET || "",
    /** Signs EventSub webhook messages (10-100 characters) */
    eventSubSecret: process.env.TWITCH_EVENTSUB_SECRET || "",
    authUrl: process.env.TWITCH_AUTH_URL || "https://id.twitch.tv",
    apiUrl: process.env.TWITCH_API_URL || "https://api.twitch.tv",
  },
};

/** Login needs the Twitch app and a public address for the OAuth redirect */
export const twitchLoginEnabled = Boolean(
  config.twitchApp.clientId && config.twitchApp.clientSecret && config.publicBaseUrl
);
/** EventSub webhooks additionally need the signing secret */
export const eventSubEnabled = twitchLoginEnabled && config.twitchApp.eventSubSecret.length >= 10;

export const oauthRedirectUrl = `${config.publicBaseUrl}/auth/twitch/callback`;
export const eventSubCallbackUrl = `${config.publicBaseUrl}/eventsub/callback`;
