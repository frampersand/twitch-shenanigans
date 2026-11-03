import { Router } from "express";
import { getUniteRoster } from "../services/uniteRoster.js";

const router = Router();

router.get("/api/unite-roster", (_req, res) => {
  res.json(getUniteRoster());
});

export default router;
