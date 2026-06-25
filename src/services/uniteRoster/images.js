import { promises as fs } from "fs";
import fetch from "node-fetch";
import {
  getLocalImageFile,
  getLocalImagePath,
  ensureUniteAssetsFolder,
} from "./storage.js";
import { getPokemonDbImageUrl, nameToPokemonDbSlug } from "./slug.js";

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(url, destination) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "twitch-shenanigans-unite-sync/1.0",
    },
  });

  if (!response.ok) {
    return false;
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(destination, buffer);
  return true;
}

export async function cachePokemonImage(name, fallbackId = "") {
  await ensureUniteAssetsFolder();

  const slug = nameToPokemonDbSlug(name, fallbackId);
  const destination = getLocalImageFile(slug);

  if (await fileExists(destination)) {
    return { slug, image: getLocalImagePath(slug), cached: false };
  }

  const candidates = [slug];
  const genericSlug = nameToPokemonDbSlug(name);
  if (!candidates.includes(genericSlug)) {
    candidates.push(genericSlug);
  }
  if (fallbackId && !candidates.includes(fallbackId)) {
    candidates.push(fallbackId);
  }

  for (const candidate of candidates) {
    const url = getPokemonDbImageUrl(candidate);
    const candidateDestination = getLocalImageFile(candidate);
    const saved = await downloadImage(url, candidateDestination);
    if (saved) {
      return { slug: candidate, image: getLocalImagePath(candidate), cached: true };
    }
  }

  return { slug, image: getLocalImagePath(slug), cached: false, missing: true };
}
