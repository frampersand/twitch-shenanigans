/**
 * Games the randomizer can roll for, shared by the bot, the overlay and the showcase.
 * Each game's roster lives in src/data/rosters/<id>.json as { id, name, role } entries.
 */

export const DEFAULT_GAME = "unite";

export const RANDOMIZER_GAMES = {
    unite: {
        name: "Pokémon UNITE",
        aliases: ["unite", "pokemon", "pokemonunite"],
        roles: {
            attacker: { label: "Attacker", color: "#f16c38" },
            allrounder: { label: "All-Rounder", color: "#ce5fd3", aliases: ["all-rounder", "allround"] },
            defender: { label: "Defender", color: "#aced5b" },
            speedster: { label: "Speedster", color: "#29a5e3" },
            supporter: { label: "Supporter", color: "#fecc51", aliases: ["support"] },
        },
    },
    overwatch: {
        name: "Overwatch 2",
        aliases: ["overwatch", "ow", "ow2"],
        // Square headshots with a background, not cutouts: cards show them full-bleed
        opaqueArt: true,
        roles: {
            tank: { label: "Tank", color: "#3b82d6" },
            damage: { label: "Damage", color: "#d6453b", aliases: ["dps"] },
            support: { label: "Support", color: "#2fa86b", aliases: ["healer"] },
        },
    },
    valorant: {
        name: "Valorant",
        aliases: ["valorant", "val", "valo"],
        roles: {
            duelist: { label: "Duelist", color: "#e2474b" },
            initiator: { label: "Initiator", color: "#2fa88f" },
            controller: { label: "Controller", color: "#6c5ce7", aliases: ["smokes"] },
            sentinel: { label: "Sentinel", color: "#d4a20f" },
        },
    },
    rivals: {
        name: "Marvel Rivals",
        aliases: ["rivals", "marvelrivals", "marvel"],
        roles: {
            vanguard: { label: "Vanguard", color: "#3b82d6", aliases: ["tank"] },
            duelist: { label: "Duelist", color: "#d6453b", aliases: ["dps"] },
            strategist: { label: "Strategist", color: "#2fa86b", aliases: ["support", "healer"] },
        },
    },
    league: {
        name: "League of Legends",
        aliases: ["league", "lol"],
        // Riot's loading art is JPEG; every other game's art on the CDN is PNG
        artExtension: "jpg",
        opaqueArt: true,
        roles: {
            fighter: { label: "Fighter", color: "#c0632f", aliases: ["bruiser"] },
            tank: { label: "Tank", color: "#3b82d6" },
            mage: { label: "Mage", color: "#7b5cd6" },
            assassin: { label: "Assassin", color: "#b8325a" },
            marksman: { label: "Marksman", color: "#d4a20f", aliases: ["adc"] },
            support: { label: "Support", color: "#2fa86b" },
        },
    },
};

/** Twitch logins are 1-25 chars of letters, digits and underscores */
const TWITCH_LOGIN = /^[A-Za-z0-9_]{1,25}$/;

export function findGame(word) {
    const wanted = String(word).toLowerCase();
    return Object.keys(RANDOMIZER_GAMES).find(
        (id) => id === wanted || RANDOMIZER_GAMES[id].aliases.includes(wanted)
    ) ?? null;
}

export function findRole(game, word) {
    const wanted = String(word).toLowerCase();
    const roles = RANDOMIZER_GAMES[game]?.roles ?? {};
    // "supports", "tanks" and friends work too
    const candidates = [wanted, wanted.replace(/s$/, "")];
    return Object.keys(roles).find(
        (id) => candidates.some((c) => c === id || roles[id].aliases?.includes(c))
    ) ?? null;
}

export function roleOf(game, role) {
    return RANDOMIZER_GAMES[game]?.roles[role] ?? { label: role, color: "#888888" };
}

/**
 * Read `!dealwithit [game] [role] [@user]` arguments, in any order.
 * Returns { game, role, target } or { error: "invalid_target" | "unknown_option" }.
 */
export function parseDealWithItArgs(args) {
    let target = null;
    const words = [];
    for (const arg of args.filter(Boolean)) {
        if (arg.startsWith("@")) {
            if (target || !TWITCH_LOGIN.test(arg.slice(1))) return { error: "invalid_target" };
            target = arg.slice(1);
        } else {
            words.push(arg);
        }
    }

    const gameIndex = words.findIndex((word) => findGame(word));
    const game = gameIndex === -1 ? DEFAULT_GAME : findGame(words[gameIndex]);
    const rest = words.filter((_, index) => index !== gameIndex);
    if (rest.length > 1) return { error: "unknown_option" };

    let role = null;
    if (rest.length === 1) {
        role = findRole(game, rest[0]);
        if (!role) return { error: "unknown_option" };
    }
    return { game, role, target };
}

/** "unite, overwatch, valorant, rivals or league" for help text */
export function gameList() {
    const ids = Object.keys(RANDOMIZER_GAMES);
    return `${ids.slice(0, -1).join(", ")} or ${ids.at(-1)}`;
}

/** Randomizer card styles a broadcaster can pick with !cardstyle */
export const CARD_STYLES = {
    classic: { label: "Classic", aliases: ["original", "default", "card"] },
    holo: { label: "Holo card", aliases: ["holographic", "foil"] },
    reel: { label: "Slot reel", aliases: ["slot", "slots", "gacha"] },
    lockin: { label: "Lock-in", aliases: ["lock-in", "locked", "select"] },
};
export const DEFAULT_CARD_STYLE = "classic";
/** The setting can also be "random": a different style on every roll */
export const RANDOM_CARD_STYLE = "random";

export function findCardStyle(word) {
    const wanted = String(word).toLowerCase();
    if (["random", "shuffle", "surprise"].includes(wanted)) return RANDOM_CARD_STYLE;
    return Object.keys(CARD_STYLES).find(
        (id) => id === wanted || CARD_STYLES[id].aliases.includes(wanted)
    ) ?? null;
}

/** The style to draw for one roll: the setting itself, or a random style for "random" */
export function resolveCardStyle(setting) {
    if (setting === RANDOM_CARD_STYLE) {
        const ids = Object.keys(CARD_STYLES);
        return ids[Math.floor(Math.random() * ids.length)];
    }
    return Object.hasOwn(CARD_STYLES, setting ?? "") ? setting : DEFAULT_CARD_STYLE;
}

export function cardStyleLabel(setting) {
    return setting === RANDOM_CARD_STYLE ? "a random style every roll" : CARD_STYLES[setting]?.label ?? setting;
}

/** "classic, holo, reel, lockin or random" for help text */
export function cardStyleList() {
    return `${Object.keys(CARD_STYLES).join(", ")} or ${RANDOM_CARD_STYLE}`;
}
