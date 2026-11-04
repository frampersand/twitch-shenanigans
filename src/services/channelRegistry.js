import { EventEmitter } from "events";
import { readFileSync } from "fs";
import { config } from "../config/index.js";
import { channels as SEED_CHANNELS } from "../config/channels.js";
import { writeJson } from "../utils/jsonStore.js";

/**
 * The channels FramperBot is on: { "<login>": { addedAt, addedBy: "config"|"self",
 * userId?, termsVersion?, termsAcceptedAt? } } in data/channels.json. Seeded once from
 * src/config/channels.js; after that, broadcasters add and remove themselves on the dashboard.
 * Kept in memory and read synchronously, since rooms and chat check it constantly.
 * Emits "joined" / "left" with the login so the chat client can follow.
 */
export const channelEvents = new EventEmitter();

const { channelsPath, maxChannels } = config;

function loadOrSeed() {
  try {
    return JSON.parse(readFileSync(channelsPath, "utf8")).channels ?? {};
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    const seeded = Object.fromEntries(
      SEED_CHANNELS.map((login) => [login.toLowerCase(), { addedAt: new Date().toISOString(), addedBy: "config" }])
    );
    writeJson(channelsPath, { channels: seeded }).catch((writeErr) => console.error("Saving channels failed:", writeErr));
    return seeded;
  }
}

let registry = loadOrSeed();

const save = () => writeJson(channelsPath, { channels: registry });
const normalize = (channel) => String(channel ?? "").replace(/^#/, "").toLowerCase();

export function isJoined(channel) {
  return Object.hasOwn(registry, normalize(channel));
}

export function joinedChannels() {
  return Object.keys(registry);
}

export function getChannelEntry(channel) {
  return registry[normalize(channel)] ?? null;
}

export class ChannelLimitError extends Error {}

/** A broadcaster adds FramperBot to their own channel, accepting the current terms */
export async function addChannel(login, { userId, termsVersion }) {
  const name = normalize(login);
  if (!isJoined(name) && joinedChannels().length >= maxChannels) {
    throw new ChannelLimitError(`FramperBot is on its limit of ${maxChannels} channels`);
  }
  const isNew = !isJoined(name);
  registry = {
    ...registry,
    [name]: {
      addedAt: new Date().toISOString(),
      addedBy: "self",
      ...registry[name],
      userId,
      termsVersion,
      termsAcceptedAt: new Date().toISOString(),
    },
  };
  await save();
  if (isNew) channelEvents.emit("joined", name);
  return registry[name];
}

export async function removeChannel(login) {
  const name = normalize(login);
  if (!isJoined(name)) return false;
  const { [name]: removed, ...rest } = registry;
  registry = rest;
  await save();
  channelEvents.emit("left", name);
  return Boolean(removed);
}
