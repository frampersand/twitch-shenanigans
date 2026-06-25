const POKEMON_DB_SLUG_OVERRIDES = {
  "alolan ninetales": "ninetales-alolan",
  "alolan raichu": "raichu-alolan",
  "galarian rapidash": "rapidash-galarian",
  "mr. mime": "mr-mime",
  "mr mime": "mr-mime",
  "sirfetch'd": "sirfetchd",
  "sirfetchd": "sirfetchd",
  "ho-oh": "ho-oh",
  "ho oh": "ho-oh",
  "mime jr.": "mime-jr",
  "type: null": "type-null",
  "jangmo-o": "jangmo-o",
  "hakamo-o": "hakamo-o",
  "kommo-o": "kommo-o",
  "mega charizard x": "charizard-mega-x",
  "mega charizard y": "charizard-mega-y",
  "mega gyarados": "gyarados-mega",
  "mega lucario": "lucario-mega",
  "mega mewtwo x": "mewtwo-mega-x",
  "mega mewtwo y": "mewtwo-mega-y",
  "mewtwo x": "mewtwo-mega-x",
  "mewtwo y": "mewtwo-mega-y",
};

export function normalizePokemonName(name) {
  return String(name).trim().toLowerCase();
}

export function nameToPokemonDbSlug(name, fallbackId = "") {
  const normalized = normalizePokemonName(name);
  if (POKEMON_DB_SLUG_OVERRIDES[normalized]) {
    return POKEMON_DB_SLUG_OVERRIDES[normalized];
  }

  if (fallbackId) {
    return fallbackId;
  }

  return normalized
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/\s+/g, "-");
}

export function getPokemonDbImageUrl(slug) {
  return `https://img.pokemondb.net/sprites/home/normal/${slug}.png`;
}
