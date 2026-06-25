import pokemon from "../lists/pokemon-list.js";

const ICON_FILENAME_OVERRIDES = {
    typenull: "type-null",
    tapukoko: "tapu-koko",
    tapulele: "tapu-lele",
    tapubulu: "tapu-bulu",
    tapufini: "tapu-fini",
};

export function getPokemonIconFilename(name) {
    return ICON_FILENAME_OVERRIDES[name] ?? name;
}

export function getPokemonSpriteName(number) {
    if (number < 0 || number > 1010) {
        return false;
    }

    return pokemon.find((mon) => mon.number == number)?.name ?? false;
}

export function getPokemonIconSeries(number) {
    return number > 898 ? "scarlet-violet" : "sword-shield";
}

export function getPokemonIconUrl(number) {
    const name = getPokemonSpriteName(number);
    if (!name) {
        return null;
    }

    const series = getPokemonIconSeries(number);
    const filename = getPokemonIconFilename(name);
    return `/assets/pokemon-icons/${series}/${filename}.png`;
}
