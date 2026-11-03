import { mkdtemp } from "fs/promises";
import { createServer } from "http";
import { tmpdir } from "os";
import path from "path";

export const ADMIN_TOKEN = "test-admin-token";

export const FIXTURE_PORTRAITS = {
  "0001": ["Happy", "Normal"],
  "0025": ["Happy", "Happy^"],
};

/** Stand-in for the sprite CDN: serves only the PMD manifest */
async function startFakeCdn() {
  const server = createServer((req, res) => {
    if (req.url !== "/pmd/manifest.json") {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ portraits: FIXTURE_PORTRAITS }));
  });
  await new Promise((resolve) => server.listen(0, resolve));
  server.unref();
  return `http://localhost:${server.address().port}`;
}

/**
 * Point the app at a fresh temp data folder and a fake CDN. Must run before any src/
 * module is imported, because config reads DATA_DIR, CDN_BASE_URL and ADMIN_TOKEN at import time.
 */
export async function useTempDataDir() {
  const dir = await mkdtemp(path.join(tmpdir(), "tw-shenanigans-test-"));
  process.env.DATA_DIR = dir;
  process.env.CDN_BASE_URL = await startFakeCdn();
  process.env.ADMIN_TOKEN = ADMIN_TOKEN;
  return dir;
}

/** Records what the bot says; optionally fails every send like a disconnected client */
export function createFakeClient({ fail = false } = {}) {
  const said = [];
  return {
    said,
    say: async (channel, message) => {
      if (fail) throw "Not connected to server.";
      said.push([channel, message]);
    },
  };
}

/** Records emits per room; `overlays` controls what fetchSockets reports */
export function createFakeIo({ overlays = 1 } = {}) {
  const emitted = [];
  return {
    emitted,
    emit: (...args) => emitted.push(["*", ...args]),
    to: (room) => ({ emit: (...args) => emitted.push([room, ...args]) }),
    in: () => ({ fetchSockets: async () => Array.from({ length: overlays }, () => ({})) }),
  };
}

export function chatContext(login, displayName = login, extra = {}) {
  return { username: login, "display-name": displayName, badges: {}, ...extra };
}
