import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

import { config } from "./config/index.js";
import portraitRoutes from "./routes/portrait.js";
import uniteRosterRoutes from "./routes/uniteRoster.js";
import { setupSocketHandlers } from "./socket/setup.js";

/** Build the HTTP + Socket.IO server without connecting to Twitch or listening (tests use this) */
export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  const server = http.createServer(app);
  const io = new Server(server, {});

  // Static files
  app.use("/", express.static(path.join(config.rootDir, "public")));
  // Modules used by both the server and the overlays (bot messages, pokemon list)
  app.use("/shared", express.static(path.join(config.rootDir, "shared")));

  // API routes
  app.use("/", portraitRoutes);
  app.use("/", uniteRosterRoutes);

  setupSocketHandlers(io);

  return { app, server, io };
}
