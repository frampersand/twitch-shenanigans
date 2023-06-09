import { changeBackgroundColor, changeBackgroundSprite } from "./background.js";

let socket = io();
socket.on('color', (color, target = '') => {
    changeBackgroundColor(color, target);
});

socket.on('pattern', (number, target = '') =>{
    changeBackgroundSprite(number, target);    
});
