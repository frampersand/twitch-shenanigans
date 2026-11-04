import { loadRoster } from "../../utils/loadRoster.js";
import { DEFAULT_GAME, RANDOMIZER_GAMES, roleOf } from "/shared/randomizerGames.js";
import { gameLogoUrl } from "/shared/cdn.js";

/**
 * The alternative randomizer cards a broadcaster can pick with !cardstyle (the classic card
 * is randomizer.js). Each reveals the pick at REVEAL_MS (when the bot posts the result in
 * chat), holds, then fades out.
 */
export const REVEAL_MS = 2500;
const FADE_AT_MS = 6500;
const REMOVE_AT_MS = 8000;

export const DESIGNS = {
    holo: { name: "Holo card", description: "A trading card shuffles face-down, then flips to reveal the pick, with a holographic sheen" },
    reel: { name: "Slot reel", description: "A strip of portraits spins and slows down onto the pick, like a gacha roll" },
    lockin: { name: "Lock-in", description: "A character-select banner: names flicker, then it flashes and stamps LOCKED IN" },
};
export const DEFAULT_DESIGN = "holo";

const pick = (items) => items[Math.floor(Math.random() * items.length)];
const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
};

/** Character art, or the name's initials if the image is missing */
function art(entry, className) {
    const box = el("div", className);
    const img = el("img");
    img.alt = "";
    img.src = entry.image ?? "";
    img.addEventListener("error", () => {
        img.remove();
        box.classList.add("no-art");
        box.appendChild(el("span", "art-initials", entry.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 3)));
    });
    if (!entry.image) img.dispatchEvent(new Event("error"));
    box.appendChild(img);
    return box;
}

function scheduleExit(card) {
    setTimeout(() => card.classList.add("dwi-leaving"), FADE_AT_MS);
    setTimeout(() => card.remove(), REMOVE_AT_MS);
}

/* ---------- Holo card ---------- */

function holoCard({ username, game, roster, finalEntry }) {
    const role = roleOf(game, finalEntry.role);
    const card = el("div", "dwi-card dwi-holo");
    card.style.setProperty("--role", role.color);

    const inner = el("div", "holo-inner");
    const back = el("div", "holo-face holo-back");
    // The game's logo, or its name if the logo can't load
    const gameName = RANDOMIZER_GAMES[game]?.name ?? game;
    const logo = el("img", "holo-back-logo");
    logo.alt = gameName;
    logo.src = gameLogoUrl(game);
    logo.addEventListener("error", () => logo.replaceWith(el("span", "holo-back-game", gameName)));
    back.append(logo, el("span", "holo-back-for", `for ${username}`));

    const front = el("div", "holo-face holo-front");
    front.append(
        el("span", "holo-role", role.label),
        art(finalEntry, "holo-art"),
        el("div", "holo-plate", finalEntry.name),
        el("span", "holo-player", username),
        el("span", "holo-sheen")
    );
    inner.append(back, front);
    card.appendChild(inner);

    // Preload the final art while the card shuffles
    new Image().src = finalEntry.image ?? "";
    setTimeout(() => card.classList.add("holo-flipped"), REVEAL_MS - 500);
    return card;
}

/* ---------- Slot reel ---------- */

const REEL_TILE = 104;
const REEL_TILES = 28;
const REEL_LANDING = 23;

function reelCard({ username, game, roster, finalEntry }) {
    const role = roleOf(game, finalEntry.role);
    const card = el("div", "dwi-card dwi-reel");
    card.style.setProperty("--role", role.color);

    card.appendChild(el("p", "reel-title", `${username}'s roll · ${RANDOMIZER_GAMES[game]?.name ?? game}`));
    const window_ = el("div", "reel-window");
    const strip = el("div", "reel-strip");
    for (let i = 0; i < REEL_TILES; i++) {
        const entry = i === REEL_LANDING ? finalEntry : pick(roster);
        const tile = el("div", i === REEL_LANDING ? "reel-tile reel-winner" : "reel-tile");
        tile.style.setProperty("--tile-role", roleOf(game, entry.role).color);
        tile.appendChild(art(entry, "reel-art"));
        strip.appendChild(tile);
    }
    window_.append(strip, el("span", "reel-marker"));
    const result = el("div", "reel-result");
    result.append(el("span", "reel-name", finalEntry.name), el("span", "reel-role", role.label));
    card.append(window_, result);

    // Land the winning tile in the middle of the window. Runs once the card is on the page
    // (the window has no width before), not on the next frame: hidden OBS sources render none
    card.dwiMount = () => {
        const center = window_.clientWidth / 2 - REEL_TILE / 2;
        strip.animate(
            [{ transform: "translateX(0)" }, { transform: `translateX(${center - REEL_LANDING * REEL_TILE}px)` }],
            { duration: REVEAL_MS - 200, easing: "cubic-bezier(0.12, 0.75, 0.1, 1)", fill: "forwards" }
        );
    };
    setTimeout(() => card.classList.add("reel-landed"), REVEAL_MS - 150);
    return card;
}

/* ---------- Lock-in banner ---------- */

function lockinCard({ username, game, roster, finalEntry }) {
    const card = el("div", "dwi-card dwi-lockin");
    const show = (entry) => card.style.setProperty("--role", roleOf(game, entry.role).color);

    const slab = el("div", "lockin-slab");
    const portrait = el("div", "lockin-portrait");
    slab.append(el("span", "lockin-lines"), portrait);

    const text = el("div", "lockin-text");
    const name = el("p", "lockin-name");
    const roleTag = el("span", "lockin-role");
    text.append(el("span", "lockin-player", `P1 · ${username}`), name, roleTag, el("span", "lockin-game", RANDOMIZER_GAMES[game]?.name ?? game));

    card.append(slab, text, el("span", "lockin-flash"), el("span", "lockin-stamp", "LOCKED IN"));

    // Flicker through names, slowing down, then lock in the pick
    const flicker = (entry) => {
        show(entry);
        name.textContent = entry.name;
        roleTag.textContent = roleOf(game, entry.role).label;
    };
    const delays = [];
    for (let t = 0, step = 70; t < REVEAL_MS - 350; step *= 1.12) delays.push((t += step));
    delays.forEach((delay) => setTimeout(() => flicker(pick(roster)), delay));
    flicker(pick(roster));

    setTimeout(() => {
        flicker(finalEntry);
        portrait.replaceChildren(art(finalEntry, "lockin-art"));
        card.classList.add("lockin-locked");
    }, REVEAL_MS);
    return card;
}

const BUILDERS = { holo: holoCard, reel: reelCard, lockin: lockinCard };

/**
 * Render an alternative card. pickId is the server's pick (the showcase and preview pass
 * none and get a random one).
 */
export async function createDesignCard({ design = DEFAULT_DESIGN, username, target, pickId, game = DEFAULT_GAME }) {
    const roster = await loadRoster(game);
    if (!roster.length) return null;
    const finalEntry = roster.find((entry) => entry.id === pickId) ?? pick(roster);
    const build = BUILDERS[design] ?? BUILDERS[DEFAULT_DESIGN];
    const card = build({ username, game, roster, finalEntry });
    card.dataset.game = game;
    (target ?? document.getElementById("container")).appendChild(card);
    card.dwiMount?.();
    scheduleExit(card);
    return { card, entry: finalEntry };
}
