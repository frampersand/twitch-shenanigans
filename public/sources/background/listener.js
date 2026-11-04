import { changeBackgroundColor, changeBackgroundSprite } from "./background.js";
import { getOverlayChannel, joinOverlayChannel } from "../../utils/overlayChannel.js";
import { numberParam, scaleToFill } from "../../utils/viewParams.js";

// ?scale= enlarges the Pokémon pattern (1.5 at 1920x1080 matches the old 1280x720 source at 1.5x)
scaleToFill(document.getElementById("pattern-container"), numberParam("scale", { min: 0.25, max: 4 }));

let socket = io();
joinOverlayChannel(socket, getOverlayChannel());

// ?color=off: only the Pokémon pattern, on a transparent page, to sit above the Background source
// (which takes the color and repaints its animated scene with it)
const paintsColor = new URLSearchParams(location.search).get("color") !== "off";

socket.on('color', (color, target = '') => {
    if (paintsColor) changeBackgroundColor(color, target);
});

socket.on('pattern', (number, target = '') =>{
    changeBackgroundSprite(number, target);
});
