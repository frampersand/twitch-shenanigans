/**
 * What viewers can do, described once for every page that explains it
 * (the home page and the showcase). The bot's behavior lives in src/twitch.
 */

export const REWARD_INFO = [
    {
        id: "rain",
        title: "Summon the rain",
        description: "Rain falls on stream, with sound, and you become the Rainbearer",
        color: "#2f6fe4",
    },
    {
        id: "sprite",
        title: "Pokémon sprite",
        description: "Adds an animated Pokémon to the border of the stream",
        color: "#e8a33c",
    },
    {
        id: "color",
        title: "Background color",
        description: "Repaints the stream background with any hex color",
        color: "#d9468f",
    },
    {
        id: "pattern",
        title: "Background pattern",
        description: "Fills the background with drifting icons of one Pokémon",
        color: "#3fae6a",
    },
    {
        id: "reroll",
        title: "Randomizer reroll",
        description: "Rolls again in your last game, skipping the !dealwithit cooldown",
        color: "#8f5bff",
    },
];

export const COMMAND_INFO = [
    {
        name: "!dealwithit",
        usage: "!dealwithit [game] [role] [@user]",
        description: "Roll a random pick in Pokémon UNITE, Overwatch 2, Valorant, Marvel Rivals or League of Legends, for you or someone else",
        who: "Anyone, 3 min cooldown",
        example: "!dealwithit overwatch support",
    },
    {
        name: "!portrait",
        usage: "!portrait <dex number> [emotion]",
        description: "Pick the PMD portrait shown next to your messages",
        who: "Anyone",
        example: "!portrait 25 happy",
    },
    {
        name: "!rainbearer",
        usage: "!rainbearer",
        description: "Ask who last summoned the rain",
        who: "Anyone, home channel",
        example: "!rainbearer",
    },
    {
        name: "!pmdconfig",
        usage: "!pmdconfig <setting> <value>",
        description: "Change how the PMD chat looks: direction, bubbles, colors, portrait shape",
        who: "Broadcaster",
        example: "!pmdconfig solidBubbles true",
        broadcasterOnly: true,
    },
    {
        name: "!cardstyle",
        usage: "!cardstyle <style>",
        description: "Pick the channel's randomizer card: classic, holo, reel, lockin, or random for a different one every roll",
        who: "Broadcaster",
        example: "!cardstyle random",
        broadcasterOnly: true,
    },
    {
        name: "!guesswhosback",
        usage: "!guesswhosback",
        description: "A little song from the bot",
        who: "Owner only",
        example: "!guesswhosback",
        // Owner-only easter egg: still works when typed, but isn't advertised anywhere
        hidden: true,
    },
];

/** Small line icons for the rewards (24x24 viewBox, stroke-drawn) */
export const REWARD_ICONS = {
    rain: '<path d="M7 15a4 4 0 1 1 .8-7.9A5 5 0 0 1 17.5 9 3 3 0 0 1 17 15H7z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>',
    sprite: '<path d="M12 3l2.2 5.6L20 9l-4.5 3.8L17 19l-5-3.2L7 19l1.5-6.2L4 9l5.8-.4z"/>',
    color: '<circle cx="12" cy="12" r="8"/><circle cx="9" cy="10" r="1.2"/><circle cx="14" cy="9" r="1.2"/><circle cx="15.5" cy="13.5" r="1.2"/>',
    pattern: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    reroll: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/><circle cx="12" cy="12" r="1.2"/>',
};
