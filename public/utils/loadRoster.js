const cachedRosters = new Map();

/** A randomizer game's roster; UNITE entries carry their CDN image URL (`entry.image`) */
export function loadRoster(game) {
  if (!cachedRosters.has(game)) {
    const request = fetch(`/api/rosters/${encodeURIComponent(game)}`).then((response) => {
      if (!response.ok) throw new Error(`Failed to load the ${game} roster`);
      return response.json();
    });
    // Forget failures so the next roll retries
    request.catch(() => cachedRosters.delete(game));
    cachedRosters.set(game, request);
  }
  return cachedRosters.get(game);
}
