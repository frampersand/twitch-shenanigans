import activateRain from "./index.js";
import { getOverlayChannel, joinOverlayChannel } from "../../utils/overlayChannel.js";

let socket = io();
joinOverlayChannel(socket, getOverlayChannel());

socket.on('rain', (target = '') => {
    activateRain(target);
})
