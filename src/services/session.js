import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { config } from "../config/index.js";

/**
 * Small signed-cookie sessions (no store): the cookie holds { login, userId, exp } plus an
 * HMAC, so it can't be edited. Without SESSION_SECRET a random key is used, which means
 * everyone is logged out on restart.
 */
const SESSION_COOKIE = "fb_session";
const STATE_COOKIE = "fb_oauth_state";
const SESSION_DAYS = 7;
const STATE_MINUTES = 10;

const secret = config.sessionSecret || randomBytes(32).toString("hex");
if (!config.sessionSecret && config.twitchApp.clientId) {
  console.warn("SESSION_SECRET is not set: dashboard logins will reset on every restart");
}
const secureCookies = config.publicBaseUrl.startsWith("https://");

function sign(value) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function seal(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

function unseal(token) {
  if (typeof token !== "string") return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

export function parseCookies(req) {
  const cookies = {};
  for (const part of (req.get("cookie") || "").split(";")) {
    const index = part.indexOf("=");
    if (index > 0) cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function setCookie(res, name, value, maxAgeSeconds) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    // Lax: the cookie still arrives on Twitch's redirect back to us, but not on cross-site posts
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (secureCookies) attributes.push("Secure");
  res.append("Set-Cookie", attributes.join("; "));
}

export function startSession(res, { login, userId }) {
  setCookie(res, SESSION_COOKIE, seal({ login, userId, exp: Date.now() + SESSION_DAYS * 86400000 }), SESSION_DAYS * 86400);
}

export function endSession(res) {
  setCookie(res, SESSION_COOKIE, "", 0);
}

/** { login, userId } for a valid session, else null */
export function getSession(req) {
  const session = unseal(parseCookies(req)[SESSION_COOKIE]);
  return session ? { login: session.login, userId: session.userId } : null;
}

/** OAuth state: a random value kept in a short-lived signed cookie and echoed back by Twitch */
export function issueOAuthState(res) {
  const state = randomBytes(16).toString("base64url");
  setCookie(res, STATE_COOKIE, seal({ state, exp: Date.now() + STATE_MINUTES * 60000 }), STATE_MINUTES * 60);
  return state;
}

export function consumeOAuthState(req, res, state) {
  const saved = unseal(parseCookies(req)[STATE_COOKIE]);
  setCookie(res, STATE_COOKIE, "", 0);
  if (!saved || typeof state !== "string") return false;
  const expected = Buffer.from(saved.state);
  const given = Buffer.from(state);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
