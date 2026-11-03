import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import { io as connect } from "socket.io-client";
import { ADMIN_TOKEN, useTempDataDir } from "./helpers.js";

await useTempDataDir();
const { createApp } = await import("../src/app.js");
const { getUniteRoster } = await import("../src/services/uniteRoster.js");

let server;
let baseUrl;
const sockets = [];

before(async () => {
  ({ server } = createApp());
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(async () => {
  for (const s of sockets) s.close();
  await new Promise((resolve) => server.close(resolve));
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Connect a socket that records everything it receives */
async function client({ token, join } = {}) {
  const socket = connect(baseUrl, token ? { auth: { token } } : {});
  socket.received = [];
  socket.onAny((event, ...args) => socket.received.push([event, args]));
  sockets.push(socket);
  await new Promise((resolve) => socket.on("connect", resolve));
  if (join) socket.emit(join.event ?? "overlay-connect", join.channel);
  await wait(50);
  return socket;
}

const eventsOf = (socket, event) => socket.received.filter(([e]) => e === event).map(([, a]) => a);

test("admin token is checked and reported back", async () => {
  const good = await client({ token: ADMIN_TOKEN });
  const bad = await client({ token: "wrong" });
  assert.deepEqual(eventsOf(good, "admin-status"), [[true]]);
  assert.deepEqual(eventsOf(bad, "admin-status"), [[false]]);
});

test("overlays only receive their own channel's admin events", async () => {
  const framps = await client({ join: { channel: "frampersand" } });
  const joes = await client({ join: { channel: "JoesBeard" } });
  const admin = await client({ token: ADMIN_TOKEN });

  admin.emit("color", "112233");
  admin.emit("color", "#445566", "#joesbeard");
  admin.emit("color", "red;}body{display:none");
  await wait(100);

  assert.deepEqual(eventsOf(framps, "color"), [["112233"]]);
  assert.deepEqual(eventsOf(joes, "color"), [["445566"]]);
});

test("unauthenticated sockets can't trigger overlays or crash the server", async () => {
  const overlay = await client({ join: { channel: "frampersand" } });
  const attacker = await client();

  attacker.emit("color", "ff0000");
  attacker.emit("rain");
  attacker.emit("randomize", "<img src=x onerror=alert(1)>", "#frampersand");
  attacker.emit("randomized");
  attacker.emit("randomized", "#frampersand\r\nJOIN #evil", "hi");
  attacker.emit("overlay-connect", { evil: true });
  attacker.emit("pmd-config-request", 12345);
  await wait(100);

  assert.equal(overlay.received.length, 0);
  assert.ok(attacker.connected);
});

test("admin randomize reaches randomizer overlays with a server-picked id", async () => {
  const randomizer = await client({ join: { event: "randomizer-connect", channel: "frampersand" } });
  const admin = await client({ token: ADMIN_TOKEN });
  admin.emit("randomize", "Tester", "#frampersand");
  await wait(100);
  const [[player, channel, id]] = eventsOf(randomizer, "randomize");
  assert.equal(player, "Tester");
  assert.equal(channel, "#frampersand");
  assert.ok(getUniteRoster().some((entry) => entry.id === id));
});

test("admin-only HTTP endpoints require the token", async () => {
  const noToken = await fetch(`${baseUrl}/pmd-user-data`);
  assert.equal(noToken.status, 401);
  const withToken = await fetch(`${baseUrl}/pmd-user-data`, {
    headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
  });
  assert.equal(withToken.status, 200);
});

test("UNITE roster is static and points at the CDN", async () => {
  const roster = await (await fetch(`${baseUrl}/api/unite-roster`)).json();
  assert.ok(roster.length > 90);
  for (const entry of roster) {
    assert.match(entry.id, /^[a-z0-9-]+$/);
    assert.equal(entry.image, `${process.env.CDN_BASE_URL}/unite/${entry.id}.png`);
  }
  const sync = await fetch(`${baseUrl}/api/unite-roster/sync`, { method: "POST" });
  assert.equal(sync.status, 404);
});

test("/portrait picks from the CDN manifest and returns CDN URLs", async () => {
  const ok = await fetch(`${baseUrl}/portrait?portrait=1&variant=normal`);
  assert.equal(ok.status, 200);
  const body = await ok.json();
  assert.equal(body.file, "0001/Normal.png");
  assert.equal(body.url, `${process.env.CDN_BASE_URL}/pmd/portrait/0001/Normal.png`);

  const flipped = await (await fetch(`${baseUrl}/portrait?portrait=25&variant=happy%5E`)).json();
  assert.match(flipped.url, /\/0025\/Happy%5E\.png$/);
  const random = await (await fetch(`${baseUrl}/portrait`)).json();
  assert.match(random.file, /^(0001|0025)\//);

  const missing = await fetch(`${baseUrl}/portrait?portrait=99999`);
  assert.equal(missing.status, 404);
  const repeated = await fetch(`${baseUrl}/portrait?portrait=1&variant=a&variant=b`);
  assert.equal(repeated.status, 200);
});

test("shared modules are served to the overlays", async () => {
  const res = await fetch(`${baseUrl}/shared/bot-messages.js`);
  assert.equal(res.status, 200);
  assert.match(await res.text(), /randomizerMessages/);
  assert.equal((await fetch(`${baseUrl}/`)).headers.get("x-powered-by"), null);
});
