import { OWNER_LOGIN } from "./users.js";

/** Channels the bot joins */
export const channels = [
    "frampersand",
    "joesbeard",
    "frampscodes",
    "azurequality",
    "bruvhd",
    "drednah"
];

/** The broadcaster's own channel: first-chatter welcomes, !rainbearer, themed cooldown lines, admin default */
export const HOME_CHANNEL = `#${OWNER_LOGIN}`;

/**
 * Channels where !dealwithit is limited to these logins (no cooldown, no @target).
 * Every other channel lets anyone roll, with a cooldown.
 */
export const RESTRICTED_RANDOMIZER_CHANNELS = {
    "#bruvhd": ["bruvhd", OWNER_LOGIN],
};
