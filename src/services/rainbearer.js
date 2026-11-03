import { config } from "../config/index.js";
import { readJson, updateJson } from "../utils/jsonStore.js";

const { rainbearerPath } = config;

/** Current Rainbearer per channel ({ "#channel": "DisplayName" }), persisted across restarts */
export async function getRainbearer(channel) {
  const data = await readJson(rainbearerPath, {});
  return data[channel] || null;
}

export async function setRainbearer(channel, username) {
  await updateJson(rainbearerPath, {}, (data) => ({ ...data, [channel]: username }));
}
