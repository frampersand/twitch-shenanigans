import createRandomizedCard from "./randomizer.js";
import { loadUniteRoster, invalidateUniteRosterCache } from "../../utils/loadUniteRoster.js";

const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const channelNameSource = urlParams.get("channel");

if (channelNameSource) {
    socket.emit("randomizer-connect", channelNameSource);
    loadUniteRoster().catch((err) => {
        console.error("Failed to preload unite roster:", err);
    });
}

socket.on("unite-roster-updated", () => {
    invalidateUniteRosterCache();
    loadUniteRoster().catch((err) => {
        console.error("Failed to refresh unite roster:", err);
    });
});

socket.on("randomize", async (username, channel, target = "") => {
    const channelName = channel.slice(1);

    if (channelName === channelNameSource && channelNameSource !== undefined) {
        await createRandomizedCard(username, channel, target, socket);
    } else {
        console.log("Either this comes from another channel, or there is no channel parameter on the URL");
    }
});
