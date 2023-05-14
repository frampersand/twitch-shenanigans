//Framperbot stuff
const tmi = require('tmi.js');
//Framperbot stuff

// Express and Socket stuff
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
// Express and Socket stuff

// Initializing stuff
const app = express();
const server = http.createServer(app);
const path = require('path');
const env = require('dotenv').config({ path: path.resolve(__dirname, './.env') });
const io = socketIo(server);
let rainbearer;
let issuedCommands = {};
let timedChecks = {};
let issuedWarnings = {};
// Initializing stuff

// Config options //
const opts = {
  identity: {
      username: env.parsed.BOT_USERNAME,
      password: env.parsed.BOT_AUTH,
  },
  channels: [
      'frampersand',
      'joesbeard',
      'frampscodes',
      'azurequality'
  ]
};

const uniteNames = {
  '#frampersand': 'FrampsandTTV',
  '#joesbeard': 'TTVjoesbeard',
}
const nicknames = {
  '#frampersand': 'Framps',
  '#joesbeard': 'Mr. Beard',
  '#azurequality': 'Qualts',
}
// Config options //

const client = new tmi.client(opts);
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.on("raided", onRaidedHandler);
client.connect();

app.use('/', express.static(__dirname + '/public'));

io.on('connection', function(socket){
  console.log('A user connected');
  socket.on('disconnect', function () {
     console.log('A user disconnected');
  });


  socket.on('randomized', (channel, message) => {
    client.say(channel, message);
  })
});

function onMessageHandler(target, context, msg, self) {  
  if (self) {
      return;
  }

  const isBroadcaster = context && context.badges && context.badges.broadcaster;
  const username = context['display-name'];
  const splitMsg = msg.trim().split(' ');
  const commandName = splitMsg[0];
  const firstParam = splitMsg[1];

  // Pokemon on screen
  if (context['custom-reward-id'] && context['custom-reward-id'] == '20d21396-03d9-425f-85ce-dd265e45e85d') {
      io.emit('sprite-number', commandName);
  }

  // Reroll randomizer
  if (context['custom-reward-id'] && context['custom-reward-id'] == '767b3ef9-b89d-4453-9072-fea3a6105c1f') {
      io.emit('randomize', username, target);
  }
  
  // Rain
  if (context['custom-reward-id'] && context['custom-reward-id'] == 'ac905be3-894a-4d0b-9af4-caaaeac41394') {
      rainbearer = username;
      io.emit('rain');
      client.say(target, `Hear! hear! and rejoice! ${rainbearer} has just summoned the rain! And shall be known from now on as The Rainbearer! Summoner of Storms! Harbinger of the chill vibes!`);
  }

  // Background color reward
  if (context['custom-reward-id'] && context['custom-reward-id'] == '53ec69a2-37db-4d20-ab16-7bf557756d4a') {
    let color = commandName[0] == '#' ? commandName.substring(1) : commandName;    
    const regex = /^([0-9a-f]{3}){1,2}$/i;
    if(regex.exec(color)){
      io.emit('color', color);
    } else {
      client.say(target, `I'm sorry :( That's not a valid hex color, use https://colorpicker.me/ copy the hex color, and then try again in a bit`);
    }
  }

  // Background sprites reward
  if (context['custom-reward-id'] && context['custom-reward-id'] == '7517c0c1-2a2b-478a-ae47-0bd3830a09ae') {
    const number = parseInt(commandName);
    if(Number.isInteger(number)){
      io.emit('pattern', number);
    } else {
      client.say(target, `I'm sorry but I'll need the number of the pokedex :( Look it up over here -> https://www.pokemon.com/us/pokedex and try again in a bit, please <3`);
    }
}

  if (context['first-msg']) {
      client.say(target, `Hey ${username}! a big warm welcome to the stream! We hope you enjoy the chill vibes in the chat!`);
  }

  switch (commandName) {
      case '!rainbearer':
          if (target == '#frampersand') {
              if (!rainbearer) {
                  client.say(target, `There's currently not a rainbearer yet`);
              } else {
                  client.say(target, `The current Rainbearer is ${rainbearer}, pay your respects if you may, for they brought the downpour sounds for our enjoyment!`);
              }
          }
          break;

      case '!dealwithit':
          if (isOffCooldown(username) || username === 'Frampersand' || isBroadcaster){
            const user = firstParam ? firstParam : username;
            io.emit('randomize', user, target);
          } else {
            if(!checkWarning(username)){
              if(target === '#frampersand' || target === '#frampscodes'){
                // TODO - Implement randomized messages
                client.say(target, `Redeem the re-roll, @${username} you weenie`);
              } else {
                client.say(target, `I'll kindly ask you to stop spamming please @${username}`);
              }
              issuedWarnings[username] = true;
            }
          }
          
          break;

      case '!guesswhosback':
          if (username === 'Frampersand' || username === 'FrampsCodes') {
              guessWhosBack(target);
          } else {
              client.say(target, `Certainly not Frampersand, that's for sure`);
          }
          break;

      default:
          console.log(`[${target}] ${username}: ${msg}`);
  }
}


async function guessWhosBack(target) {
  client.say(target, `Guess who's back catJAM`);
  await pause(2000)
  client.say(target, `Back again catJAM`);
  await pause(2000)
  client.say(target, `Framps is back catJAM`);
  await pause(2000)
  client.say(target, `Tell a friend catJAM`);
}

async function onRaidedHandler(channel, username, viewers) {
  client.say(channel, `OI! ${username} with the RAAAAID!! welcome to you and your ${viewers} viewers!`);
  await pause(1500)
  client.say(channel, `!so ${username}`);
}

function checkIfBroadcaster(context) {
  return context.hasOwnProperty('broadcaster') && context['broadcaster'];
}

function pause(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const isOffCooldown = (username) => {
  if(issuedCommands.hasOwnProperty(username)){
    const difference = new Date() - issuedCommands[username]
    issuedCommands[username] = new Date();
    if (difference/60000 >= 3) {
      resetWarning(username);
      return true;
    }
    return false;
  } else {
    issuedCommands[username] = new Date();
    return true;
  }
}

const resetWarning = (username) => {
  delete issuedWarnings[username];
}

const checkWarning = (username) => {
  return issuedWarnings.hasOwnProperty(username);
}

const port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log('Server listening on port ' + port);
});

function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
