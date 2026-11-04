import createRandomizedCard from "./randomizer.js";
import { createDesignCard, DESIGNS } from "./designs.js";
import { loadRoster } from "../../utils/loadRoster.js";
import { DEFAULT_CARD_STYLE, DEFAULT_GAME } from "/shared/randomizerGames.js";

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const channelNameSource = urlParams.get("channel");

if (channelNameSource) {
    // Re-register on every (re)connect so the server keeps this overlay in the channel's room
    socket.on("connect", () => {
        socket.emit("randomizer-connect", channelNameSource);
    });
    // Other games load on their first roll
    loadRoster(DEFAULT_GAME).catch((err) => {
        console.error("Failed to preload the roster:", err);
    });
}

// The bot sends the card style to draw: the channel's !cardstyle setting, already resolved if "random"
socket.on("randomize", async (username, channel, pickId, game = DEFAULT_GAME, cardStyle = DEFAULT_CARD_STYLE) => {
    const channelName = typeof channel === "string" ? channel.slice(1).toLowerCase() : "";

    if (!channelNameSource || channelName !== channelNameSource.toLowerCase()) {
        console.log("Either this comes from another channel, or there is no channel parameter on the URL");
        return;
    }
    if (Object.hasOwn(DESIGNS, cardStyle)) {
        await createDesignCard({ design: cardStyle, username, pickId, game });
    } else {
        await createRandomizedCard(username, null, pickId, game);
    }
});
