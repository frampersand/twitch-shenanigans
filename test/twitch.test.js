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
    if (form.get("code") === "owner-code") return json(200, { access_token: "owner-token", refresh_token: "r", expires_in: 3600 });
    if (form.get("code") === "new-code") return json(200, { access_token: "new-token", refresh_token: "r", expires_in: 3600 });
    return json(400, { message: "Invalid authorization code" });
  }
  if (req.url === "/oauth2/validate" && req.headers.authorization === "OAuth user-token") {
    return json(200, { login: "JoesBeard", user_id: "1001", scopes: ["channel:read:redemptions"], client_id: "test-client" });
  }
  if (req.url === "/oauth2/validate" && req.headers.authorization === "OAuth owner-token") {
    return json(200, { login: "frampersand", user_id: "1", scopes: ["channel:read:redemptions"], client_id: "test-client" });
  }
  if (req.url === "/oauth2/validate" && req.headers.authorization === "OAuth new-token") {
    return json(200, { login: "NewStreamer", user_id: "2002", scopes: ["channel:read:redemptions"], client_id: "test-client" });
  }
  if (req.url.startsWith("/helix/channel_points/custom_rewards") && req.headers.authorization === "Bearer new-token") return json(200, { data: [] });
  if (req.url.startsWith("/helix/eventsub/subscriptions") && req.method === "DELETE") return res.writeHead(204).end();
  if (req.url.startsWith("/helix/channel_points/custom_rewards") && req.headers.authorization === "Bearer user-token") {
    return json(200, { data: [
      { id: "r-rain", title: "Make it rain", cost: 500, prompt: "", is_user_input_required: false, is_enabled: true },
      { id: "r-color", title: "Paint the stream", cost: 300, prompt: "Hex color", is_user_input_required: true, is_enabled: true },
    ] });
  }
  if (req.url.startsWith("/helix/channel_points/custom_rewards")) return json(403, { message: "not an affiliate" });
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
const { channelEvents, isJoined } = await import("../src/services/channelRegistry.js");

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


async function loginAs(code) {
  const start = await fetch(`${baseUrl}/auth/twitch/login`, { redirect: "manual" });
  const state = new URL(start.headers.get("location")).searchParams.get("state");
  const res = await fetch(`${baseUrl}/auth/twitch/callback?code=${code}&state=${state}`, { redirect: "manual", headers: { cookie: cookiesOf(start) } });
  return cookiesOf(res);
}

const dashboard = (path, { cookie = session, method = "GET", body, origin = "https://bot.example.test", contentType = "application/json" } = {}) =>
  fetch(`${baseUrl}/api/dashboard${path}`, {
    method,
    headers: { cookie, ...(body !== undefined && { "Content-Type": contentType }), ...(origin && { Origin: origin }) },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });

test("dashboard: broadcasters see their own channel and rewards only", async () => {
  assert.equal((await dashboard("/channels", { cookie: "" })).status, 401);
  const mine = await (await dashboard("/channels")).json();
  assert.deepEqual(mine.channels, ["joesbeard"]);
  assert.equal(mine.isOwner, false);
  assert.equal((await dashboard("/frampersand")).status, 403);

  const settings = await (await dashboard("/joesbeard")).json();
  assert.equal(settings.channelPoints, "enabled");
  assert.equal(settings.cardStyle, "classic");
  assert.deepEqual(settings.rewards.map((r) => [r.id, r.requiresText]), [["r-rain", false], ["r-color", true]]);

  // The owner manages every channel; non-affiliates get an empty reward list
  const owner = await loginAs("owner-code");
  const ownerChannels = await (await dashboard("/channels", { cookie: owner })).json();
  assert.ok(ownerChannels.isOwner && ownerChannels.channels.includes("joesbeard") && ownerChannels.channels.includes("frampersand"));
  const frampersand = await (await dashboard("/frampersand", { cookie: owner })).json();
  assert.equal(frampersand.rewardsAvailable, false);
});

test("dashboard: settings are validated and only accepted from our own page", async () => {
  assert.equal((await dashboard("/joesbeard/card-style", { method: "PUT", body: { cardStyle: "holo" }, origin: "https://evil.example" })).status, 403);
  assert.equal((await dashboard("/joesbeard/card-style", { method: "PUT", body: "cardStyle=holo", contentType: "application/x-www-form-urlencoded" })).status, 415);
  assert.equal((await dashboard("/joesbeard/card-style", { method: "PUT", body: { cardStyle: "sparkly" } })).status, 400);
  assert.deepEqual(await (await dashboard("/joesbeard/card-style", { method: "PUT", body: { cardStyle: "Slot" } })).json(), { cardStyle: "reel" });

  const pmd = await (await dashboard("/joesbeard/pmd", { method: "PUT", body: { preference: "solidBubbles", value: true } })).json();
  assert.equal(pmd.pmd.solidBubbles, true);
  assert.equal((await dashboard("/joesbeard/pmd", { method: "PUT", body: { preference: "chatDirection", value: "sideways" } })).status, 400);

  assert.equal((await dashboard("/joesbeard/rewards", { method: "PUT", body: { feature: "rain", rewardId: "someone-elses-reward" } })).status, 400);
  assert.equal((await dashboard("/joesbeard/rewards", { method: "PUT", body: { feature: "confetti", rewardId: null } })).status, 400);

  const put = (body) => dashboard("/joesbeard/background", { method: "PUT", body });
  assert.deepEqual((await (await put({ scene: "candy" })).json()).background, { scene: "candy", color: null, speed: 1 });
  assert.deepEqual((await (await put({ color: "#FF6600", speed: 0.5 })).json()).background, { scene: "candy", color: "#ff6600", speed: 0.5 });
  assert.equal((await (await put({ color: null })).json()).background.color, null);
  assert.equal((await (await put({ scene: "plain", color: "#112233" })).json()).background.scene, "plain");
  assert.equal((await put({ scene: "minecraft" })).status, 400);
  assert.equal((await put({ color: "orange" })).status, 400);
  assert.equal((await put({ speed: 5 })).status, 400);
  assert.equal((await put({ speed: "fast" })).status, 400);
  assert.equal((await put({})).status, 400);
  const saved = await (await dashboard("/joesbeard")).json();
  assert.equal(saved.background.scene, "plain");
  assert.equal(saved.backgroundNow, null);
  assert.equal((await dashboard("/joesbeard/background/reset", { method: "POST", body: {} })).status, 200);
});

