import { fetchGame8RosterData } from "./game8.js";
import { cachePokemonImage } from "./images.js";
import { normalizePokemonName, nameToPokemonDbSlug } from "./slug.js";
import {
  getUniteRoster,
  saveUniteRoster,
  getUniteRosterMeta,
  saveUniteRosterMeta,
} from "./storage.js";

function buildRosterIndex(roster) {
  const byName = new Map();
  for (const entry of roster) {
    byName.set(normalizePokemonName(entry.name), entry);
  }
  return byName;
}

export async function syncUniteRosterFromGame8() {
  const [currentRoster, meta, game8Entries] = await Promise.all([
    getUniteRoster(),
    getUniteRosterMeta(),
    fetchGame8RosterData(),
  ]);

  const rosterByName = buildRosterIndex(currentRoster);
  const added = [];

  for (const game8Entry of game8Entries) {
    const normalizedName = normalizePokemonName(game8Entry.name);
    if (rosterByName.has(normalizedName)) continue;

    const slug = nameToPokemonDbSlug(game8Entry.name);
    const imageResult = await cachePokemonImage(game8Entry.name, slug);
    const entry = {
      id: imageResult.slug,
      name: game8Entry.name,
      role: game8Entry.role,
      image: imageResult.image,
    };

    currentRoster.push(entry);
    rosterByName.set(normalizedName, entry);
    added.push(entry.name);
  }

  const sortedRoster = [...currentRoster].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  for (const entry of sortedRoster) {
    const imageResult = await cachePokemonImage(entry.name, entry.id);
    entry.id = imageResult.slug;
    entry.image = imageResult.image;
  }

  await saveUniteRoster(sortedRoster);

  const nextMeta = {
    ...meta,
    lastSync: new Date().toISOString(),
    lastSource: "game8",
    lastAdded: added,
  };
  await saveUniteRosterMeta(nextMeta);

  return {
    added,
    total: sortedRoster.length,
    lastSync: nextMeta.lastSync,
  };
}
