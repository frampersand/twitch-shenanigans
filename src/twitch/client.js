import tmi from "tmi.js";
import { config } from "../config/index.js";
import { channelEvents, joinedChannels } from "../services/channelRegistry.js";
import { createMessageHandler } from "./messageHandler.js";
import { pause, safeSay } from "../utils/helpers.js";

function createTwitchClient(io) {
  const opts = {
    identity: {
      username: config.twitch.username,
      password: config.twitch.password,
    },
    channels: joinedChannels(),
  };

  const client = new tmi.client(opts);
  const messageHandler = createMessageHandler({ client, io });

  client.on("message", messageHandler);
  client.on("connected", (addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
  });
  client.on("raided", async (channel, username, viewers) => {
    await safeSay(
      client,
      channel,
      `OI! ${username} with the RAAAAID!! welcome to you and your ${viewers} viewers!`
    );
    await pause(1500);
    await safeSay(client, channel, `!so ${username}`);
  });

  // Broadcasters add and remove FramperBot on the dashboard: follow along without a restart
  channelEvents.on("joined", (login) => {
    client.join(`#${login}`).catch((err) => console.error(`[twitch] could not join #${login}:`, err?.message ?? err));
  });
  channelEvents.on("left", (login) => {
    client.part(`#${login}`).catch((err) => console.error(`[twitch] could not leave #${login}:`, err?.message ?? err));
  });

  client.connect().catch((err) => {
    console.error("[twitch] could not connect:", err?.message ?? err);
  });
  return client;
}

export { createTwitchClient };
