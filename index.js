import { config } from "./src/config/index.js";
import { createApp } from "./src/app.js";
import { createTwitchClient } from "./src/twitch/client.js";
import { listenForRedemptions } from "./src/twitch/redemptions.js";
import { syncSubscriptions } from "./src/services/eventSub.js";

/** How long a shutdown may take before we exit anyway (Docker kills us at 10s) */
const SHUTDOWN_TIMEOUT_MS = 5000;

const { server, io } = createApp();
const twitch = createTwitchClient(io);
listenForRedemptions({ client: twitch, io });

// Re-check EventSub subscriptions for connected channels (recreates broken ones)
syncSubscriptions().catch((err) => console.error("EventSub sync failed:", err.message));

// Last line of defence: a stray rejected promise shouldn't take the bot offline mid-stream
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

/**
 * As the container's PID 1, Node ignores SIGTERM unless it handles it, so `docker stop`
 * would wait the full 10s and then SIGKILL. Close connections and exit instead.
 */
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(0), SHUTDOWN_TIMEOUT_MS).unref();
  twitch.disconnect().catch(() => {});
  // Closes every socket and the HTTP server; exits once both are done
  io.close(() => process.exit(0));
}
process.once("SIGTERM", shutdown);
process.once("SIGINT", shutdown);

// Start server
const port = config.port;
server.listen(port, () => {
  console.log("Server listening on port " + port);
});
