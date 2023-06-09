import borderSpriteGenerator from "../sources/sprites/index.js";
import { changeBackgroundColor, changeBackgroundSprite } from "../sources/background/background.js";
import createRandomizedCard from "../sources/randomizer/randomizer.js";
import activateRain from "../sources/rain/index.js";

var socket = io();

document.getElementById("sprite-btn").addEventListener("click", function () {
  const numberTextbox = document.getElementById("sprite");
  const number = numberTextbox.value
    ? numberTextbox.value
    : Math.floor(Math.random() * (800 - 0 + 1) + 0);
    const spriteBox = document.querySelector('.sprite-border-showcase');
    console.log('spriteBox: ', spriteBox);
    borderSpriteGenerator(number, spriteBox);
});

document.getElementById("color-btn").addEventListener("click", function () {
  const numberTextbox = document.getElementById("color");
  const number = numberTextbox.value;
  const backgroundBox = document.querySelector('.background-showcase');
  changeBackgroundColor(number, backgroundBox);
});

document.getElementById("pattern-btn").addEventListener("click", function () {
  const numberTextbox = document.getElementById("pattern");
  const number = numberTextbox.value;
  const backgroundBox = document.querySelector('.background-sprite-showcase');
  changeBackgroundSprite(number, backgroundBox);
});

document.getElementById("randomize-btn").addEventListener("click", function () {
    const randomizerBox = document.querySelector('.randomizer-showcase');
    console.log('randomizerBox: ', randomizerBox);
    createRandomizedCard('Frampersand', 'showcase', randomizerBox, socket);
});

document.getElementById("rain-btn").addEventListener("click", function () {
    const rainBox = document.querySelector('.rain-showcase');
    activateRain();
});
