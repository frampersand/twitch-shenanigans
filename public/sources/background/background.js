import pokemon from '../../lists/pokemon-list.js';
import tinycolor from "https://esm.sh/tinycolor2";


let socket = io();
socket.on('color', (color) => {
    const body = document.getElementsByTagName('body');
    const darkerColor = tinycolor(`#${color}`).darken(20).toString();
    const gradient = `linear-gradient(315deg, #${color} 0%, ${darkerColor} 100%)`;
    body[0].style.backgroundImage = gradient;
})

socket.on('pattern', (number) =>{
    const pokemonNumber = parseInt(number);
    const url = pokemonNumber > 898 ? 
        'https://img.pokemondb.net/sprites/scarlet-violet/icon/' :
        'https://img.pokemondb.net/sprites/sword-shield/icon/';
    const pokemonName = getPokemonSpriteName(pokemonNumber);
    if(!pokemonName)
        return false;

    const patternContainer = document.getElementById('pattern-container');
    const patternContainer2 = document.getElementById('pattern-container-mini');
    const spriteUrl = `${url}${pokemonName}.png`;
    patternContainer.style.backgroundImage = `url(${spriteUrl})`;
    patternContainer2.style.backgroundImage = `url(${spriteUrl})`;
})

const getPokemonSpriteName = (number) => {
    if(number < 0 || number > 1010)
        return false;
    return pokemon.find( (mon) => mon.number == number ).name; 
}