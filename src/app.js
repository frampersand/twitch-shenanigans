import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";

import { config } from "./config/index.js";
import portraitRoutes from "./routes/portrait.js";
import rosterRoutes from "./routes/rosters.js";
import channelRoutes from "./routes/channels.js";
import authRoutes from "./routes/auth.js";
import eventSubRoutes from "./routes/eventsub.js";
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
  app.use("/", rosterRoutes);
  app.use("/", channelRoutes);
  // Twitch login (dashboard) and EventSub webhooks for channel point redemptions
  app.use("/", authRoutes);
  app.use("/", eventSubRoutes);

  setupSocketHandlers(io);

  return { app, server, io };
}
