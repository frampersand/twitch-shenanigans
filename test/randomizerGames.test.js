import { test } from "node:test";
import assert from "node:assert/strict";
import { parseDealWithItArgs } from "../shared/randomizerGames.js";

test("!dealwithit arguments: game, role and target in any order", () => {
  assert.deepEqual(parseDealWithItArgs([]), { game: "unite", role: null, target: null });
  assert.deepEqual(parseDealWithItArgs(["overwatch", "support"]), { game: "overwatch", role: "support", target: null });
  assert.deepEqual(parseDealWithItArgs(["@carol_1", "VAL", "Duelist"]), { game: "valorant", role: "duelist", target: "carol_1" });
  assert.deepEqual(parseDealWithItArgs(["supports", "ow2"]), { game: "overwatch", role: "support", target: null });
});

test("!dealwithit aliases map to each game's own roles", () => {
  // Without a game, a role means UNITE's role
  assert.equal(parseDealWithItArgs(["support"]).role, "supporter");
  assert.equal(parseDealWithItArgs(["rivals", "tank"]).role, "vanguard");
  assert.equal(parseDealWithItArgs(["lol", "adc"]).role, "marksman");
  assert.equal(parseDealWithItArgs(["overwatch", "dps"]).role, "damage");
});

test("!dealwithit rejects unknown words and bad targets", () => {
  assert.deepEqual(parseDealWithItArgs(["minecraft"]), { error: "unknown_option" });
  assert.deepEqual(parseDealWithItArgs(["valorant", "healer"]), { error: "unknown_option" });
  assert.deepEqual(parseDealWithItArgs(["overwatch", "valorant"]), { error: "unknown_option" });
  assert.deepEqual(parseDealWithItArgs(["@<svg/onload=alert(1)>"]), { error: "invalid_target" });
  assert.deepEqual(parseDealWithItArgs(["@one", "@two"]), { error: "invalid_target" });
});
