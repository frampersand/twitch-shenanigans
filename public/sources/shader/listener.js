import { createSceneStage } from "./sceneStage.js";
import { getOverlayChannel, joinOverlayChannel } from "../../utils/overlayChannel.js";
import { numberParam } from "../../utils/viewParams.js";
import {
    DEFAULT_BACKGROUND,
    MAX_SCENE_SPEED,
    SHUFFLE_MINUTES,
    SHUFFLE_SCENE,
    findScene,
    normalizeColor,
    randomScene,
} from "/shared/shaderScenes.js";

/**
 * The Background source: a plain color, or an animated scene painted in the current color.
 * The server sends the whole look (the broadcaster's default plus this stream's changes from
 * the color and scene rewards and !background) on connect and on every change.
 * URL options pin parts of it: ?scene=lava (a name, number, plain or shuffle),
 * ?color=9146ff, ?speed=0.5. ?quality=low renders at 720p for slower PCs.
 */
const search = new URLSearchParams(location.search);
const pinned = {
    scene: findScene(search.get("scene")),
    color: normalizeColor(search.get("color") ?? search.get("tint")),
    speed: numberParam("speed", { min: 0, max: MAX_SCENE_SPEED }),
};
const quality = search.get("quality") === "low" ? 1280 * 720 : 1920 * 1080;
const stage = createSceneStage(document.getElementById("scene-stage"), { maxPixelCount: quality });

let look = { ...DEFAULT_BACKGROUND };
let shuffled = null;
let shuffleTimer = null;

const color = () => pinned.color ?? look.color;
const speed = () => pinned.speed ?? look.speed;

function render() {
    const scene = pinned.scene ?? look.scene;
    clearInterval(shuffleTimer);
    if (scene !== SHUFFLE_SCENE) {
        shuffled = null;
        stage.show({ scene, color: color(), speed: speed() });
        return;
    }
    // Shuffle keeps its scene when only the color or speed changes
    shuffled ??= randomScene();
    stage.show({ scene: shuffled, color: color(), speed: speed() });
    shuffleTimer = setInterval(() => {
        shuffled = randomScene(shuffled);
        stage.show({ scene: shuffled, color: color(), speed: speed() });
    }, SHUFFLE_MINUTES * 60_000);
}

render();

const socket = io();
const channel = getOverlayChannel();
joinOverlayChannel(socket, channel);
socket.on("connect", () => socket.emit("background-scene-request", channel));

socket.on("background-scene", (next) => {
    if (!next || typeof next !== "object") return;
    look = { ...DEFAULT_BACKGROUND, ...next };
    render();
});
