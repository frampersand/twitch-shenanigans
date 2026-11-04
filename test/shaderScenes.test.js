import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentBackground,
  findScene,
  normalizeBackground,
  normalizeColor,
  randomScene,
  SCENES,
} from "../shared/shaderScenes.js";

test("scenes by name, alias or number", () => {
  assert.equal(findScene("Lava"), "lava");
  assert.equal(findScene("lavalamp"), "lava");
  assert.equal(findScene("mesh"), "aurora");
  assert.equal(findScene("1"), "aurora");
  assert.equal(findScene("#8"), "lava");
  assert.equal(findScene("10"), null);
  assert.equal(findScene("0"), null);
  assert.equal(findScene("plain"), "plain");
  assert.equal(findScene("SHUFFLE"), "shuffle");
  assert.equal(findScene("minecraft"), null);
  assert.equal(findScene(""), null);
  // Every alias points at one scene only
  const aliases = Object.values(SCENES).flatMap((scene) => scene.aliases);
  assert.equal(new Set(aliases).size, aliases.length);
});

test("a random scene differs from the current one", () => {
  for (let i = 0; i < 20; i++) assert.notEqual(randomScene("aurora"), "aurora");
});

test("stored looks are cleaned up", () => {
  assert.equal(normalizeColor("9146FF"), "#9146ff");
  assert.equal(normalizeColor("#f60"), "#ff6600");
  assert.equal(normalizeColor("red"), null);
  assert.deepEqual(normalizeBackground({}), { scene: "aurora", color: null, speed: 1 });
  assert.deepEqual(normalizeBackground({ scene: "nope", color: "zzz", speed: 9 }), { scene: "aurora", color: null, speed: 2 });
  assert.deepEqual(normalizeBackground({ scene: "plain", color: "abc", speed: 0 }), { scene: "plain", color: "#aabbcc", speed: 0 });
  // Settings saved before the rename used "tint"
  assert.equal(normalizeBackground({ scene: "lava", tint: "#123456" }).color, "#123456");
});

test("a new color keeps the scene and a new scene keeps the color", () => {
  const defaults = { scene: "aurora", color: null, speed: 1 };
  assert.deepEqual(currentBackground(defaults, { color: "#ff6600" }), { scene: "aurora", color: "#ff6600", speed: 1 });
  assert.deepEqual(currentBackground(defaults, { color: "#ff6600", scene: "lava" }), { scene: "lava", color: "#ff6600", speed: 1 });
  // An explicit null goes back to the scene's own colors, over a default color
  assert.equal(currentBackground({ ...defaults, color: "#00ff00" }, { color: null }).color, null);
  assert.deepEqual(currentBackground(defaults, {}), defaults);
});
