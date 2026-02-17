import { config } from "../config/index.js";

const issuedCommands = {};
const issuedWarnings = {};
const { cooldownMinutes } = config;

export function isOffCooldown(username, command) {
  if (!issuedCommands[username]) {
    issuedCommands[username] = {};
  }

  const now = new Date();
  const lastUsed = issuedCommands[username][command];

  if (!lastUsed || (now - lastUsed) / 60000 >= cooldownMinutes) {
    issuedCommands[username][command] = now;
    resetWarning(username, command);
    return true;
  }

  return false;
}

export function checkWarning(username, command) {
  return Object.hasOwn(issuedWarnings, `${username}_${command}`);
}

export function setWarning(username, command) {
  issuedWarnings[`${username}_${command}`] = true;
}

function resetWarning(username, command) {
  delete issuedWarnings[`${username}_${command}`];
}
