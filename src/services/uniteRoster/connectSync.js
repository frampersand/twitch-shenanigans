import { syncUniteRosterFromGame8 } from "./sync.js";
import {
  getUniteRosterMeta,
  saveUniteRosterMeta,
  isSyncStale,
  hasChannelBeenCheckedToday,
  markChannelCheckedToday,
} from "./storage.js";

let syncInFlight = null;

function normalizeChannel(channel) {
  if (!channel) return "";
  return channel.replace(/^#/, "").toLowerCase();
}

export async function handleRandomizerConnect(channel) {
  const normalizedChannel = normalizeChannel(channel);
  if (!normalizedChannel) return { skipped: true, reason: "missing_channel" };

  const meta = await getUniteRosterMeta();
  if (hasChannelBeenCheckedToday(meta, normalizedChannel)) {
    return { skipped: true, reason: "already_checked_today" };
  }

  const nextMeta = markChannelCheckedToday(meta, normalizedChannel);
  await saveUniteRosterMeta(nextMeta);

  if (!isSyncStale(nextMeta.lastSync)) {
    return { skipped: true, reason: "sync_fresh" };
  }

  if (!syncInFlight) {
    syncInFlight = syncUniteRosterFromGame8()
      .catch((err) => {
        console.error("Unite roster sync failed:", err);
        return { added: [], error: err.message };
      })
      .finally(() => {
        syncInFlight = null;
      });
  }

  const result = await syncInFlight;

  return {
    skipped: false,
    channel: normalizedChannel,
    ...result,
  };
}
