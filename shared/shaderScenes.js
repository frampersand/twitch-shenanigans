/**
 * Animated scenes for the Background source: WebGL backgrounds drawn with Paper Shaders
 * (public/libs/paper-shaders). Shared by the bot (names, validation), the dashboard and the
 * overlay (public/sources/shader). Params use Paper's own names; the overlay turns them into
 * uniforms. Values start from Paper's presets, slowed down to suit a stream background.
 */

export const SCENES = {
    aurora: {
        label: "Aurora",
        description: "Soft mesh gradient in blue, pink and violet",
        shader: "meshGradient",
        speed: 0.4,
        aliases: ["mesh", "gradient"],
        params: {
            colors: ["#e0eaff", "#241d9a", "#f75092", "#9f50d3"],
            distortion: 0.8,
            swirl: 0.1,
            grainMixer: 0,
            grainOverlay: 0,
        },
    },
    lagoon: {
        label: "Lagoon",
        description: "Sea-blue mesh gradient with a sunny streak and fine grain",
        shader: "meshGradient",
        speed: 0.25,
        aliases: ["beach", "ocean", "sea"],
        params: {
            colors: ["#bcecf6", "#00aaff", "#00f7ff", "#ffd447"],
            distortion: 0.8,
            swirl: 0.35,
            grainMixer: 0,
            grainOverlay: 0.12,
        },
    },
    dusk: {
        label: "Dusk",
        description: "Grainy waves of amber and sand on near-black",
        shader: "grainGradient",
        speed: 0.6,
        aliases: ["grain", "waves", "sunset"],
        params: {
            fit: "none",
            colorBack: "#000a0f",
            colors: ["#c4730b", "#bdad5f", "#d8ccc7"],
            softness: 0.7,
            intensity: 0.15,
            noise: 0.5,
            shape: "wave",
        },
    },
    moss: {
        label: "Moss",
        description: "Grainy bands of muted teal, olive and green",
        shader: "grainGradient",
        speed: 0.6,
        aliases: ["forest", "green"],
        params: {
            colorBack: "#0f0e18",
            colors: ["#3e6172", "#a49b74", "#568c50"],
            softness: 0.6,
            intensity: 0.4,
            noise: 0.25,
            shape: "corners",
        },
    },
    cauldron: {
        label: "Cauldron",
        description: "Bubbling green warp, like a potion about to boil over",
        shader: "warp",
        speed: 4,
        aliases: ["warp", "potion"],
        params: {
            fit: "none",
            scale: 0.9,
            rotation: 160,
            colors: ["#a7e58b", "#324472", "#0a180d"],
            proportion: 0.64,
            softness: 1.5,
            distortion: 0.2,
            swirl: 0.86,
            swirlIterations: 7,
            shapeScale: 0.6,
            shape: "edge",
        },
    },
    candy: {
        label: "Candy",
        description: "A slow pastel swirl",
        shader: "swirl",
        speed: 0.3,
        aliases: ["swirl", "pastel"],
        params: {
            colorBack: "#ffcd66",
            colors: ["#6bbceb", "#d7b3ff", "#ff9fff"],
            bandCount: 2,
            twist: 0.15,
            center: 0.2,
            proportion: 0.5,
            softness: 1,
            noiseFrequency: 0.5,
            noise: 0,
        },
    },
    synapse: {
        label: "Synapse",
        description: "Glowing blue neural threads on black",
        shader: "neuroNoise",
        speed: 0.5,
        aliases: ["neuro", "neural", "electric"],
        params: {
            fit: "none",
            colorFront: "#ffffff",
            colorMid: "#47a6ff",
            colorBack: "#000000",
            brightness: 0.05,
            contrast: 0.3,
        },
    },
    lava: {
        label: "Lava lamp",
        description: "Big drifting blobs of violet, mint and gold",
        shader: "metaballs",
        speed: 0.35,
        aliases: ["lavalamp", "metaballs", "blobs"],
        params: {
            colorBack: "#2a273f",
            colors: ["#ae00ff", "#00ff95", "#ffc105"],
            count: 14,
            size: 0.85,
            scale: 2.2,
        },
    },
    ether: {
        label: "Ether",
        description: "Light rays sweeping across a night-blue sky",
        shader: "godRays",
        speed: 0.6,
        aliases: ["rays", "godrays", "light"],
        params: {
            offsetX: -0.6,
            colorBack: "#090f1d",
            colorBloom: "#ffffff",
            colors: ["#148effa6", "#c4dffebe", "#232a47"],
            density: 0.03,
            spotty: 0.77,
            midSize: 0.1,
            midIntensity: 0.6,
            intensity: 0.6,
            bloom: 0.6,
        },
    },
};

