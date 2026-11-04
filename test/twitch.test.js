import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import { createServer } from "http";
import { chatContext, createFakeClient, createFakeIo, useTempDataDir } from "./helpers.js";

/* A fake Twitch: OAuth token + validate endpoints and EventSub subscriptions */
const twitchCalls = [];
const fakeTwitch = createServer(async (req, res) => {
  let body = "";
  for await (const chunk of req) body += chunk;
  twitchCalls.push({ method: req.method, url: req.url, headers: req.headers, body });
  const json = (status, data) => res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(data));

  if (req.url === "/oauth2/token") {
    const form = new URLSearchParams(body);
    if (form.get("grant_type") === "client_credentials") return json(200, { access_token: "app-token", expires_in: 3600 });
    if (form.get("code") === "good-code") return json(200, { access_token: "user-token", refresh_token: "r", expires_in: 3600 });
    return json(400, { message: "Invalid authorization code" });
  }
  if (req.url === "/oauth2/validate" && req.headers.authorization === "OAuth user-token") {
    return json(200, { login: "JoesBeard", user_id: "1001", scopes: ["channel:read:redemptions"], client_id: "test-client" });
  }
  if (req.url.startsWith("/helix/eventsub/subscriptions") && req.method === "POST") {
    return json(202, { data: [{ id: "sub-1", status: "webhook_callback_verification_pending" }] });
  }
  if (req.url.startsWith("/helix/eventsub/subscriptions") && req.method === "GET") return json(200, { data: [], pagination: {} });
  json(404, { message: "not found" });
});
await new Promise((resolve) => fakeTwitch.listen(0, resolve));
const fakeUrl = `http://localhost:${fakeTwitch.address().port}`;

const EVENTSUB_SECRET = "test-eventsub-secret";
Object.assign(process.env, {
  TWITCH_CLIENT_ID: "test-client",
  TWITCH_CLIENT_SECRET: "test-secret",
  TWITCH_EVENTSUB_SECRET: EVENTSUB_SECRET,
  SESSION_SECRET: "test-session-secret",
  PUBLIC_BASE_URL: "https://bot.example.test",
  TWITCH_AUTH_URL: fakeUrl,
  TWITCH_API_URL: fakeUrl,
});
await useTempDataDir();
const { createApp } = await import("../src/app.js");
const { listenForRedemptions } = await import("../src/twitch/redemptions.js");
const { createMessageHandler } = await import("../src/twitch/messageHandler.js");
const { REWARD_IDS } = await import("../src/config/rewards.js");

let server;
let baseUrl;
before(async () => {
  ({ server } = createApp());
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  fakeTwitch.close();
});

const cookiesOf = (res) => res.headers.getSetCookie().map((c) => c.split(";")[0]).filter((c) => !c.endsWith("=")).join("; ");

function signedPost(type, payload, { id = `msg-${Math.random()}`, timestamp = new Date().toISOString(), secret = EVENTSUB_SECRET } = {}) {
  const body = JSON.stringify(payload);
  const signature = `sha256=${createHmac("sha256", secret).update(id + timestamp + body).digest("hex")}`;
  return fetch(`${baseUrl}/eventsub/callback`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Twitch-Eventsub-Message-Id": id,
      "Twitch-Eventsub-Message-Timestamp": timestamp,
      "Twitch-Eventsub-Message-Signature": signature,
      "Twitch-Eventsub-Message-Type": type,
    },
    body,
  });
}

const redemptionSubscription = { id: "sub-1", type: "channel.channel_points_custom_reward_redemption.add", status: "enabled", condition: { broadcaster_user_id: "1001" } };

let session = "";

test("login sends the broadcaster to Twitch with a one-time state", async () => {
  const res = await fetch(`${baseUrl}/auth/twitch/login`, { redirect: "manual" });
  assert.equal(res.status, 302);
  const location = new URL(res.headers.get("location"));
  assert.equal(location.origin + location.pathname, `${fakeUrl}/oauth2/authorize`);
  assert.equal(location.searchParams.get("client_id"), "test-client");
  assert.equal(location.searchParams.get("redirect_uri"), "https://bot.example.test/auth/twitch/callback");
  assert.equal(location.searchParams.get("scope"), "channel:read:redemptions");
  assert.ok(location.searchParams.get("state"));

  // A callback without the matching state cookie is refused
  const forged = await fetch(`${baseUrl}/auth/twitch/callback?code=good-code&state=${location.searchParams.get("state")}`, { redirect: "manual" });
  assert.equal(forged.status, 400);
});

