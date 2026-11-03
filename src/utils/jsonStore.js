import { promises as fs } from "fs";
import path from "path";

/** Tail of the pending-operation chain for each file path */
const locks = new Map();

/** Run fn with exclusive access to filePath (within this process) */
function withFileLock(filePath, fn) {
  const previous = locks.get(filePath) || Promise.resolve();
  const run = previous.then(fn, fn);
  const tail = run.catch(() => {});
  locks.set(filePath, tail);
  tail.then(() => {
    if (locks.get(filePath) === tail) locks.delete(filePath);
  });
  return run;
}

async function readJsonUnlocked(filePath, fallback) {
  try {
    const contents = await fs.readFile(filePath, "utf-8");
    return JSON.parse(contents);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

/** Write to a temp file then rename, so a crash mid-write never leaves a truncated file */
async function writeJsonUnlocked(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.${process.pid}.tmp`;
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2));
  await fs.rename(tmpPath, filePath);
}

export function readJson(filePath, fallback) {
  return withFileLock(filePath, () => readJsonUnlocked(filePath, fallback));
}

export function writeJson(filePath, data) {
  return withFileLock(filePath, () => writeJsonUnlocked(filePath, data));
}

/**
 * Read-modify-write under the file's lock. updater receives the current data
 * (or fallback) and returns the data to save.
 */
export function updateJson(filePath, fallback, updater) {
  return withFileLock(filePath, async () => {
    const current = await readJsonUnlocked(filePath, fallback);
    const next = await updater(current);
    await writeJsonUnlocked(filePath, next);
    return next;
  });
}
