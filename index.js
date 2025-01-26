// Framperbot stuff
import tmi from "tmi.js";
// Framperbot stuff

// Express and Socket stuff
import express from "express";
import http from "http";
import { Server } from "socket.io";
import { fileURLToPath } from "url";
// Express and Socket stuff

// Initializing stuff
const app = express();
const server = http.createServer(app);
import path from "path";
import fs from "fs";
import * as dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const io = new Server(server, {});

import {
  randomizerCooldownMessages,
  welcomeMessages,
} from "./public/lists/bot-messages.js";
import { getRandomItem } from './public/utils/utils.js';
import { channels } from './data/channels.js';

let rainbearer;
let issuedCommands = {};
let timedChecks = {};
let issuedWarnings = {};
const portraitsFolder = path.join(__dirname, '/public/assets/portrait/');
// Initializing stuff

// Config options //
const opts = {
  identity: {
    username: dotenv.config().parsed.BOT_USERNAME,
    password: dotenv.config().parsed.BOT_AUTH,
  },
  channels
};

const uniteNames = {
  "#frampersand": "FrampsandTTV",
  "#joesbeard": "TTVjoesbeard",
};
const nicknames = {
  "#frampersand": "Framps",
  "#joesbeard": "Mr. Beard",
  "#azurequality": "Qualts",
  "#bruvhd": "Bruv",
};
// Config options //

const client = new tmi.client(opts);
client.on("message", onMessageHandler);
client.on("connected", onConnectedHandler);
client.on("raided", onRaidedHandler);
client.connect();

app.use("/", express.static(__dirname + "/public"));

io.on("connection", function (socket) {
  console.log("A user connected");
  socket.on("disconnect", function () {
    console.log("A user disconnected");
  });

  socket.on('sprite-number', (number) => {
    io.emit("sprite-number", number);
  });

  socket.on('randomize', (username, target) => {
    io.emit("randomize", username, target);
  });

  socket.on('pmd-portrait', (username, message) => {
    io.emit("pmd-portrait", username, message);
  })

  socket.on("randomized", (channel, message) => {
    client.say(channel, message);
  });
});

function onMessageHandler(target, context, msg, self) {
  if (self) {
    return;
  }

  const isBroadcaster = context && context.badges && context.badges.broadcaster;
  const username = context["display-name"];
  const splitMsg = msg.trim().split(" ");
  const commandName = splitMsg[0].trim();
  const firstParam = splitMsg[1];

  // Pokemon on screen
  if (
    context["custom-reward-id"] &&
    context["custom-reward-id"] == "20d21396-03d9-425f-85ce-dd265e45e85d"
  ) {
    io.emit("sprite-number", commandName);
  }

  // Reroll randomizer
  if (
    context["custom-reward-id"] &&
    context["custom-reward-id"] == "767b3ef9-b89d-4453-9072-fea3a6105c1f"
  ) {
    io.emit("randomize", username, target);
  }

  // Rain
  if (
    context["custom-reward-id"] &&
    context["custom-reward-id"] == "ac905be3-894a-4d0b-9af4-caaaeac41394"
  ) {
    rainbearer = username;
    io.emit("rain");
    client.say(
      target,
      `Hear! hear! and rejoice! ${rainbearer} has just summoned the rain! And shall be known from now on as The Rainbearer! Summoner of Storms! Harbinger of the chill vibes!`
    );
  }

  // Background color reward
  if (
    context["custom-reward-id"] &&
    context["custom-reward-id"] == "53ec69a2-37db-4d20-ab16-7bf557756d4a"
  ) {
    let color = commandName[0] === "#" ? commandName.substring(1) : commandName;
    const regex = /^([0-9a-f]{3}){1,2}$/i;
    if (regex.exec(color)) {
      io.emit("color", color);
    } else {
      client.say(
        target,
        `I'm sorry :( That's not a valid hex color, use https://colorpicker.me/ copy the hex color, and then try again in a bit`
      );
    }
  }

  // Background sprites reward
  if (
    context["custom-reward-id"] &&
    context["custom-reward-id"] == "7517c0c1-2a2b-478a-ae47-0bd3830a09ae"
  ) {
    const number = parseInt(commandName);
    if (Number.isInteger(number)) {
      io.emit("pattern", number);
    } else {
      client.say(
        target,
        `I'm sorry but I'll need the number of the pokedex :( Look it up over here -> https://www.pokemon.com/us/pokedex and try again in a bit, please <3`
      );
    }
  }

  if (context["first-msg"]) {
    if (target === "#frampersand") {
      const welcomeMessage = welcomeMessages(username);
      client.say(target, welcomeMessage);
    }
  }

  switch (commandName) {


    case "!rainbearer":
      if (target == "#frampersand") {
        if (!rainbearer) {
          client.say(target, `There's currently not a rainbearer yet`);
        } else {
          client.say(
            target,
            `The current Rainbearer is ${rainbearer}, pay your respects if you may, for they brought the downpour sounds for our enjoyment!`
          );
        }
      }
      break;

    case "!dealwithit":
      if (target === "#bruvhd") {
        if (username === "BruvHD" || username === "Frampersand") {
          io.emit("randomize", username, target);
          console.log("Randomizing on BruvHD channel");
        }
      } else {
        if (
          isOffCooldown(username) ||
          username === "Frampersand" ||
          isBroadcaster
        ) {
          let player;
          if (firstParam) {
            if (firstParam[0] === "@") {
              player = firstParam.slice(1);
            } else {
              client.say(
                target,
                `I'm sorry to say, but that's not a valid user. If you want to roll for someone else, give me their username properly (prefix it with @, please)`
              );
              break;
            }
          } else {
            player = username;
          }
          console.log("Randomizing on: ", target);
          io.emit("randomize", player, target);
        } else {
          if (!checkWarning(username)) {
            if (target === "#frampersand" || target === "#frampscodes") {
              const randomCooldownMessage =
                randomizerCooldownMessages(username);
              client.say(target, randomCooldownMessage);
            } else {
              client.say(
                target,
                `I'll kindly ask you to stop spamming please @${username}`
              );
            }
            issuedWarnings[username] = true;
          }
        }
      }

      break;

    case "!guesswhosback":
      if (username === "Frampersand" || username === "FrampsCodes") {
        guessWhosBack(target);
      } else {
        client.say(target, `Certainly not Frampersand, that's for sure`);
      }
      break;

    default:
      if (Math.random() < 0.1) {
        io.emit("pmd-portrait", username, msg);
      }
      console.log(`[${target}] ${username}: ${msg}`);
  }
}

