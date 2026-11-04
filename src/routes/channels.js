import { Router } from "express";
import { joinedChannels } from "../services/channelRegistry.js";

const router = Router();

/** Channels FramperBot joins (public info: it's in every channel's chat), for the home page */
router.get("/api/channels", (_req, res) => {
  res.json(joinedChannels());
});

export default router;