test("the callback logs the broadcaster in and subscribes their redemptions", async () => {
  const start = await fetch(`${baseUrl}/auth/twitch/login`, { redirect: "manual" });
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const res = await fetch(`${baseUrl}/auth/twitch/callback?code=good-code&state=${state}`, {
    redirect: "manual",
    headers: { cookie: cookiesOf(start) },
  });
  assert.equal(res.status, 302);
  assert.equal(res.headers.get("location"), "/dashboard/");
  session = cookiesOf(res);
  assert.match(session, /fb_session=/);

  const subscribe = twitchCalls.find((c) => c.method === "POST" && c.url.startsWith("/helix/eventsub/subscriptions"));
  assert.equal(subscribe.headers.authorization, "Bearer app-token");
  const request = JSON.parse(subscribe.body);
  assert.equal(request.type, "channel.channel_points_custom_reward_redemption.add");
  assert.deepEqual(request.condition, { broadcaster_user_id: "1001" });
  assert.deepEqual(request.transport, { method: "webhook", callback: "https://bot.example.test/eventsub/callback", secret: EVENTSUB_SECRET });

  const me = await (await fetch(`${baseUrl}/api/me`, { headers: { cookie: session } })).json();
  assert.deepEqual(me, { loggedIn: true, login: "joesbeard", isOwner: false, channelJoined: true, channelPoints: "webhook_callback_verification_pending" });

  // A tampered session cookie is ignored
  const tampered = session.replace(/fb_session=([^.]+)/, "fb_session=eyJsb2dpbiI6ImZyYW1wZXJzYW5kIn0");
  assert.equal((await (await fetch(`${baseUrl}/api/me`, { headers: { cookie: tampered } })).json()).loggedIn, false);
});

test("webhooks: Twitch's challenge is answered and only signed, fresh messages count", async () => {
  const challenge = await signedPost("webhook_callback_verification", { challenge: "pogchamp-challenge", subscription: redemptionSubscription });
  assert.equal(challenge.status, 200);
  assert.equal(await challenge.text(), "pogchamp-challenge");
  const me = await (await fetch(`${baseUrl}/api/me`, { headers: { cookie: session } })).json();
  assert.equal(me.channelPoints, "enabled");

  assert.equal((await signedPost("notification", {}, { secret: "wrong-secret" })).status, 403);
  assert.equal((await signedPost("notification", {}, { timestamp: new Date(Date.now() - 11 * 60000).toISOString() })).status, 403);
  const once = await signedPost("notification", { subscription: { type: "other" } }, { id: "same-id" });
  const again = await signedPost("notification", { subscription: { type: "other" } }, { id: "same-id" });
  assert.equal(once.status, 204);
  assert.equal(again.status, 204);
});

test("EventSub redemptions run the reward, and the chat copy is skipped", async () => {
  const client = createFakeClient();
  const io = createFakeIo();
  listenForRedemptions({ client, io });

  // A reward without text: chat never sees these, EventSub does
  const res = await signedPost("notification", {
    subscription: redemptionSubscription,
    event: {
      broadcaster_user_login: "joesbeard",
      user_login: "rainy",
      user_name: "RainyDay",
      user_input: "",
      reward: { id: REWARD_IDS.RAIN, title: "Summon the rain" },
    },
  });
  assert.equal(res.status, 204);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.deepEqual(io.emitted.find(([, event]) => event === "rain"), ["overlay:#joesbeard", "rain"]);
  assert.match(client.said[0][1], /RainyDay has just summoned the rain/);

  // The same reward tagged in chat: ignored on the connected channel, still handled elsewhere
  const chatIo = createFakeIo();
  const handle = createMessageHandler({ client: createFakeClient(), io: chatIo });
  const rewardChat = (channel) => handle(channel, chatContext("rainy", "RainyDay", { "custom-reward-id": REWARD_IDS.RAIN }), "drizzle", false);
  await rewardChat("#joesbeard");
  assert.equal(chatIo.emitted.filter(([, event]) => event === "rain").length, 0);
  await rewardChat("#frampersand");
  assert.deepEqual(chatIo.emitted.find(([, event]) => event === "rain"), ["overlay:#frampersand", "rain"]);
});

test("logout clears the session", async () => {
  const res = await fetch(`${baseUrl}/auth/logout`, { method: "POST", headers: { cookie: session } });
  assert.equal(res.status, 204);
  assert.match(res.headers.getSetCookie().join(";"), /fb_session=;/);
});
