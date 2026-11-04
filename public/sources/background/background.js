// tinycolor is loaded as a global from /libs/tinycolor/tinycolor.js by the host page
import { getPokemonIconUrl, getPokemonSpriteName } from "/shared/pokemonIcons.js";
import { mountTilePattern } from "./tilePattern.js";

/** Returns the dex number shown, or false if the input isn't a valid one */
const changeBackgroundSprite = (number, target) => {
    const targetArea = target ? target : document.getElementById("pattern-container");
    const raw = String(number ?? "").trim();
    const isRandom = raw === "" || raw === "0";
    const pokemonNumber = isRandom
        ? Math.floor(Math.random() * 1010) + 1
        : parseInt(raw, 10);

    if (!Number.isFinite(pokemonNumber) || pokemonNumber < 1 || pokemonNumber > 1010) {
        return false;
    }

    const spriteUrl = getPokemonIconUrl(pokemonNumber);
    if (!spriteUrl) {
        return false;
    }

    mountTilePattern(targetArea, { spriteUrl });
    return pokemonNumber;
};

const changeBackgroundColor = (color, target) => {
    const targetArea = target ? target : document.getElementsByTagName("body")[0];
    const darkerColor = tinycolor(`#${color}`).darken(20).toString();
    const gradient = `linear-gradient(315deg, #${color} 0%, ${darkerColor} 100%)`;
    targetArea.style.backgroundImage = gradient;
};

export { changeBackgroundColor, changeBackgroundSprite, getPokemonSpriteName };