async function guessWhosBack(target) {
  client.say(target, `Guess who's back catJAM`);
  await pause(2000);
  client.say(target, `Back again catJAM`);
  await pause(2000);
  client.say(target, `Framps is back catJAM`);
  await pause(2000);
  client.say(target, `Tell a friend catJAM`);
}

async function onRaidedHandler(channel, username, viewers) {
  client.say(
    channel,
    `OI! ${username} with the RAAAAID!! welcome to you and your ${viewers} viewers!`
  );
  await pause(1500);
  client.say(channel, `!so ${username}`);
}

function checkIfBroadcaster(context) {
  return context.hasOwnProperty("broadcaster") && context["broadcaster"];
}

function pause(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

const isOffCooldown = (username) => {
  if (issuedCommands.hasOwnProperty(username)) {
    const difference = new Date() - issuedCommands[username];
    issuedCommands[username] = new Date();
    if (difference / 60000 >= 3) {
      resetWarning(username);
      return true;
    }
    return false;
  } else {
    issuedCommands[username] = new Date();
    return true;
  }
};

const resetWarning = (username) => {
  delete issuedWarnings[username];
};

const checkWarning = (username) => {
  return issuedWarnings.hasOwnProperty(username);
};

const port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log("Server listening on port " + port);
});

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}


// Endpoints 

app.get('/random-portrait', (req, res) => {
  try {
    const folders = fs.readdirSync(portraitsFolder).filter((item) => {
      const fullPath = path.join(portraitsFolder, item);
      return fs.statSync(fullPath).isDirectory();
    });

    if (folders.length === 0) {
      return res.status(404).json({ error: 'No subfolders found.' });
    }

    const randomFolder = getRandomItem(folders);
    const folderPath = path.join(portraitsFolder, randomFolder);

    const pngFiles = fs.readdirSync(folderPath).filter((file) => {
      const fullPath = path.join(folderPath, file);
      return fs.statSync(fullPath).isFile() && path.extname(file).toLowerCase() === '.png';
    });

    if (pngFiles.length === 0) {
      return res.status(404).json({ error: `No .png files in folder: ${randomFolder}` });
    }

    const randomPng = getRandomItem(pngFiles);
    const filePath = path.join(randomFolder, randomPng);

    res.json({ file: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});