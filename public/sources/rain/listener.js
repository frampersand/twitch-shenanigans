import activateRain from "./index.js";

let socket = io();
socket.on('rain', (target = '') => {
    activateRain(target);
})