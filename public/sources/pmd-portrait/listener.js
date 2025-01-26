import { generatePortrait } from "./index.js";

let socket = io();
socket.on('pmd-portrait', (username, message) => {
    generatePortrait(message, username)
})