import { HOME_CHANNEL } from "../config/channels.js";
import { EVENTS } from "./events.js";
import { overlayRoom, randomizerRoom, toJoinedChannel } from "./rooms.js";
import { getPmdPreferencesForChannel } from "../services/pmdChatPreferences.js";
import { getPortraitUserDataForChannel } from "../services/portrait.js";
import { isValidAdminToken } from "../services/adminAuth.js";
import { randomizeForPlayer } from "../services/randomizer.js";
import { DEFAULT_GAME, findGame } from "../../shared/randomizerGames.js";

const HEX_COLOR = /^#?([0-9a-f]{3}){1,2}$/i;
const MAX_TEXT_LENGTH = 500;
const ADMIN_DEFAULT_CHANNEL = HOME_CHANNEL;

function isShortString(value, max = MAX_TEXT_LENGTH) {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

/**
 * Socket clients are overlays (read-only listeners) and the admin panel.
 * Overlays join their channel's room and only receive that channel's events.
 * Anything that changes what's on stream requires the admin token in the handshake.
 * The bot never says anything a socket client sent it.
 */
export function setupSocketHandlers(io) {
  io.on("connection", (socket) => {
    const isAdmin = isValidAdminToken(socket.handshake.auth?.token);
    console.log(`A user connected${isAdmin ? " (admin)" : ""}`);
    // Tell the admin panel whether its token worked (overlays send no token and get nothing)
    if (socket.handshake.auth?.token) {
      socket.emit(EVENTS.ADMIN_STATUS, isAdmin);
    }
    socket.on("disconnect", () => {
      console.log("A user disconnected");
    });

    socket.on(EVENTS.OVERLAY_CONNECT, (channel) => {
      const joinedChannel = toJoinedChannel(channel);
      if (!joinedChannel) {
        console.warn(`Overlay tried to join unknown channel: ${JSON.stringify(channel)}`);
        return;
      }
      socket.join(overlayRoom(joinedChannel));
    });

    socket.on(EVENTS.RANDOMIZER_CONNECT, (channel) => {
      const joinedChannel = toJoinedChannel(channel);
      if (!joinedChannel) return;

      socket.join(overlayRoom(joinedChannel));
      socket.join(randomizerRoom(joinedChannel));
    });

    socket.on(EVENTS.PMD_CONFIG_REQUEST, async (channel) => {
      if (!isShortString(channel, 26)) {
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

    if (!isAdmin) return;

    // Admin panel test triggers: each takes an optional channel as its last argument
    const adminRoom = (channel) => {
      const joinedChannel = toJoinedChannel(channel ?? ADMIN_DEFAULT_CHANNEL);
      return joinedChannel && io.to(overlayRoom(joinedChannel));
    };

    socket.on(EVENTS.SPRITE_NUMBER, (number, channel) => {
      const room = adminRoom(channel);
      if (!room || !Number.isInteger(Number(number))) return;
      room.emit(EVENTS.SPRITE_NUMBER, String(number));
    });

    socket.on(EVENTS.COLOR, (color, channel) => {
      const room = adminRoom(channel);
      if (!room || !isShortString(color, 7) || !HEX_COLOR.test(color)) return;
      room.emit(EVENTS.COLOR, color.replace(/^#/, ""));
    });

    socket.on(EVENTS.PATTERN, (number, channel) => {
      const room = adminRoom(channel);
      const parsed = parseInt(number, 10);
      if (!room || !Number.isInteger(parsed)) return;
      room.emit(EVENTS.PATTERN, parsed);
    });

    socket.on(EVENTS.RAIN, (channel) => {
      const room = adminRoom(channel);
      if (room) room.emit(EVENTS.RAIN);
    });

    socket.on(EVENTS.RANDOMIZE, async (username, channel, game) => {
      const joinedChannel = toJoinedChannel(channel ?? ADMIN_DEFAULT_CHANNEL);
      if (!isShortString(username, 25) || !joinedChannel) return;
      const gameId = typeof game === "string" ? findGame(game) : DEFAULT_GAME;
      if (!gameId) return;
      try {
        // Test roll: shows on the overlay but stays out of chat
        await randomizeForPlayer({ io, channel: joinedChannel, player: username, game: gameId, announce: false });
      } catch (err) {
        console.error("Admin randomize failed:", err);
      }
    });

    socket.on(EVENTS.PMD_PORTRAIT, async (username, message, channel) => {
      const joinedChannel = toJoinedChannel(channel ?? ADMIN_DEFAULT_CHANNEL);
      if (!isShortString(username, 25) || !isShortString(message) || !joinedChannel) return;
      try {
        const userBase = await getPortraitUserDataForChannel(joinedChannel);
        io.to(overlayRoom(joinedChannel)).emit(
          EVENTS.PMD_PORTRAIT,
          username,
          message,
          userBase,
          { color: "#494981" },
          joinedChannel
        );
      } catch (err) {
        console.error("Admin PMD portrait failed:", err);
      }
    });
  });
}
