import createRandomizedCard from "./randomizer.js";
import { loadUniteRoster } from "../../utils/loadUniteRoster.js";

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const channelNameSource = urlParams.get("channel");

if (channelNameSource) {
    // Re-register on every (re)connect so the server keeps this overlay in the channel's room
    socket.on("connect", () => {
        socket.emit("randomizer-connect", channelNameSource);
    });
    loadUniteRoster().catch((err) => {
        console.error("Failed to preload unite roster:", err);
    });
}

socket.on("randomize", async (username, channel, pokemonId) => {
    const channelName = typeof channel === "string" ? channel.slice(1).toLowerCase() : "";

    if (channelNameSource && channelName === channelNameSource.toLowerCase()) {
        await createRandomizedCard(username, null, pokemonId);
    } else {
        console.log("Either this comes from another channel, or there is no channel parameter on the URL");
    }
});
