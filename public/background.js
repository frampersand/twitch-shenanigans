import pokemon from './pokemon-list.js';

let socket = io();
socket.on('color', (color) => {
    const body = document.getElementsByTagName('body');
    body[0].style.backgroundColor = '#' + color;
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
    const spriteUrl = `${url}${pokemonName}.png`;
    patternContainer.style.backgroundImage = `url(${spriteUrl})`;
})

const getPokemonSpriteName = (number) => {
    if(number < 0 || number > 1010)
        return false;
    return pokemon.find( (mon) => mon.number == number ).name; 
}