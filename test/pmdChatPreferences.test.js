import { test } from "node:test";
import assert from "node:assert/strict";
import { useTempDataDir } from "./helpers.js";

await useTempDataDir();
const { getPmdPreferencesForChannel, updatePmdPreference, DEFAULT_CHANNEL_PREFERENCES } =
  await import("../src/services/pmdChatPreferences.js");

test("unknown channels get the defaults", async () => {
  assert.deepEqual(await getPmdPreferencesForChannel("#nobody"), DEFAULT_CHANNEL_PREFERENCES);
});

test("preference names are case-insensitive and values are validated", async () => {
  assert.deepEqual(
    await updatePmdPreference({ target: "#Frampersand", preference: "ChatDirection", value: "DOWN" }),
    { preference: "chatDirection", value: "down" }
  );
  assert.equal((await updatePmdPreference({ target: "#frampersand", preference: "chatdirection", value: "left" })).error, "invalid_chat_direction");
  assert.equal((await updatePmdPreference({ target: "#frampersand", preference: "solidbubblescolor", value: "red" })).error, "invalid_color");
  assert.equal((await updatePmdPreference({ target: "#frampersand", preference: "nope", value: "1" })).error, "unsupported");
});

test("maxMessages takes whole numbers from 1 to 20", async () => {
  assert.deepEqual(
    await updatePmdPreference({ target: "#frampersand", preference: "maxmessages", value: " 8 " }),
    { preference: "maxMessages", value: 8 }
  );
  assert.equal((await getPmdPreferencesForChannel("#frampersand")).maxMessages, 8);
  for (const bad of ["0", "21", "2.5", "-3", "lots", ""]) {
    assert.equal((await updatePmdPreference({ target: "#frampersand", preference: "maxMessages", value: bad })).error, "invalid_max_messages", bad);
  }
});

test("concurrent updates to one channel all persist", async () => {
  await Promise.all([
    updatePmdPreference({ target: "#joesbeard", preference: "solidbubbles", value: "on" }),
    updatePmdPreference({ target: "#joesbeard", preference: "portraitshape", value: "circle" }),
    updatePmdPreference({ target: "#joesbeard", preference: "bubbletextcolor", value: "000" }),
  ]);
  const prefs = await getPmdPreferencesForChannel("#joesbeard");
  assert.equal(prefs.solidBubbles, true);
  assert.equal(prefs.portraitShape, "round");
  assert.equal(prefs.bubbleTextColor, "#000");
});
