import pokemon from '../../lists/pokemon-list.js';
import tinycolor from "https://esm.sh/tinycolor2";

const getPokemonSpriteName = (number) => {
    if(number < 0 || number > 1010)
        return false;
    return pokemon.find( (mon) => mon.number == number ).name; 
};

const changeBackgroundSprite = (number, target) => {
    const targetArea = target ? target : document.getElementById('pattern-container');
    const pokemonNumber = parseInt(number);
    const url = pokemonNumber > 898 ? 
        'https://img.pokemondb.net/sprites/scarlet-violet/icon/' :
        'https://img.pokemondb.net/sprites/sword-shield/icon/';
    const pokemonName = getPokemonSpriteName(pokemonNumber);
    if(!pokemonName)
        return false;
    const spriteUrl = `${url}${pokemonName}.png`;
    targetArea.style.backgroundImage = `url(${spriteUrl})`;
}

const changeBackgroundColor = (color, target) => {
    const targetArea = target ? target : document.getElementsByTagName('body')[0];
    const darkerColor = tinycolor(`#${color}`).darken(20).toString();
    const gradient = `linear-gradient(315deg, #${color} 0%, ${darkerColor} 100%)`;
    targetArea.style.backgroundImage = gradient;
};


export { changeBackgroundColor, changeBackgroundSprite, getPokemonSpriteName };