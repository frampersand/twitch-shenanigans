import uniteRoster from "../../lists/unite-roster.js";
import getRandomArrayElement from "../../utils/utils.js";
import { randomizerMessages } from "../../lists/bot-messages.js";

const createRandomizedCard = (username, channel, target, socket) => {
        const container = target ? target : document.getElementById('container');
        const pokemonSelection = getRandomSelection();
        const finalSelection = pokemonSelection[pokemonSelection.length - 1];
        const cardContainer = document.createElement('div');
        const cardContent = document.createElement('div');
        const cardFront = document.createElement('div');
        const cardBack = document.createElement('div');
        cardFront.className = `front`;
        cardBack.className = `back`;
        cardContent.className = `card-content`;
        cardContainer.className = `pokemon-card ${uniteRoster[finalSelection].role}`;
        const pokemonImage = document.createElement('img');
        const pokemonNameContainer = document.createElement('div');
        pokemonNameContainer.className = `pokemon-name`;
        const pokemonName = document.createElement('p');
        pokemonName.innerHTML = uniteRoster[pokemonSelection[0]].name;
        pokemonNameContainer.appendChild(pokemonName);
        const playerContainer = document.createElement('div');
        playerContainer.className = `player-name`;
        const playerName = document.createElement('p');
        playerName.innerHTML = username;
        playerContainer.appendChild(playerName);
        pokemonImage.src = getPokemonImage(uniteRoster[pokemonSelection[0]].image);
        const pokeBallUniteLogo = document.createElement('img');
        pokeBallUniteLogo.src = '../../assets/pokeball-logo.png';
        cardBack.appendChild(pokeBallUniteLogo);
        cardFront.appendChild(playerContainer);
        cardFront.appendChild(pokemonImage);
        cardFront.appendChild(pokemonNameContainer);
        cardContent.appendChild(cardFront);
        cardContent.appendChild(cardBack);
        cardContainer.appendChild(cardContent);
        container.appendChild(cardContainer);

        const pokemonCardWrapper = document.createElement('div');
        pokemonCardWrapper.className = `pokemon-card-wrapper`;
    
        let counter = 0;
        const interval = setInterval(() => {
            pokemonImage.src = getPokemonImage(uniteRoster[pokemonSelection[counter]].image);
            pokemonName.innerHTML = uniteRoster[pokemonSelection[counter]].name;
            counter++;
            if (counter === 5) {
                window.clearInterval(interval);
                pokemonImage.src = getPokemonImage(uniteRoster[finalSelection].image);
                pokemonName.innerHTML = uniteRoster[finalSelection].name;
                pokemonImage.classList.add('selected');
                const message = randomizerMessages(username, uniteRoster[finalSelection].name);
                if(channel !== 'showcase'){
                    socket.emit('randomized', channel, message);
                }
            }
        }, 500);
    
        setTimeout(() => {
            cardContainer.classList.add('fade');
        }, 6000);
    
        setTimeout(() => {
            cardContainer.remove();
        }, 9000);
}

const getRandomSelection = () => {
    let selection = [];
    let i = 0;
    while (i < 5) {
        selection.push(getRandomArrayElement(0, uniteRoster.length));
        i++;
    }
    return selection;
}

const getPokemonImage = (pokemon) => {
    return `https://unite.pokemon.com/images/pokemon/${pokemon}/roster/roster-${pokemon}.png`;
}

export default createRandomizedCard;