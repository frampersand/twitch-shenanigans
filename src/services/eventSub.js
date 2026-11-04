import { EventEmitter } from "events";
import { createHmac, timingSafeEqual } from "crypto";
import { config, eventSubCallbackUrl, eventSubEnabled } from "../config/index.js";
import { channels } from "../config/channels.js";
import {
  createRedemptionSubscription,
  deleteSubscription,
  listRedemptionSubscriptions,
} from "./twitchApi.js";
import { getConnections, setEventSubStatus } from "./twitchConnections.js";

/**
 * Channel point redemptions through EventSub webhooks: Twitch POSTs each redemption to
 * /eventsub/callback, signed with TWITCH_EVENTSUB_SECRET. Unlike chat, this includes rewards
 * that don't ask the viewer for text. Listeners get "redemption" events (see index.js).
 */
export const redemptionEvents = new EventEmitter();

const { eventSubSecret } = config.twitchApp;
/** Twitch's guidance: reject messages older than 10 minutes, and ignore redeliveries */
const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000;
const seenMessageIds = new Map();

const JOINED = new Set(channels.map((c) => c.toLowerCase()));
/** Statuses where the subscription won't come back on its own and should be recreated */
const BROKEN = new Set(["webhook_callback_verification_failed", "notification_failures_exceeded"]);

/** Check Twitch's signature, age and message id. Returns an error string, or null when it's good */
export function checkMessage({ id, timestamp, signature, rawBody }) {
  if (!id || !timestamp || !signature || !rawBody) return "missing_headers";
  const expected = Buffer.from(
    `sha256=${createHmac("sha256", eventSubSecret).update(id + timestamp).update(rawBody).digest("hex")}`
  );
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return "bad_signature";
  const age = Date.now() - new Date(timestamp).getTime();
  if (!(age < MAX_MESSAGE_AGE_MS)) return "too_old";

  for (const [seenId, seenAt] of seenMessageIds) {
    if (Date.now() - seenAt > MAX_MESSAGE_AGE_MS) seenMessageIds.delete(seenId);
  }
  if (seenMessageIds.has(id)) return "duplicate";
  seenMessageIds.set(id, Date.now());
  return null;
}

/** Subscribe a connected broadcaster's redemptions, if FramperBot is on their channel */
export async function subscribeBroadcaster({ userId, login }) {
  if (!eventSubEnabled || !JOINED.has(login)) return null;
  const subscription = await createRedemptionSubscription({
    broadcasterUserId: userId,
    callbackUrl: eventSubCallbackUrl,
    secret: eventSubSecret,
  });
  // null: Twitch already has one (409); the startup sync records its status
  if (subscription) {
    await setEventSubStatus(userId, { id: subscription.id, status: subscription.status });
    console.log(`[eventsub] subscribed #${login} redemptions (${subscription.status})`);
  } else {
    console.log(`[eventsub] #${login} redemptions already subscribed`);
  }
  return subscription;
}

/**
 * On startup: match stored connections with Twitch's subscriptions, recreate broken or
 * missing ones, and record each one's status (only "enabled" turns off the chat fallback).
 */
export async function syncSubscriptions() {
  if (!eventSubEnabled) return;
  const connections = await getConnections();
  const existing = await listRedemptionSubscriptions();

  for (const [userId, connection] of Object.entries(connections)) {
    if (!JOINED.has(connection.login)) continue;
    const ours = existing.filter(
      (s) => s.condition.broadcaster_user_id === userId && s.transport.callback === eventSubCallbackUrl
    );
    const healthy = ours.find((s) => !BROKEN.has(s.status));
    for (const broken of ours.filter((s) => BROKEN.has(s.status))) {
      console.log(`[eventsub] #${connection.login} subscription was ${broken.status}, recreating`);
      await deleteSubscription(broken.id);
    }

    if (healthy) {
      await setEventSubStatus(userId, { id: healthy.id, status: healthy.status });
      console.log(`[eventsub] #${connection.login} redemptions: ${healthy.status}`);
    } else {
      await subscribeBroadcaster({ userId, login: connection.login });
    }
  }
}

/** Handle one verified webhook message; returns { status, body?, contentType? } for the response */
export async function handleMessage(type, payload) {
  const { subscription, event, challenge } = payload;
  const userId = subscription?.condition?.broadcaster_user_id;

  if (type === "webhook_callback_verification") {
    if (userId) await setEventSubStatus(userId, { id: subscription.id, status: "enabled" });
    console.log(`[eventsub] Twitch verified the callback for broadcaster ${userId}`);
    return { status: 200, body: challenge, contentType: "text/plain" };
  }
  if (type === "revocation") {
    // The broadcaster disconnected FramperBot (or Twitch gave up): chat-tagged rewards work again
    if (userId) await setEventSubStatus(userId, { status: subscription.status });
    console.log(`[eventsub] subscription for broadcaster ${userId} revoked: ${subscription.status}`);
    return { status: 204 };
  }
  if (type === "notification" && subscription?.type === "channel.channel_points_custom_reward_redemption.add") {
    redemptionEvents.emit("redemption", {
      channel: `#${event.broadcaster_user_login.toLowerCase()}`,
      rewardId: event.reward.id,
      rewardTitle: event.reward.title,
      userLogin: event.user_login,
      userName: event.user_name,
      input: event.user_input ?? "",
    });
  }
  return { status: 204 };
}
