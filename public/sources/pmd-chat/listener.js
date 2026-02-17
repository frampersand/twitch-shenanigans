import { generatePortrait } from "./index.js";

let socket = io();
socket.on('pmd-portrait', (username, message, userBase, context, target) => {
    const channelName = target ? target.slice(1) : '';
    var urlParams = new URLSearchParams(window.location.search);
    var channelNameSource = urlParams.get('channel');
    if (channelName === channelNameSource && channelNameSource !== undefined) {
        generatePortrait(message, username, userBase, context)
    }
})