import express, { Router } from "express";
import { eventSubEnabled } from "../config/index.js";
import { checkMessage, handleMessage } from "../services/eventSub.js";

const router = Router();

// The signature covers the exact bytes Twitch sent, so read the body raw (and keep it small)
router.post("/eventsub/callback", express.raw({ type: "application/json", limit: "64kb" }), async (req, res) => {
  if (!eventSubEnabled) return res.status(503).end();

  const problem = checkMessage({
    id: req.get("Twitch-Eventsub-Message-Id"),
    timestamp: req.get("Twitch-Eventsub-Message-Timestamp"),
    signature: req.get("Twitch-Eventsub-Message-Signature"),
    rawBody: Buffer.isBuffer(req.body) ? req.body : null,
  });
  // A redelivery we already handled: acknowledge so Twitch stops retrying
  if (problem === "duplicate") return res.status(204).end();
  if (problem) return res.status(403).end();

  try {
    const result = await handleMessage(req.get("Twitch-Eventsub-Message-Type"), JSON.parse(req.body.toString("utf8")));
    if (result.contentType) res.type(result.contentType);
    res.status(result.status).send(result.body ?? "");
  } catch (err) {
    console.error("EventSub message failed:", err);
    res.status(500).end();
  }
});

export default router;
