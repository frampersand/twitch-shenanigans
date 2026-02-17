import path from "path";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, "../..");

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  cooldownMinutes: 3,
  rootDir,
  portraitsFolder: path.join(rootDir, "public", "assets", "portrait"),
  portraitUserbasePath: path.join(rootDir, "data", "portraitUserbase.json"),
  twitch: {
    username: process.env.BOT_USERNAME,
    password: process.env.BOT_AUTH,
  },
};
