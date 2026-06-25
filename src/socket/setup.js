import { EVENTS } from "./events.js";
import { getPmdPreferencesForChannel } from "../services/pmdChatPreferences.js";
import { handleRandomizerConnect } from "../services/uniteRoster/connectSync.js";

export function setupSocketHandlers(io, client) {
  io.on("connection", (socket) => {
    console.log("A user connected");
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });

    socket.on(EVENTS.SPRITE_NUMBER, (number) => {
      io.emit(EVENTS.SPRITE_NUMBER, number);
    });

    socket.on(EVENTS.RANDOMIZE, (username, target) => {
      io.emit(EVENTS.RANDOMIZE, username, target);
    });

    socket.on(EVENTS.RANDOMIZER_CONNECT, async (channel) => {
      try {
        const result = await handleRandomizerConnect(channel);
        if (!result.skipped && result.added?.length) {
          console.log(
            `Unite roster sync added ${result.added.length} pokemon: ${result.added.join(", ")}`
          );
          io.emit(EVENTS.UNITE_ROSTER_UPDATED);
        }
      } catch (err) {
        console.error("Randomizer connect sync failed:", err);
      }
    });

    socket.on(EVENTS.PMD_PORTRAIT, (username, message) => {
      io.emit(EVENTS.PMD_PORTRAIT, username, message);
    });

    socket.on(EVENTS.PMD_CONFIG_REQUEST, async (channel) => {
      if (!channel) {
        socket.emit(EVENTS.PMD_CONFIG, "", {});
        return;
      }

      const target = channel.startsWith("#") ? channel : `#${channel}`;
      const channelName = target.slice(1).toLowerCase();
      try {
        const prefs = await getPmdPreferencesForChannel(target.toLowerCase());
        socket.emit(EVENTS.PMD_CONFIG, channelName, prefs);
      } catch (err) {
        console.error("Failed to load PMD chat preferences:", err);
        socket.emit(EVENTS.PMD_CONFIG, "", {});
      }
    });

    socket.on(EVENTS.RANDOMIZED, (channel, message) => {
      client.say(channel, message);
    });
  });
}
