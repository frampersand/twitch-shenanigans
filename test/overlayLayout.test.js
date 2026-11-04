import { test } from "node:test";
import assert from "node:assert/strict";
import { framePositions } from "../public/sources/sprites/framePositions.js";
import { numberParam, rectParam } from "../public/utils/viewParams.js";

test("frame slots sit centered on every edge, corners included once", () => {
  const slots = framePositions(800, 450, 50);
  const centers = slots.map(({ x, y }) => [x + 25, y + 25]);
  const onEdge = ([cx, cy]) => cx === 0 || cx === 800 || cy === 0 || cy === 450;
  assert.ok(centers.every(onEdge));
  for (const corner of [[0, 0], [800, 0], [0, 450], [800, 450]]) {
    assert.equal(centers.filter(([cx, cy]) => cx === corner[0] && cy === corner[1]).length, 1);
  }
  // 16 gaps across (17 slots, top and bottom) + 8 inner slots per side = the original 50
  assert.equal(slots.length, 50);
});

test("tiny frames still get one slot per corner", () => {
  assert.equal(framePositions(10, 10, 50).length, 4);
});

test("URL layout params are validated", () => {
  const q = (s) => new URLSearchParams(s);
  assert.deepEqual(rectParam("frame", q("frame=24,24,1440,810")), { x: 24, y: 24, width: 1440, height: 810 });
  assert.equal(rectParam("frame", q("frame=24,24,0,810")), null);
  assert.equal(rectParam("frame", q("frame=1,2,3")), null);
  assert.equal(numberParam("scale", { min: 0.25, max: 4 }, q("scale=1.5")), 1.5);
  assert.equal(numberParam("scale", { min: 0.25, max: 4 }, q("scale=9")), null);
  assert.equal(numberParam("x", {}, q("x=")), null);
});
