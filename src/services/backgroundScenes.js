import { config } from "../config/index.js";
import { readJson, updateJson } from "../utils/jsonStore.js";
import { currentBackground, DEFAULT_BACKGROUND, normalizeBackground, normalizeColor } from "../../shared/shaderScenes.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";

/**
 * The Background source per channel. The broadcaster's default look is saved
 * ({ "#channel": { scene, color, speed } }); changes from rewards and chat (a new color, a new
 * scene) are kept in memory on top of it, so they last the stream (overlay reloads included)
 * and a restart or "reset" goes back to the default.
 */
const { backgroundScenesPath } = config;
const normalizeChannel = (channel) => `#${String(channel).replace(/^#/, "").toLowerCase()}`;
const live = new Map();

export async function getBackgroundDefault(channel) {
  const data = await readJson(backgroundScenesPath, {});
  return normalizeBackground(data[normalizeChannel(channel)] ?? DEFAULT_BACKGROUND);
}

/** The changes on top of the default right now ({} when there are none) */
export function getLiveChanges(channel) {
  return { ...live.get(normalizeChannel(channel)) };
}

/** What the Background source shows right now */
export async function getCurrentBackground(channel) {
  return currentBackground(await getBackgroundDefault(channel), getLiveChanges(channel));
}

async function broadcast(io, channel) {
  const look = await getCurrentBackground(channel);
  io.to(overlayRoom(normalizeChannel(channel))).emit(EVENTS.BACKGROUND_SCENE, look);
  return look;
}

/** Save a change to the default look ({ scene }, { color: null }, …); the stream shows the new default */
export async function changeBackgroundDefault(io, channel, changes) {
  const key = normalizeChannel(channel);
  let saved;
  await updateJson(backgroundScenesPath, {}, (data) => {
    saved = normalizeBackground({ ...DEFAULT_BACKGROUND, ...data[key], ...changes });
    return { ...data, [key]: saved };
  });
  live.delete(key);
  await broadcast(io, channel);
  return saved;
}

/** A change for this stream only: { color } keeps the scene, { scene } keeps the color */
export async function changeBackgroundLive(io, channel, changes) {
  const key = normalizeChannel(channel);
  const next = { ...live.get(key) };
  if (typeof changes.scene === "string") next.scene = changes.scene;
  if ("color" in changes) next.color = normalizeColor(changes.color);
  live.set(key, next);
  return broadcast(io, channel);
}

/** Back to the default look */
export async function resetBackground(io, channel) {
  live.delete(normalizeChannel(channel));
  return broadcast(io, channel);
}

export async function removeBackgroundSetting(channel) {
  live.delete(normalizeChannel(channel));
  await updateJson(backgroundScenesPath, {}, ({ [normalizeChannel(channel)]: _removed, ...rest }) => rest);
}
