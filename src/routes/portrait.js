import { Router } from "express";
import {
  getPortraitFile,
  getPortraitUserData,
  PortraitNotFoundError,
} from "../services/portrait.js";
import { pmdPortraitUrl } from "../../shared/cdn.js";
import { config } from "../config/index.js";
import { requireAdmin } from "../services/adminAuth.js";

const router = Router();

router.get("/portrait", async (req, res) => {
  const parsed = parseInt(req.query.portrait, 10);
  const portraitNumber = Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
  // Repeated query params arrive as arrays; only a plain string is a valid variant
  const variant = typeof req.query.variant === "string" ? req.query.variant : "";

  try {
    const filePath = await getPortraitFile(portraitNumber, variant);
    res.json({ file: filePath, url: pmdPortraitUrl(filePath, config.cdnBaseUrl) });
  } catch (error) {
    if (error instanceof PortraitNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    console.error("Failed to pick portrait:", error);
    res.status(500).json({ error: "failed_to_pick_portrait" });
  }
});

router.get("/pmd-user-data", requireAdmin, async (req, res) => {
  try {
    const jsonData = await getPortraitUserData();
    res.json(jsonData);
  } catch (error) {
    console.error("Error reading portrait user data:", error);
    res.status(500).json({ error: "Failed to read data file" });
  }
});

export default router;
