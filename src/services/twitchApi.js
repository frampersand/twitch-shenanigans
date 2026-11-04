import { config, oauthRedirectUrl } from "../config/index.js";

/** What broadcasters are asked to allow: reading their channel point redemptions, nothing else */
export const LOGIN_SCOPES = ["channel:read:redemptions"];
export const REDEMPTION_EVENT = "channel.channel_points_custom_reward_redemption.add";

const { clientId, clientSecret, authUrl, apiUrl } = config.twitchApp;

class TwitchApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new TwitchApiError(`Twitch ${options.method || "GET"} ${new URL(url).pathname} failed: ${response.status} ${body.message || ""}`.trim(), response.status);
  }
  return body;
}

export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: oauthRedirectUrl,
    response_type: "code",
    scope: LOGIN_SCOPES.join(" "),
    state,
  });
  return `${authUrl}/oauth2/authorize?${params}`;
}

/** Trade the login code for a user token, then ask Twitch who it belongs to */
export async function identifyUser(code) {
  const token = await request(`${authUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: oauthRedirectUrl,
    }),
  });
  const user = await request(`${authUrl}/oauth2/validate`, {
    headers: { Authorization: `OAuth ${token.access_token}` },
  });
  // The user token isn't kept: EventSub webhooks only need the broadcaster's one-time consent
  return { login: user.login.toLowerCase(), userId: user.user_id, scopes: user.scopes ?? [] };
}

/** App access token (client credentials), cached until shortly before it expires */
let appToken = null;
async function getAppToken() {
  if (appToken && appToken.expiresAt > Date.now()) return appToken.value;
  const token = await request(`${authUrl}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
  });
  appToken = { value: token.access_token, expiresAt: Date.now() + (token.expires_in - 60) * 1000 };
  return appToken.value;
}

async function helix(path, options = {}) {
  return request(`${apiUrl}/helix${path}`, {
    ...options,
    headers: {
      "Client-Id": clientId,
      Authorization: `Bearer ${await getAppToken()}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

/** Every redemption subscription this app has, across all pages */
export async function listRedemptionSubscriptions() {
  const subscriptions = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ type: REDEMPTION_EVENT, ...(cursor && { after: cursor }) });
    const page = await helix(`/eventsub/subscriptions?${query}`);
    subscriptions.push(...page.data);
    cursor = page.pagination?.cursor ?? "";
  } while (cursor);
  return subscriptions;
}

/** Subscribe to a broadcaster's redemptions; returns the subscription, or null if it already exists */
export async function createRedemptionSubscription({ broadcasterUserId, callbackUrl, secret }) {
  try {
    const { data } = await helix("/eventsub/subscriptions", {
      method: "POST",
      body: JSON.stringify({
        type: REDEMPTION_EVENT,
        version: "1",
        condition: { broadcaster_user_id: broadcasterUserId },
        transport: { method: "webhook", callback: callbackUrl, secret },
      }),
    });
    return data[0];
  } catch (err) {
    if (err.status === 409) return null;
    throw err;
  }
}

export async function deleteSubscription(id) {
  await helix(`/eventsub/subscriptions?${new URLSearchParams({ id })}`, { method: "DELETE" });
}
