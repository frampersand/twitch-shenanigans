import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "fs/promises";
import path from "path";
import { chatContext, createFakeClient, createFakeIo, useTempDataDir } from "./helpers.js";

const dataDir = await useTempDataDir();
const { createMessageHandler } = await import("../src/twitch/messageHandler.js");
const { REWARD_IDS } = await import("../src/config/rewards.js");

function setup(options = {}) {
  const client = createFakeClient(options);
  const io = createFakeIo(options);
  return { client, io, handle: createMessageHandler({ client, io }) };
}

const emitsOf = (io, event) => io.emitted.filter(([, e]) => e === event);

test("commands are case-insensitive", async () => {
  const { io, handle } = setup();
  await handle("#frampersand", chatContext("alice", "Alice"), "!DealWithIt", false);
  const [roll] = emitsOf(io, "randomize");
  assert.equal(roll[0], "randomizer:#frampersand");
  assert.equal(roll[2], "Alice");
});

test("!dealwithit rejects HTML/script payloads as the target", async () => {
  const { client, io, handle } = setup();
  await handle("#frampersand", chatContext("mallory"), "!dealwithit @<svg/onload=alert(1)>", false);
  assert.equal(emitsOf(io, "randomize").length, 0);
  assert.match(client.said[0][1], /not a valid user/);
});

test("rolls are announced in chat only when a randomizer overlay is open", async () => {
  const withOverlay = setup({ overlays: 1 });
  await withOverlay.handle("#frampersand", chatContext("bob"), "!dealwithit @carol_1", false);
  assert.equal(withOverlay.client.said.length, 1);
  assert.match(withOverlay.client.said[0][1], /carol_1/);

  const noOverlay = setup({ overlays: 0 });
  await noOverlay.handle("#joesbeard", chatContext("dave"), "!dealwithit", false);
  assert.equal(noOverlay.client.said.length, 0);
});

test("restricted channels only let listed logins roll", async () => {
  const { io, handle } = setup();
  await handle("#bruvhd", chatContext("randomviewer"), "!dealwithit", false);
  assert.equal(emitsOf(io, "randomize").length, 0);
  await handle("#bruvhd", chatContext("bruvhd", "BruvHD"), "!dealwithit", false);
  assert.equal(emitsOf(io, "randomize").length, 1);
});

test("permissions use the login, not the display name", async () => {
  const imposter = setup();
  await imposter.handle("#frampersand", chatContext("imposter", "Frampersand"), "!guesswhosback", false);
  assert.match(imposter.client.said[0][1], /^Certainly not/);

  const owner = setup();
  const running = owner.handle("#frampersand", chatContext("frampersand", "FRAMPERSAND"), "!guesswhosback", false);
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.match(owner.client.said[0][1], /^Guess who's back/);
  await running;
});

test("chat messages reach only that channel's overlay room", async () => {
  const { io, handle } = setup();
  await handle("#joesbeard", chatContext("erin", "Erin"), "hello there", false);
  const [portrait] = emitsOf(io, "pmd-portrait");
  assert.equal(portrait[0], "overlay:#joesbeard");
  assert.equal(portrait[2], "Erin");
});

test("concurrent !portrait commands all persist", async () => {
  const { handle } = setup();
  await Promise.all(
    Array.from({ length: 15 }, (_, i) =>
      handle("#frampersand", chatContext(`viewer${i}`, `Viewer${i}`), `!portrait ${i + 1} happy`, false)
    )
  );
  const saved = JSON.parse(await readFile(path.join(dataDir, "portraitUserbase.json"), "utf8"));
  for (let i = 0; i < 15; i++) {
    assert.ok(saved.some((u) => u.username === `Viewer${i}` && u.portrait === String(i + 1)));
  }
});

test("the Rainbearer survives a restart", async () => {
  const before = setup();
  await before.handle(
    "#frampersand",
    chatContext("rainy", "RainyDay", { "custom-reward-id": REWARD_IDS.RAIN }),
    "",
    false
  );
  assert.equal(emitsOf(before.io, "rain")[0][0], "overlay:#frampersand");

  const after = setup();
  await after.handle("#frampersand", chatContext("frank"), "!rainbearer", false);
  assert.match(after.client.said[0][1], /RainyDay/);
});

test("a disconnected bot doesn't throw out of the handler", async () => {
  const { handle } = setup({ fail: true });
  await assert.doesNotReject(
    handle("#frampersand", chatContext("grace", "Grace", { "first-msg": true }), "hi", false)
  );
});
