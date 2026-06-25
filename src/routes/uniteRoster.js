import { Router } from "express";
import { getUniteRoster } from "../services/uniteRoster/storage.js";
import { syncUniteRosterFromGame8 } from "../services/uniteRoster/sync.js";

const router = Router();

router.get("/api/unite-roster", async (_req, res) => {
  try {
    const roster = await getUniteRoster();
    res.json(roster);
  } catch (err) {
    console.error("Failed to load unite roster:", err);
    res.status(500).json({ error: "failed_to_load_roster" });
  }
});

router.post("/api/unite-roster/sync", async (_req, res) => {
  try {
    const result = await syncUniteRosterFromGame8();
    res.json(result);
  } catch (err) {
    console.error("Manual unite roster sync failed:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
