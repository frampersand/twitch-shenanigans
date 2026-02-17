import path from "path";
import { promises as fs } from "fs";
import { config } from "../config/index.js";

const { portraitUserbasePath, portraitsFolder } = config;

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function getPortraitUserData() {
  try {
    const contents = await fs.readFile(portraitUserbasePath, "utf-8");
    return JSON.parse(contents);
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }
}

export async function getPortraitUserDataForChannel(channel) {
  const data = await getPortraitUserData();
  return data.filter((user) => user.channel === channel);
}

export async function updatePortraitUser({ username, portrait, variant, target }) {
  let data = [];

  try {
    const contents = await fs.readFile(portraitUserbasePath, "utf-8");
    data = JSON.parse(contents);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }

  const newUserData = {
    username,
    portrait: portrait || "",
    variant: variant || "",
    channel: target,
  };

  const existingIndex = data.findIndex(
    (user) => user.username === username && user.channel === target
  );

  if (existingIndex !== -1) {
    data[existingIndex] = { ...data[existingIndex], ...newUserData };
  } else {
    data.push(newUserData);
  }

  await fs.writeFile(portraitUserbasePath, JSON.stringify(data, null, 2));
  return newUserData;
}

/** Get a portrait file path (folder/variant.png) for API response */
export async function getPortraitFile(portraitNumber = 0, variant = "") {
  let folder;
  if (!portraitNumber) {
    const entries = await fs.readdir(portraitsFolder, { withFileTypes: true });
    const folders = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
    if (folders.length === 0) {
      throw new Error("No subfolders found.");
    }
    folder = getRandomItem(folders);
  } else {
    folder = String(portraitNumber).padStart(4, "0");
  }

  const folderPath = path.join(portraitsFolder, folder);
  const files = await fs.readdir(folderPath);
  const pngFiles = files.filter(
    (file) => path.extname(file).toLowerCase() === ".png"
  );

  if (pngFiles.length === 0) {
    throw new Error(`No .png files in folder: ${folder}`);
  }

  let selectedVariant;
  const variantMatch = variant && pngFiles.find(
    (v) => v.toLowerCase() === `${variant.toLowerCase()}.png`
  );
  selectedVariant = variantMatch || getRandomItem(pngFiles);

  return path.join(folder, selectedVariant);
}
