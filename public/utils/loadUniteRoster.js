let cachedRoster = null;

export function invalidateUniteRosterCache() {
  cachedRoster = null;
}

export async function loadUniteRoster() {
  if (cachedRoster) return cachedRoster;

  const response = await fetch("/api/unite-roster");
  if (!response.ok) {
    throw new Error("Failed to load unite roster");
  }

  cachedRoster = await response.json();
  return cachedRoster;
}

export function getPokemonImagePath(imageOrEntry) {
  if (typeof imageOrEntry === "object" && imageOrEntry?.image) {
    return imageOrEntry.image;
  }

  if (typeof imageOrEntry === "string" && imageOrEntry.startsWith("/")) {
    return imageOrEntry;
  }

  return `/unite-assets/${imageOrEntry}.png`;
}
