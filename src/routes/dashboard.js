import express, { Router } from "express";
import { config } from "../config/index.js";
import { addChannel, ChannelLimitError, getChannelEntry, isJoined, joinedChannels } from "../services/channelRegistry.js";
import { removeChannelAndData } from "../services/channelData.js";
import { HOME_CHANNEL } from "../config/channels.js";
import { OWNER_LOGIN } from "../config/users.js";
import { EVENTS } from "../socket/events.js";
import { overlayRoom } from "../socket/rooms.js";
import { getSession } from "../services/session.js";
import { getConnectionByLogin } from "../services/twitchConnections.js";
import { getCardStyleSetting, setCardStyleSetting } from "../services/randomizerPreferences.js";
import { getPmdPreferencesForChannel, updatePmdPreference } from "../services/pmdChatPreferences.js";
import { getRewardLinks, REWARD_FEATURES, setRewardLink } from "../services/channelRewards.js";
import { findCardStyle } from "../../shared/randomizerGames.js";
import {
  changeBackgroundDefault,
  getBackgroundDefault,
  getCurrentBackground,
  getLiveChanges,
  resetBackground,
} from "../services/backgroundScenes.js";
import { MAX_SCENE_SPEED, MIN_SCENE_SPEED, normalizeColor, PLAIN_SCENE, SCENES, SHUFFLE_SCENE } from "../../shared/shaderScenes.js";

const publicOrigin = config.publicBaseUrl ? new URL(config.publicBaseUrl).origin : null;

/** Broadcasters manage their own channel; the owner manages every channel FramperBot is on */
function manageableChannels(login) {
  if (login === OWNER_LOGIN) return joinedChannels();
  return isJoined(login) ? [login] : [];
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
  const entry = getChannelEntry(channelName);
  return {
    channel: channelName,
    botName: config.twitch.username ?? "",
    isHome: channel === HOME_CHANNEL,
    // Which terms the broadcaster accepted (channels from before sign-ups have none yet)
    terms: { current: config.termsVersion, accepted: entry?.termsVersion ?? null, acceptedAt: entry?.termsAcceptedAt ?? null },
    channelPoints: connection?.eventSub?.status ?? "not_connected",
    cardStyle: await getCardStyleSetting(channel),
    pmd: await getPmdPreferencesForChannel(channel),
    // The default look, and what's on stream now if rewards or chat changed it
    background: await getBackgroundDefault(channel),
    backgroundNow: Object.keys(getLiveChanges(channel)).length ? await getCurrentBackground(channel) : null,
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
    res.json({
      channels: manageableChannels(req.session.login),
      isOwner: req.session.login === OWNER_LOGIN,
      ownChannelJoined: isJoined(req.session.login),
      termsVersion: config.termsVersion,
    });
  });

  /**
   * Add FramperBot to your own channel, or accept updated terms for it. Needs an explicit
   * acceptance of the EULA and Privacy Policy, which is recorded with the terms version.
   */
  router.post("/api/dashboard/join", async (req, res) => {
    if (req.body?.acceptTerms !== true) return res.status(400).json({ error: "terms_not_accepted" });
    try {
      const entry = await addChannel(req.session.login, { userId: req.session.userId, termsVersion: config.termsVersion });
      console.log(`[channels] #${req.session.login} accepted terms ${config.termsVersion}`);
      res.json({ channel: req.session.login, terms: entry.termsVersion });
    } catch (err) {
      if (err instanceof ChannelLimitError) return res.status(409).json({ error: "channel_limit" });
      throw err;
    }
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

  /**
   * The Background source's default look: any of { scene (a scene, plain or shuffle), color
   * (hex, or null for the scene's own colors), speed }. Open overlays switch to it right away.
   */
  router.put("/api/dashboard/:channel/background", requireChannelAccess, async (req, res) => {
    const body = req.body ?? {};
    const changes = {};
    if ("scene" in body) {
      const known = [PLAIN_SCENE, SHUFFLE_SCENE].includes(body.scene) || Object.hasOwn(SCENES, String(body.scene));
      if (!known) return res.status(400).json({ error: "unknown_scene" });
      changes.scene = body.scene;
    }
    if ("color" in body) {
      if (body.color !== null && !normalizeColor(body.color)) return res.status(400).json({ error: "invalid_color" });
      changes.color = body.color;
    }
    if ("speed" in body) {
      if (typeof body.speed !== "number" || !(body.speed >= MIN_SCENE_SPEED && body.speed <= MAX_SCENE_SPEED)) {
        return res.status(400).json({ error: "invalid_speed" });
      }
      changes.speed = body.speed;
    }
    if (!Object.keys(changes).length) return res.status(400).json({ error: "bad_request" });
    res.json({ background: await changeBackgroundDefault(io, req.channel, changes), backgroundNow: null });
  });

  /** Drop this stream's changes from rewards and chat: back to the default look */
  router.post("/api/dashboard/:channel/background/reset", requireChannelAccess, async (req, res) => {
    await resetBackground(io, req.channel);
    res.json({ backgroundNow: null });
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

  /** Remove FramperBot and delete the channel's data; the body must name the channel to confirm */
  router.post("/api/dashboard/:channel/leave", requireChannelAccess, async (req, res) => {
    if (req.body?.confirm !== req.channelName) return res.status(400).json({ error: "confirmation_mismatch" });
    if (req.channel === HOME_CHANNEL) return res.status(400).json({ error: "home_channel" });
    await removeChannelAndData(req.channelName);
    console.log(`[channels] #${req.channelName} removed FramperBot (by ${req.session.login})`);
    res.json({ removed: req.channelName });
  });

  return router;
}
