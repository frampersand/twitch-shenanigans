import { Router } from "express";
import {
  getPortraitFile,
  getPortraitUserData,
} from "../services/portrait.js";

const router = Router();

router.get("/portrait", async (req, res) => {
  const portraitNumber = (req.query.portrait && parseInt(req.query.portrait)) || 0;
  const variant = req.query.variant || "";

  try {
    const filePath = await getPortraitFile(portraitNumber, variant);
    res.json({ file: filePath });
  } catch (error) {
    if (error.message?.includes("No subfolders") || error.message?.includes("No .png")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get("/pmd-user-data", async (req, res) => {
  try {
    const jsonData = await getPortraitUserData();
    res.json(jsonData);
  } catch (error) {
    console.error("Error reading portrait user data:", error);
    res.status(500).json({ error: "Failed to read data file" });
  }
});

export default router;
