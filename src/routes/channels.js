import { Router } from "express";
import { channels } from "../config/channels.js";

const router = Router();

/** Channels FramperBot joins (public info: it's in every channel's chat), for the home page */
router.get("/api/channels", (_req, res) => {
  res.json(channels.map((channel) => channel.toLowerCase()));
});

export default router;
