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
import fs, { promises } from "fs";
import * as dotenv from "dotenv";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const io = new Server(server, {});

import {
  randomizerCooldownMessages,
  welcomeMessages,
} from "./public/lists/bot-messages.js";
import { getRandomItem, capitalizeFirstLetter, cleanString, getPortraitUserData } from './public/utils/utils.js';
import { channels } from './data/channels.js';

let rainbearer;
let issuedCommands = {};
let timedChecks = {};
let issuedWarnings = {};
const portraitsFolder = path.join(__dirname, '/public/assets/portrait/');
const COOLDOWN_MINUTES = 3;
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
  const params = cleanString(msg).split(" ");
  const commandName = cleanString(params[0]);
  const firstParam = params[1];

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

  // PMD portraits chat POC
  if (username != 'StreamElements' && commandName !== '!portrait') {
    printPMDChat({username, msg, context, target});
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
        if (["BruvHD", "Frampersand"].includes(username)) {
          io.emit("randomize", username, target);
          console.log("Randomizing on BruvHD channel");
        }
        break;
      }

      if (isOffCooldown(username, commandName) || username === "Frampersand" || isBroadcaster) {
        let player = username;

        if (firstParam) {
          if (firstParam.startsWith("@")) {
            player = firstParam.slice(1);
          } else {
            client.say(
              target,
              `I'm sorry to say, but that's not a valid user. If you want to use this command for someone else, give me their username properly (prefix it with @, please)`
            );
            return;
          }
        }

        console.log("Randomizing on:", target);
        io.emit("randomize", player, target);
      } else {
        if (!checkWarning(username, commandName)) {
          if (target === "#frampersand") {
            const cooldownMsg = randomizerCooldownMessages(username);
            client.say(target, cooldownMsg);
          } else {
            client.say(target, `I'll kindly ask you to stop spamming please @${username}`);
          }
          setWarning(username, commandName);
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

    case '!portrait':
      if (isOffCooldown(username, commandName) || username === "Frampersand" || isBroadcaster) {
        const portraitName = cleanString(params[1]);
        const variant = cleanString(params[2]);

        if (!portraitName) {
          break;
        }

        try {
          const updatedUser = updatePortraitHandler({
            username,
            portrait: portraitName,
            variant,
            target
          });

          if (username == 'Frampersand') {
            client.say(target, `Your portrait has been updated successfully @${username}`);

          }
        } catch (err) {
          console.error('Failed to update portrait:', err);
        }
      } else {
        if (!checkWarning(username, commandName)) {
          client.say(target, `I'll kindly ask you to stop spamming please @${username}`);
          setWarning(username, commandName);
        }
      }

      break;
    default:
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

async function printPMDChat({username, msg, context, target}) {
  const portraitUserData = await getPortraitUserData();
  const userDataForChannel = portraitUserData.filter((user) => user.channel === target);
    io.emit("pmd-portrait", username, msg, userDataForChannel, context, target);
}
function checkIfBroadcaster(context) {
  return context.hasOwnProperty("broadcaster") && context["broadcaster"];
}

function pause(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// Handles command spam
const isOffCooldown = (username, command) => {
  if (!issuedCommands[username]) {
    issuedCommands[username] = {};
  }

  const now = new Date();
  const lastUsed = issuedCommands[username][command];

  if (!lastUsed || (now - lastUsed) / 60000 >= COOLDOWN_MINUTES) {
    issuedCommands[username][command] = now;
    resetWarning(username, command);
    return true;
  }

  return false;
};

const resetWarning = (username, command) => {
  delete issuedWarnings[`${username}_${command}`];
};

const checkWarning = (username, command) => {
  return issuedWarnings.hasOwnProperty(`${username}_${command}`);
};

const setWarning = (username, command) => {
  issuedWarnings[`${username}_${command}`] = true;
};
// Handles command spam


const port = process.env.PORT || 3000;
server.listen(port, function () {
  console.log("Server listening on port " + port);
});

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}




async function updatePortraitHandler({ username, portrait, variant, target }) {
  return await updatePortraitUser({
    username,
    portrait,
    variant,
    target
  })
}

async function updatePortraitUser({ username, portrait, variant, target }) {
  const portraitUserbasePath = path.join(__dirname, './data/portraitUserbase.json');

  let data = [];

  try {
    const fileContents = await promises.readFile(portraitUserbasePath, 'utf-8');
    data = JSON.parse(fileContents);
  } catch (readErr) {
    if (readErr.code !== 'ENOENT') throw readErr;
  }

  const existingUserIndex = data.findIndex(user => user.username === username && user.channel === target);

  const newUserData = {
    username,
    portrait: portrait || '',
    variant: variant || '',
    channel: target
  };

  if (existingUserIndex !== -1) {
    data[existingUserIndex] = { ...data[existingUserIndex], ...newUserData };
  } else {
    data.push(newUserData);
  }

  await promises.writeFile(portraitUserbasePath, JSON.stringify(data, null, 2));

  return newUserData;
}


// Endpoints 

app.get('/portrait', (req, res) => {

  const { query } = req;
  const portraitNumber = query && query.portrait || 0;
  const variant = query && query.variant || 0;
  try {
    let folder;
    if (!portraitNumber) {
      const folders = fs.readdirSync(portraitsFolder).filter((item) => {
        const fullPath = path.join(portraitsFolder, item);
        return fs.statSync(fullPath).isDirectory();
      });

      if (folders.length === 0) {
        return res.status(404).json({ error: 'No subfolders found.' });
      }

      folder = getRandomItem(folders);
    } else {
      folder = String(portraitNumber).padStart(4, '0');
    }

    const folderPath = path.join(portraitsFolder, folder);

    const pngFiles = fs.readdirSync(folderPath).filter((file) => {
      const fullPath = path.join(folderPath, file);
      return fs.statSync(fullPath).isFile() && path.extname(file).toLowerCase() === '.png';
    });

    if (pngFiles.length === 0) {
      return res.status(404).json({ error: `No .png files in folder: ${randomFolder}` });
    }

    let selectedVariant;
    if (variant && pngFiles.find((v) => v.toLowerCase() === `${variant.toLowerCase()}.png`)) {

      selectedVariant = `${capitalizeFirstLetter(variant)}.png`;
    } else {
      selectedVariant = getRandomItem(pngFiles);
    }
    const filePath = path.join(folder, selectedVariant);

    res.json({ file: filePath });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/pmd-user-data', (req, res) => {
  const filePath = path.join(__dirname, './data/portraitUserbase.json');

  fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
          console.error('Error reading JSON file:', err);
          return res.status(500).json({ error: 'Failed to read data file' });
      }
      try {
          const jsonData = JSON.parse(data);
          res.json(jsonData);
      } catch (parseError) {
          console.error('Error parsing JSON:', parseError);
          res.json([])
          // res.status(500).json({ error: 'Invalid JSON format' });
      }
  });
});