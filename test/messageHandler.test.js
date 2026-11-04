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

test("!dealwithit rolls the named game and role, and reroll repeats it", async () => {
  const { getRoster } = await import("../src/services/rosters.js");
  const { io, handle } = setup();
  await handle("#frampersand", chatContext("gamer_one", "GamerOne"), "!dealwithit valorant duelist", false);
  const [roll] = emitsOf(io, "randomize");
  assert.equal(roll[5], "valorant");
  assert.equal(getRoster("valorant").find((entry) => entry.id === roll[4])?.role, "duelist");

  await handle(
    "#frampersand",
    chatContext("gamer_one", "GamerOne", { "custom-reward-id": REWARD_IDS.REROLL }),
    "",
    false
  );
  const reroll = emitsOf(io, "randomize")[1];
  assert.equal(reroll[5], "valorant");
  assert.equal(getRoster("valorant").find((entry) => entry.id === reroll[4])?.role, "duelist");
});

test("!cardstyle sets the channel's randomizer card, broadcaster only", async () => {
  const { client, io, handle } = setup();
  const broadcaster = chatContext("joesbeard", "JoesBeard", { badges: { broadcaster: "1" } });

  await handle("#joesbeard", chatContext("viewer_x"), "!cardstyle holo", false);
  assert.equal(client.said.length, 0);

  await handle("#joesbeard", broadcaster, "!cardstyle sparkly", false);
  assert.match(client.said.at(-1)[1], /don't know that card style/);

  await handle("#joesbeard", broadcaster, "!cardstyle Slot", false);
  assert.match(client.said.at(-1)[1], /now use: Slot reel/);
  await handle("#joesbeard", chatContext("roller_a"), "!dealwithit", false);
  assert.equal(emitsOf(io, "randomize").at(-1)[6], "reel");

  // Other channels keep their own setting
  await handle("#frampersand", chatContext("roller_b"), "!dealwithit", false);
  assert.equal(emitsOf(io, "randomize").at(-1)[6], "classic");

  // "random" picks a real style for each roll
  await handle("#joesbeard", broadcaster, "!cardstyle random", false);
  for (let i = 0; i < 6; i++) await handle("#joesbeard", broadcaster, "!dealwithit", false);
  const styles = emitsOf(io, "randomize").slice(-6).map((roll) => roll[6]);
  assert.ok(styles.every((style) => ["classic", "holo", "reel", "lockin"].includes(style)));

  await handle("#joesbeard", broadcaster, "!cardstyle", false);
  assert.match(client.said.at(-1)[1], /a random style every roll/);
});

test("a mistyped !dealwithit gets help once and keeps the cooldown", async () => {
  const { client, io, handle } = setup();
  const typo = () => handle("#frampersand", chatContext("typo_roller"), "!dealwithit minecraft", false);
  await typo();
  await typo();
  assert.equal(client.said.filter(([, m]) => /I don't know that one/.test(m)).length, 1);
  assert.equal(emitsOf(io, "randomize").length, 0);

  await handle("#frampersand", chatContext("typo_roller"), "!dealwithit overwatch", false);
  assert.equal(emitsOf(io, "randomize")[0][5], "overwatch");
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
      handle("#frampersand", chatContext(`viewer${i}`, `Viewer${i}`), `!portrait ${i % 2 ? 25 : 1} happy`, false)
    )
  );
  const saved = JSON.parse(await readFile(path.join(dataDir, "portraitUserbase.json"), "utf8"));
  for (let i = 0; i < 15; i++) {
    assert.ok(saved.some((u) => u.username === `Viewer${i}` && u.portrait === String(i % 2 ? 25 : 1)));
  }
});

test("!portrait rejects numbers the CDN has no portrait for", async () => {
  const { client, handle } = setup();
  for (const input of ["9999", "pikachu", "-1"]) {
    await handle("#frampersand", chatContext(`picky_${input}`, "Picky"), `!portrait ${input}`, false);
  }
  assert.equal(client.said.length, 3);
  for (const [, message] of client.said) assert.match(message, /couldn't find that portrait/);

  await handle("#frampersand", chatContext("tricky"), "!portrait 25 <img>", false);
  const saved = JSON.parse(await readFile(path.join(dataDir, "portraitUserbase.json"), "utf8"));
  assert.ok(!saved.some((u) => u.username.startsWith("Picky")));
  assert.deepEqual(
    saved.find((u) => u.username === "tricky"),
    { username: "tricky", portrait: "25", variant: "", channel: "#frampersand" }
  );
});

test("a mistyped !portrait doesn't cost the viewer their cooldown", async () => {
  const { client, handle } = setup();
  const typo = () => handle("#frampersand", chatContext("typo_fan", "TypoFan"), "!portrait 99999", false);

  await typo();
  await typo();
  // Only one "not found" reply, so typos can't be used to spam the bot
  assert.equal(client.said.filter(([, m]) => /couldn't find/.test(m)).length, 1);

  await handle("#frampersand", chatContext("typo_fan", "TypoFan"), "!portrait 25", false);
  const saved = JSON.parse(await readFile(path.join(dataDir, "portraitUserbase.json"), "utf8"));
  assert.equal(saved.find((u) => u.username === "TypoFan")?.portrait, "25");

  // After a successful change the normal cooldown applies
  await handle("#frampersand", chatContext("typo_fan", "TypoFan"), "!portrait 1", false);
  assert.match(client.said.at(-1)[1], /stop spamming/);
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

test("!background changes this stream's background, broadcaster only, and overlays hear it", async () => {
  const { client, io, handle } = setup();
  const broadcaster = chatContext("joesbeard", "JoesBeard", { badges: { broadcaster: "1" } });
  const looks = () => emitsOf(io, "background-scene").map(([room, , look]) => [room, look]);

  await handle("#joesbeard", chatContext("viewer_y"), "!background lava", false);
  assert.equal(looks().length, 0);
  assert.equal(client.said.length, 0);

  await handle("#joesbeard", broadcaster, "!bg Lava", false);
  assert.deepEqual(looks().at(-1), ["overlay:#joesbeard", { scene: "lava", color: null, speed: 1 }]);
  assert.match(client.said.at(-1)[1], /now shows Lava lamp \(#8\)/);

  await handle("#joesbeard", broadcaster, "!background color 9146FF", false);
  assert.deepEqual(looks().at(-1)[1], { scene: "lava", color: "#9146ff", speed: 1 });
  // A new scene keeps the color
  await handle("#joesbeard", broadcaster, "!background 2", false);
  assert.deepEqual(looks().at(-1)[1], { scene: "lagoon", color: "#9146ff", speed: 1 });
  await handle("#joesbeard", broadcaster, "!background color purple", false);
  assert.match(client.said.at(-1)[1], /use !background color/);
  await handle("#joesbeard", broadcaster, "!background color off", false);
  assert.equal(looks().at(-1)[1].color, null);

  await handle("#joesbeard", broadcaster, "!background random", false);
  assert.notEqual(looks().at(-1)[1].scene, "lagoon");
  await handle("#joesbeard", broadcaster, "!background minecraft", false);
  assert.match(client.said.at(-1)[1], /don't know that scene/);
  await handle("#joesbeard", broadcaster, "!background", false);
  assert.match(client.said.at(-1)[1], /default: Aurora/);

  // Reset goes back to the dashboard default
  await handle("#joesbeard", broadcaster, "!background reset", false);
  assert.deepEqual(looks().at(-1)[1], { scene: "aurora", color: null, speed: 1 });
});

test("color and scene rewards build on each other, in either order", async () => {
  const { setRewardLink } = await import("../src/services/channelRewards.js");
  await setRewardLink("#frampersand", "scene", "scene-reward");
  const { client, io, handle } = setup();
  const look = () => emitsOf(io, "background-scene").at(-1)[2];
  const redeem = (reward, text) =>
    handle("#frampersand", chatContext("viewer_z", "ViewerZ", { "custom-reward-id": reward }), text, false);

  // Scene first, then a color repaints it
  await redeem("scene-reward", "ether please");
  assert.deepEqual(look(), { scene: "ether", color: null, speed: 1 });
  assert.match(client.said.at(-1)[1], /ViewerZ switched the background to Ether \(#9\)/);
  await redeem(REWARD_IDS.BACKGROUND_COLOR, "ff6600");
  assert.deepEqual(look(), { scene: "ether", color: "#ff6600", speed: 1 });
  // The Pokémon pattern source still gets the color as before
  assert.equal(emitsOf(io, "color").at(-1)[2], "ff6600");

  // A new scene (by number) takes on the color
  await redeem("scene-reward", "8");
  assert.deepEqual(look(), { scene: "lava", color: "#ff6600", speed: 1 });
  await redeem("scene-reward", "plain");
  assert.equal(look().scene, "plain");

  // Unknown text, or shuffle (broadcasters only), gives a random scene and says so
  await redeem("scene-reward", "shuffle");
  assert.ok(!["plain", "shuffle"].includes(look().scene));
  assert.match(client.said.at(-1)[1], /didn't recognize that scene/);
});
