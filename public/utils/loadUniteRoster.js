let cachedRoster = null;

/** Roster entries carry their CDN image URL (`entry.image`) */
export async function loadUniteRoster() {
  if (cachedRoster) return cachedRoster;

  const response = await fetch("/api/unite-roster");
  if (!response.ok) {
    throw new Error("Failed to load unite roster");
  }

  cachedRoster = await response.json();
  return cachedRoster;
}
