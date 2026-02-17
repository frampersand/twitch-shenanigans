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
