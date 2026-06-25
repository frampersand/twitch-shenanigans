import { loadUniteRoster, getPokemonImagePath } from "../../utils/loadUniteRoster.js";
import { getRandomArrayElement } from "../../utils/utils.js";
import pokemonRoles from "../../lists/pokemon-roles.js";
import { randomizerMessages } from "../../lists/bot-messages.js";

const createRandomizedCard = async (username, channel, target, socket) => {
    const uniteRoster = await loadUniteRoster();
    if (!uniteRoster.length) return;

    const container = target ? target : document.getElementById('container');
    const pokemonSelection = getRandomSelection(uniteRoster);
    const finalSelection = pokemonSelection[pokemonSelection.length - 1];

    const cardContainer = document.createElement('div');
    const cardContent = document.createElement('div');
    const cardFront = document.createElement('div');
    const cardBack = document.createElement('div');
    cardFront.className = `front`;
    cardFront.style.backgroundColor = pokemonRoles[uniteRoster[pokemonSelection[0]].role];
    cardBack.className = `back`;
    cardContent.className = `card-content`;
    cardContainer.className = `pokemon-card`;
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
    pokemonImage.src = getPokemonImagePath(uniteRoster[pokemonSelection[0]]);
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

    let counter = 0;
    const interval = setInterval(() => {
        pokemonImage.src = getPokemonImagePath(uniteRoster[pokemonSelection[counter]]);
        pokemonName.innerHTML = uniteRoster[pokemonSelection[counter]].name;
        cardFront.style.backgroundColor = pokemonRoles[uniteRoster[pokemonSelection[counter]].role];
        counter++;
        if (counter === 5) {
            window.clearInterval(interval);
            pokemonImage.src = getPokemonImagePath(uniteRoster[finalSelection]);
            cardFront.style.backgroundColor = pokemonRoles[uniteRoster[finalSelection].role];
            pokemonName.innerHTML = uniteRoster[finalSelection].name;
            pokemonImage.classList.add('selected');
            const message = randomizerMessages(username, uniteRoster[finalSelection].name);
            if (channel !== 'showcase') {
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

const getRandomSelection = (uniteRoster) => {
    let selection = [];
    let i = 0;
    while (i < 5) {
        selection.push(getRandomArrayElement(0, uniteRoster.length));
        i++;
    }
    return selection;
}

export default createRandomizedCard;
