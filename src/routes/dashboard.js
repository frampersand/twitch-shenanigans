import express, { Router } from "express";
import { config } from "../config/index.js";
import { channels } from "../config/channels.js";
import { OWNER_LOGIN } from "../config/users.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";
import { getSession } from "../services/session.js";
import { getConnectionByLogin } from "../services/twitchConnections.js";
import { getCardStyleSetting, setCardStyleSetting } from "../services/randomizerPreferences.js";
import { getPmdPreferencesForChannel, updatePmdPreference } from "../services/pmdChatPreferences.js";
import { getRewardLinks, REWARD_FEATURES, setRewardLink } from "../services/channelRewards.js";
import { findCardStyle } from "../../shared/randomizerGames.js";

const JOINED = new Set(channels.map((c) => c.toLowerCase()));
const publicOrigin = config.publicBaseUrl ? new URL(config.publicBaseUrl).origin : null;

/** Broadcasters manage their own channel; the owner manages every channel FramperBot is on */
function manageableChannels(login) {
  if (login === OWNER_LOGIN) return [...JOINED];
  return JOINED.has(login) ? [login] : [];
}

function requireSession(req, res, next) {
  const session = getSession(req);
  if (!session) return res.status(401).json({ error: "not_logged_in" });
  req.session = session;
  next();
}

/** Writes come from the dashboard page only: JSON (so no plain form posts) from our own origin */
function requireSameOrigin(req, res, next) {
  if (req.method === "GET") return next();
  const origin = req.get("origin");
  if (origin && publicOrigin && origin !== publicOrigin) return res.status(403).json({ error: "bad_origin" });
  if (!req.is("application/json")) return res.status(415).json({ error: "json_only" });
  next();
}

function requireChannelAccess(req, res, next) {
  const channel = String(req.params.channel).toLowerCase();
  if (!manageableChannels(req.session.login).includes(channel)) return res.status(403).json({ error: "not_your_channel" });
  req.channelName = channel;
  req.channel = `#${channel}`;
  next();
}

async function channelSettings(channelName) {
  const channel = `#${channelName}`;
  const connection = await getConnectionByLogin(channelName);
  return {
    channel: channelName,
    channelPoints: connection?.eventSub?.status ?? "not_connected",
    cardStyle: await getCardStyleSetting(channel),
    pmd: await getPmdPreferencesForChannel(channel),
    rewardLinks: await getRewardLinks(channel),
    // The broadcaster's rewards as of their last login (null: they haven't logged in yet)
    rewards: connection?.rewards ?? null,
    rewardsAvailable: connection?.rewardsAvailable ?? null,
    rewardsFetchedAt: connection?.rewardsFetchedAt ?? null,
  };
}

export function createDashboardRoutes(io) {
  const router = Router();
  router.use("/api/dashboard", express.json({ limit: "4kb" }), requireSession, requireSameOrigin);

  router.get("/api/dashboard/channels", (req, res) => {
    res.json({ channels: manageableChannels(req.session.login), isOwner: req.session.login === OWNER_LOGIN });
  });

  router.get("/api/dashboard/:channel", requireChannelAccess, async (req, res) => {
    res.json(await channelSettings(req.channelName));
  });

  router.put("/api/dashboard/:channel/card-style", requireChannelAccess, async (req, res) => {
    const style = typeof req.body?.cardStyle === "string" ? findCardStyle(req.body.cardStyle) : null;
    if (!style) return res.status(400).json({ error: "unknown_card_style" });
    await setCardStyleSetting(req.channel, style);
    res.json({ cardStyle: style });
  });

  router.put("/api/dashboard/:channel/pmd", requireChannelAccess, async (req, res) => {
    const { preference, value } = req.body ?? {};
    if (typeof preference !== "string" || !["string", "boolean"].includes(typeof value)) {
      return res.status(400).json({ error: "bad_request" });
    }
    const result = await updatePmdPreference({ target: req.channel, preference, value: String(value) });
    if (result.error) return res.status(400).json({ error: result.error });
    // Same as !pmdconfig: open PMD chat overlays restyle right away
    const prefs = await getPmdPreferencesForChannel(req.channel);
    io.to(overlayRoom(req.channel)).emit(EVENTS.PMD_CONFIG, req.channelName, prefs);
    res.json({ pmd: prefs });
  });

  router.put("/api/dashboard/:channel/rewards", requireChannelAccess, async (req, res) => {
    const { feature, rewardId } = req.body ?? {};
    if (!REWARD_FEATURES.includes(feature)) return res.status(400).json({ error: "unknown_feature" });
    if (rewardId !== null) {
      // Only rewards from the channel's own list can be linked
      const connection = await getConnectionByLogin(req.channelName);
      if (typeof rewardId !== "string" || !connection?.rewards?.some((r) => r.id === rewardId)) {
        return res.status(400).json({ error: "unknown_reward" });
      }
    }
    res.json({ rewardLinks: await setRewardLink(req.channel, feature, rewardId) });
  });

  return router;
}
