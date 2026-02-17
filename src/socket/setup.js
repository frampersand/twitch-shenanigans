import { EVENTS } from "./events.js";

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

    socket.on(EVENTS.PMD_PORTRAIT, (username, message) => {
      io.emit(EVENTS.PMD_PORTRAIT, username, message);
    });

    socket.on(EVENTS.RANDOMIZED, (channel, message) => {
      client.say(channel, message);
    });
  });
}
