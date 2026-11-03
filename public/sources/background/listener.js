import { changeBackgroundColor, changeBackgroundSprite } from "./background.js";
import { getOverlayChannel, joinOverlayChannel } from "../../utils/overlayChannel.js";

let socket = io();
joinOverlayChannel(socket, getOverlayChannel());

socket.on('color', (color, target = '') => {
    changeBackgroundColor(color, target);
});

socket.on('pattern', (number, target = '') =>{
    changeBackgroundSprite(number, target);
});
