import { Router } from "express";
import { twitchLoginEnabled } from "../config/index.js";
import { channels } from "../config/channels.js";
import { OWNER_LOGIN } from "../config/users.js";
import { authorizeUrl, identifyUser, LOGIN_SCOPES } from "../services/twitchApi.js";
import {
  consumeOAuthState,
  endSession,
  getSession,
  issueOAuthState,
  startSession,
} from "../services/session.js";
import { getConnectionByLogin, saveConnection } from "../services/twitchConnections.js";
import { subscribeBroadcaster } from "../services/eventSub.js";

const router = Router();
const JOINED = new Set(channels.map((c) => c.toLowerCase()));
const DASHBOARD = "/dashboard/";

function requireLoginConfigured(_req, res, next) {
  if (!twitchLoginEnabled) return res.status(503).json({ error: "twitch_login_not_configured" });
  next();
}

/** "Log in with Twitch": off to Twitch's consent page with a one-time state value */
router.get("/auth/twitch/login", requireLoginConfigured, (_req, res) => {
  res.redirect(authorizeUrl(issueOAuthState(res)));
});

router.get("/auth/twitch/callback", requireLoginConfigured, async (req, res) => {
  const { code, state, error } = req.query;
  // Checked first so a forged or replayed callback can't do anything
  if (!consumeOAuthState(req, res, state)) return res.status(400).send("Login expired or invalid. Try again.");
  if (error || typeof code !== "string") return res.redirect(`${DASHBOARD}?login=cancelled`);

  try {
    const user = await identifyUser(code);
    startSession(res, user);
    if (JOINED.has(user.login) && LOGIN_SCOPES.every((scope) => user.scopes.includes(scope))) {
      await saveConnection(user.userId, { login: user.login, scopes: user.scopes, connectedAt: new Date().toISOString() });
      try {
        await subscribeBroadcaster(user);
      } catch (err) {
        // Login still works; the startup sync retries the subscription
        console.error(`EventSub subscription for ${user.login} failed:`, err.message);
      }
    }
    res.redirect(DASHBOARD);
  } catch (err) {
    console.error("Twitch login failed:", err.message);
    res.redirect(`${DASHBOARD}?login=failed`);
  }
});

router.post("/auth/logout", (_req, res) => {
  endSession(res);
  res.status(204).end();
});

/** Who's logged in and whether their channel's redemptions come through EventSub */
router.get("/api/me", async (req, res) => {
  const session = getSession(req);
  if (!session) return res.json({ loggedIn: false, loginAvailable: twitchLoginEnabled });
  const connection = await getConnectionByLogin(session.login);
  res.json({
    loggedIn: true,
    login: session.login,
    isOwner: session.login === OWNER_LOGIN,
    channelJoined: JOINED.has(session.login),
    channelPoints: connection?.eventSub?.status ?? "not_connected",
  });
});

export default router;