test("dashboard: linked rewards trigger their feature, and the old IDs step aside", async () => {
  const linked = await (await dashboard("/joesbeard/rewards", { method: "PUT", body: { feature: "rain", rewardId: "r-rain" } })).json();
  assert.deepEqual(linked.rewardLinks, { rain: "r-rain" });
  // Moving a reward to another feature unlinks it from the first
  const moved = await (await dashboard("/joesbeard/rewards", { method: "PUT", body: { feature: "reroll", rewardId: "r-rain" } })).json();
  assert.deepEqual(moved.rewardLinks, { reroll: "r-rain" });
  await dashboard("/joesbeard/rewards", { method: "PUT", body: { feature: "rain", rewardId: "r-rain" } });

  const client = createFakeClient();
  const io = createFakeIo();
  listenForRedemptions({ client, io });
  const redeem = (rewardId) => signedPost("notification", {
    subscription: redemptionSubscription,
    event: { broadcaster_user_login: "joesbeard", user_login: "linker", user_name: "Linker", user_input: "", reward: { id: rewardId, title: "Make it rain" } },
  });

  await redeem("r-rain");
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(io.emitted.filter(([, event]) => event === "rain").length, 1);

  // Joesbeard linked rain, so the built-in rain ID no longer triggers it there
  await redeem(REWARD_IDS.RAIN);
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(io.emitted.filter(([, event]) => event === "rain").length, 1);
});

test("self-serve: a new streamer accepts the terms, joins, and can remove FramperBot again", async () => {
  const joined = [];
  const left = [];
  channelEvents.on("joined", (login) => joined.push(login));
  channelEvents.on("left", (login) => left.push(login));

  let cookie = await loginAs("new-code");
  const before = await (await dashboard("/channels", { cookie })).json();
  assert.deepEqual(before.channels, []);
  assert.equal(before.ownChannelJoined, false);
  assert.equal((await dashboard("/newstreamer", { cookie })).status, 403);

  // Joining needs an explicit yes to the terms, and only ever adds your own channel
  assert.equal((await dashboard("/join", { cookie, method: "POST", body: {} })).status, 400);
  const join = await (await dashboard("/join", { cookie, method: "POST", body: { acceptTerms: true, channel: "someoneelse" } })).json();
  assert.equal(join.channel, "newstreamer");
  assert.ok(isJoined("newstreamer") && !isJoined("someoneelse"));
  assert.deepEqual(joined, ["newstreamer"]);

  // Logging in again (what the page does next) connects channel points
  cookie = await loginAs("new-code");
  const settings = await (await dashboard("/newstreamer", { cookie })).json();
  assert.equal(settings.terms.accepted, settings.terms.current);
  assert.deepEqual(settings.rewards, []);
  await dashboard("/newstreamer/card-style", { cookie, method: "PUT", body: { cardStyle: "holo" } });
  await dashboard("/newstreamer/background", { cookie, method: "PUT", body: { scene: "ether", color: "#123456" } });

  // Removing needs the channel name typed back, then wipes the channel's data
  assert.equal((await dashboard("/newstreamer/leave", { cookie, method: "POST", body: { confirm: "nope" } })).status, 400);
  assert.equal((await dashboard("/newstreamer/leave", { cookie, method: "POST", body: { confirm: "newstreamer" } })).status, 200);
  assert.equal(isJoined("newstreamer"), false);
  assert.deepEqual(left, ["newstreamer"]);
  assert.ok(!(await (await fetch(`${baseUrl}/api/channels`)).json()).includes("newstreamer"));
  assert.ok(twitchCalls.some((c) => c.method === "DELETE" && c.url.includes("/eventsub/subscriptions")));

  // Joining again starts from scratch: the old card style and background are gone
  await dashboard("/join", { cookie, method: "POST", body: { acceptTerms: true } });
  const fresh = await (await dashboard("/newstreamer", { cookie })).json();
  assert.equal(fresh.cardStyle, "classic");
  assert.deepEqual(fresh.background, { scene: "aurora", color: null, speed: 1 });

  // The home channel can't be removed
  const owner = await loginAs("owner-code");
  assert.equal((await dashboard("/frampersand/leave", { cookie: owner, method: "POST", body: { confirm: "frampersand" } })).status, 400);
});

test("logout clears the session", async () => {
  const res = await fetch(`${baseUrl}/auth/logout`, { method: "POST", headers: { cookie: session } });
  assert.equal(res.status, 204);
  assert.match(res.headers.getSetCookie().join(";"), /fb_session=;/);
});
