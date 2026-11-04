import { config } from "../config/index.js";

const issuedCommands = {};
const issuedWarnings = {};
const { cooldownMinutes } = config;

/** Whether the command is still cooling down, without starting a new cooldown */
export function isCoolingDown(username, command, minutes = cooldownMinutes) {
  const lastUsed = issuedCommands[username]?.[command];
  return Boolean(lastUsed) && (new Date() - lastUsed) / 60000 < minutes;
}

/** Start (or restart) the command's cooldown and clear any spam warning for it */
export function startCooldown(username, command) {
  if (!issuedCommands[username]) {
    issuedCommands[username] = {};
  }
  issuedCommands[username][command] = new Date();
  resetWarning(username, command);
}

/** Check and start in one step: true (and the cooldown starts) when the command may run */
export function isOffCooldown(username, command) {
  if (isCoolingDown(username, command)) return false;
  startCooldown(username, command);
  return true;
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
