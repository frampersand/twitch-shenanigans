import tmi from "tmi.js";
import { config } from "../config/index.js";
import { channels } from "../../data/channels.js";
import { createMessageHandler } from "./messageHandler.js";
import { setupSocketHandlers } from "../socket/setup.js";
import { pause } from "../utils/helpers.js";

function createTwitchClient(io) {
  const opts = {
    identity: {
      username: config.twitch.username,
      password: config.twitch.password,
    },
    channels,
  };

  const client = new tmi.client(opts);
  const messageHandler = createMessageHandler({ client, io });

  client.on("message", messageHandler);
  client.on("connected", (addr, port) => {
    console.log(`* Connected to ${addr}:${port}`);
  });
  client.on("raided", async (channel, username, viewers) => {
    client.say(
      channel,
      `OI! ${username} with the RAAAAID!! welcome to you and your ${viewers} viewers!`
    );
    await pause(1500);
    client.say(channel, `!so ${username}`);
  });

  client.connect();
  return client;
}

export { createTwitchClient };
