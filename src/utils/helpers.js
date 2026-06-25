export function cleanString(str = "") {
  return str.replaceAll("\u{e0000}", "").trim();
}

export function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function capitalizeFirstLetter(val) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1).toLowerCase();
}

export function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function safeSay(client, channel, message) {
  try {
    await client.say(channel, message);
  } catch (err) {
    console.warn(`[twitch] could not send to ${channel}:`, err?.message ?? err);
  }
}
