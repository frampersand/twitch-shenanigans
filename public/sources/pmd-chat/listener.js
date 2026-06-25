import { generatePortrait } from "./index.js";
import { startMockChat } from "./mock.js";
import { applyChannelSettings } from "./layout.js";

const urlParams = new URLSearchParams(window.location.search);
const channelNameSource = urlParams.get("channel");

let socket = io();
let mockStarted = false;

const PMD_CONFIG_REQUEST_EVENT = "pmd-config-request";
const PMD_CONFIG_EVENT = "pmd-config";

function isActiveChannel(channelName) {
    return Boolean(channelNameSource) && channelName === channelNameSource;
}

function tryStartMock() {
    if (!urlParams.has("mock") || mockStarted || !channelNameSource) return;
    mockStarted = true;
    startMockChat(urlParams, channelNameSource);
}

socket.on("pmd-portrait", (username, message, userBase, context, target) => {
    const channelName = target ? target.slice(1) : "";
    if (isActiveChannel(channelName)) {
        generatePortrait(message, username, userBase, context);
    }
});

socket.on(PMD_CONFIG_EVENT, (channel, settings) => {
    if (channelNameSource && channel === channelNameSource.toLowerCase()) {
        applyChannelSettings(settings || {});
        tryStartMock();
    }
});

applyChannelSettings();

if (!channelNameSource) {
    console.warn("[pmd-chat] missing ?channel= URL param — source will not render messages or load config");
} else {
    socket.emit(PMD_CONFIG_REQUEST_EVENT, channelNameSource);
}
