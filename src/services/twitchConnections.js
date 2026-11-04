import { config } from "../config/index.js";
import { readJson, updateJson } from "../utils/jsonStore.js";

/**
 * Broadcasters who logged in with Twitch: { "<userId>": { login, scopes, connectedAt,
 * eventSub: { id, status } } }. No tokens are stored; EventSub only needs their consent.
 * Kept in memory too, because the chat handler checks it on every reward message.
 */
const { twitchConnectionsPath } = config;
let cache = null;

async function load() {
  if (!cache) cache = await readJson(twitchConnectionsPath, {});
  return cache;
}

export async function getConnections() {
  return load();
}

export async function getConnectionByLogin(login) {
  const connections = await load();
  return Object.entries(connections).find(([, c]) => c.login === login.toLowerCase())?.[1] ?? null;
}

export async function saveConnection(userId, changes) {
  cache = await updateJson(twitchConnectionsPath, {}, (data) => ({
    ...data,
    [userId]: { ...data[userId], ...changes },
  }));
  return cache[userId];
}

export async function setEventSubStatus(userId, eventSub) {
  const connections = await load();
  if (!connections[userId]) return null;
  return saveConnection(userId, { eventSub: { ...connections[userId].eventSub, ...eventSub } });
}

/** True when the channel's redemptions arrive through EventSub, so chat-tagged ones are duplicates */
export async function redemptionsViaEventSub(channel) {
  const connection = await getConnectionByLogin(channel.replace(/^#/, ""));
  return connection?.eventSub?.status === "enabled";
}
