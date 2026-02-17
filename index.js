import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

import { config } from "./src/config/index.js";
import portraitRoutes from "./src/routes/portrait.js";
import { createTwitchClient } from "./src/twitch/client.js";
import { setupSocketHandlers } from "./src/socket/setup.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {});

// Static files
app.use("/", express.static(path.join(__dirname, "public")));

// API routes
app.use("/", portraitRoutes);

// Twitch client and Socket.IO (client needs io, socket handlers need client for chat)
const client = createTwitchClient(io);
setupSocketHandlers(io, client);

// Start server
const port = config.port;
server.listen(port, () => {
  console.log("Server listening on port " + port);
});
