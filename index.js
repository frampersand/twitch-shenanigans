import { config } from "./src/config/index.js";
import { createApp } from "./src/app.js";
import { createTwitchClient } from "./src/twitch/client.js";

const { server, io } = createApp();
createTwitchClient(io);

// Last line of defence: a stray rejected promise shouldn't take the bot offline mid-stream
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

// Start server
const port = config.port;
server.listen(port, () => {
  console.log("Server listening on port " + port);
});
