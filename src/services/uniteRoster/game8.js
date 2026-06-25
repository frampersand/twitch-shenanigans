import fetch from "node-fetch";

const GAME8_ROSTER_URL = "https://game8.co/games/Pokemon-UNITE/archives/335437";

const ROLE_GUIDES = [
  { role: "attacker", marker: "Attacker Guide" },
  { role: "allrounder", marker: "All-Rounder Guide" },
  { role: "defender", marker: "Defender Guide" },
  { role: "speedster", marker: "Speedster Guide" },
  { role: "supporter", marker: "Supporter Guide" },
];

function extractLinkNames(sectionHtml) {
  const names = [];
  const linkRegex = /<a[^>]+archives\/\d+[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkRegex.exec(sectionHtml)) !== null) {
    const text = match[1].replace(/<[^>]+>/g, "").trim();
    if (text) names.push(text);
  }
  return names;
}

export function parseReleasedPokemonNames(html) {
  const start = html.indexOf("List of Released Pokemon");
  if (start === -1) return [];

  const end = html.indexOf("List of Upcoming Pokemon", start);
  const section = html.slice(start, end > start ? end : start + 100000);
  return [...new Set(extractLinkNames(section))];
}

export function parseRoleMap(html) {
  const roleByName = new Map();

  for (let i = 0; i < ROLE_GUIDES.length; i++) {
    const { role, marker } = ROLE_GUIDES[i];
    const start = html.indexOf(marker);
    if (start === -1) continue;

    const nextMarker = ROLE_GUIDES[i + 1]?.marker;
    const end = nextMarker ? html.indexOf(nextMarker, start + marker.length) : start + 100000;
    const section = html.slice(start, end > start ? end : undefined);

    for (const name of extractLinkNames(section)) {
      roleByName.set(name.trim().toLowerCase(), role);
    }
  }

  return roleByName;
}

export async function fetchGame8RosterData() {
  const response = await fetch(GAME8_ROSTER_URL, {
    headers: {
      "User-Agent": "twitch-shenanigans-unite-sync/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`Game8 request failed with status ${response.status}`);
  }

  const html = await response.text();
  const names = parseReleasedPokemonNames(html);
  const roleMap = parseRoleMap(html);

  return names.map((name) => ({
    name,
    role: roleMap.get(name.trim().toLowerCase()) || "allrounder",
  }));
}
