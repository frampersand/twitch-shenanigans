import { Router } from "express";
import { getRoster } from "../services/rosters.js";
import { RANDOMIZER_GAMES } from "../../shared/randomizerGames.js";

const router = Router();

router.get("/api/rosters/:game", (req, res) => {
  if (!Object.hasOwn(RANDOMIZER_GAMES, req.params.game)) {
    return res.status(404).json({ error: "unknown_game" });
  }
  res.json(getRoster(req.params.game));
});

export default router;
