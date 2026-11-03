import pokemon from "./pokemon-list.js";
import { pokemonIconUrl } from "./cdn.js";

export function getPokemonSpriteName(number) {
    if (number < 0 || number > 1010) {
        return false;
    }

    return pokemon.find((mon) => mon.number == number)?.name ?? false;
}

export function getPokemonIconUrl(number) {
    if (!getPokemonSpriteName(number)) {
        return null;
    }

    return pokemonIconUrl(number);
}
