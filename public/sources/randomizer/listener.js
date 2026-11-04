import createRandomizedCard from "./randomizer.js";
import { createDesignCard, DESIGNS } from "./designs.js";
import { loadRoster } from "../../utils/loadRoster.js";
import { DEFAULT_CARD_STYLE, DEFAULT_GAME } from "/shared/randomizerGames.js";
import { anchorAt, numberParam } from "../../utils/viewParams.js";

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const channelNameSource = urlParams.get("channel");

// ?x=&y= centers the cards on that point (page px) and ?scale= sizes them, so the source can
// stay 1920x1080 at scale 1 in OBS. Without them, cards are centered at their normal size.
{
    const x = numberParam("x");
    const y = numberParam("y");
    const scale = numberParam("scale", { min: 0.25, max: 4 }) ?? 1;
    const container = document.getElementById("container");
    if (x !== null && y !== null) anchorAt(container, { x, y, scale });
    else if (scale !== 1) anchorAt(container, { x: window.innerWidth / 2, y: window.innerHeight / 2, scale });
}

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
