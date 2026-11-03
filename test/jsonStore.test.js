import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { readJson, updateJson, writeJson } from "../src/utils/jsonStore.js";

const dir = await mkdtemp(path.join(tmpdir(), "jsonstore-test-"));

test("readJson returns the fallback for a missing file", async () => {
  assert.deepEqual(await readJson(path.join(dir, "missing.json"), { a: 1 }), { a: 1 });
});

test("readJson throws on a corrupt file instead of silently resetting it", async () => {
  const file = path.join(dir, "corrupt.json");
  await writeFile(file, "{ not json");
  await assert.rejects(readJson(file, {}), SyntaxError);
});

test("concurrent updateJson calls never lose an update", async () => {
  const file = path.join(dir, "counter.json");
  await Promise.all(
    Array.from({ length: 50 }, () => updateJson(file, { n: 0 }, (d) => ({ n: d.n + 1 })))
  );
  assert.equal(JSON.parse(await readFile(file, "utf8")).n, 50);
});

test("writes leave no temp files behind", async () => {
  await writeJson(path.join(dir, "clean.json"), { ok: true });
  const leftovers = (await readdir(dir)).filter((f) => f.endsWith(".tmp"));
  assert.deepEqual(leftovers, []);
});

test("a failing updater doesn't block later writes to the same file", async () => {
  const file = path.join(dir, "recover.json");
  await assert.rejects(updateJson(file, {}, () => { throw new Error("boom"); }));
  await updateJson(file, {}, () => ({ ok: true }));
  assert.deepEqual(await readJson(file, {}), { ok: true });
});