/** Scenes in order: viewers can also pick one by number (1 = aurora) */
export const SCENE_IDS = Object.keys(SCENES);
/** "plain": no animation, just the color as a gradient (what the color reward always painted) */
export const PLAIN_SCENE = "plain";
/** "shuffle": the overlay moves to another animated scene every few minutes */
export const SHUFFLE_SCENE = "shuffle";
export const SHUFFLE_MINUTES = 10;
/** Plain color with no color picked yet: Twitch purple */
export const FALLBACK_COLOR = "#9146ff";
/** Animation speed multiplier the broadcaster can set: 0 is a still image */
export const MIN_SCENE_SPEED = 0;
export const MAX_SCENE_SPEED = 2;
/**
 * A background look: `scene` (a scene id, plain or shuffle), `color` (a hex the scene is
 * repainted with, or null for the scene's own colors) and `speed`.
 */
export const DEFAULT_BACKGROUND = { scene: SCENE_IDS[0], color: null, speed: 1 };

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;
const PLAIN_WORDS = ["plain", "none", "off", "flat", "solid", "color", "colour"];
const SHUFFLE_WORDS = ["shuffle", "cycle", "rotate"];

export const sceneNumber = (id) => SCENE_IDS.indexOf(id) + 1;

/** A scene id, "plain" or "shuffle" from chat or a redemption ("Lava", "mesh", "3", "#3"), or null */
export function findScene(word) {
    const raw = String(word ?? "").trim().toLowerCase();
    const number = /^#?(\d{1,2})$/.exec(raw);
    if (number) return SCENE_IDS[Number(number[1]) - 1] ?? null;
    const wanted = raw.replace(/[^a-z]/g, "");
    if (!wanted) return null;
    if (PLAIN_WORDS.includes(wanted)) return PLAIN_SCENE;
    if (SHUFFLE_WORDS.includes(wanted)) return SHUFFLE_SCENE;
    return SCENE_IDS.find((id) => id === wanted || SCENES[id].aliases.includes(wanted)) ?? null;
}

const isSetting = (scene) => scene === PLAIN_SCENE || scene === SHUFFLE_SCENE || Object.hasOwn(SCENES, scene ?? "");

/** A random animated scene, other than `except` when there's a choice */
export function randomScene(except) {
    const ids = SCENE_IDS.filter((id) => id !== except);
    return ids[Math.floor(Math.random() * ids.length)];
}

export function sceneLabel(setting) {
    if (setting === PLAIN_SCENE) return "a plain color";
    if (setting === SHUFFLE_SCENE) return `a new scene every ${SHUFFLE_MINUTES} minutes`;
    return SCENES[setting] ? `${SCENES[setting].label} (#${sceneNumber(setting)})` : setting;
}

/** "1 aurora, 2 lagoon, …, plain, random or shuffle" for help text */
export function sceneList() {
    return `${SCENE_IDS.map((id, i) => `${i + 1} ${id}`).join(", ")}, ${PLAIN_SCENE}, random or ${SHUFFLE_SCENE}`;
}

/** "#rrggbb" in lowercase, or null when it isn't a hex color */
export function normalizeColor(value) {
    const match = HEX.exec(String(value ?? "").trim());
    if (!match) return null;
    const hex = match[1].length === 3 ? [...match[1]].map((c) => c + c).join("") : match[1];
    return `#${hex.toLowerCase()}`;
}

const clampSpeed = (value) => {
    const speed = Number(value);
    return Number.isFinite(speed) ? Math.min(MAX_SCENE_SPEED, Math.max(MIN_SCENE_SPEED, Math.round(speed * 100) / 100)) : 1;
};

/** A stored or requested look made safe (reads the old `tint` name too) */
export function normalizeBackground(value = {}) {
    return {
        scene: isSetting(value.scene) ? value.scene : DEFAULT_BACKGROUND.scene,
        color: normalizeColor(value.color ?? value.tint),
        speed: clampSpeed(value.speed),
    };
}

/**
 * What's on stream: the broadcaster's default with viewers' and chat's changes on top. A
 * change only names what it changes ({ color } or { scene }), so a new color keeps the scene
 * and a new scene keeps the color. `color: null` there means the scene's own colors.
 */
export function currentBackground(defaults, live = {}) {
    const look = { ...normalizeBackground(defaults) };
    if (isSetting(live.scene)) look.scene = live.scene;
    if ("color" in live) look.color = normalizeColor(live.color);
    return look;
}
