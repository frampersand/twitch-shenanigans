import { loadRoster } from "../../utils/loadRoster.js";
import { getRandomArrayElement } from "../../utils/utils.js";
import { DEFAULT_GAME, RANDOMIZER_GAMES, roleOf } from "/shared/randomizerGames.js";
import { gameLogoUrl } from "/shared/cdn.js";

const SPIN_TICKS = 5;
const TICK_MS = 500;

/**
 * Render a randomizer card. The server picks the final character (pickId) and posts the
 * chat message itself; when no id is given (showcase), the last spin is the pick.
 * Cards show the character's art on a role-colored card; if the art can't load (say, a
 * character added to the roster before its image reached the CDN), the card switches to
 * a text layout with the name in the middle instead of a broken image.
 */
const createRandomizedCard = async (username, target, pickId, game = DEFAULT_GAME) => {
    const roster = await loadRoster(game);
    if (!roster.length) return;

    const container = target ? target : document.getElementById('container');
    const selection = getRandomSelection(roster);
    const pickedIndex = roster.findIndex((entry) => entry.id === pickId);
    if (pickedIndex !== -1) {
        selection[selection.length - 1] = pickedIndex;
    }
    const finalEntry = roster[selection[selection.length - 1]];
    const gameName = RANDOMIZER_GAMES[game]?.name ?? game;
    let textMode = !roster.some((entry) => entry.image);
    let current = roster[selection[0]];

    const cardContainer = document.createElement('div');
    const cardContent = document.createElement('div');
    const cardFront = document.createElement('div');
    const cardBack = document.createElement('div');
    cardFront.className = 'front';
    cardBack.className = 'back';
    cardContent.className = 'card-content';
    cardContainer.className = 'pokemon-card';
    cardContainer.dataset.game = game;
    // Rectangular art fills the card instead of sitting in it as a growing picture
    cardContainer.classList.toggle('art-opaque', Boolean(RANDOMIZER_GAMES[game]?.opaqueArt));

    const playerContainer = document.createElement('div');
    playerContainer.className = 'player-name';
    const playerName = document.createElement('p');
    playerName.textContent = username;
    playerContainer.appendChild(playerName);

    const pickImage = document.createElement('img');
    pickImage.alt = '';

    // Text layout: the name is the centerpiece and the bar shows the game
    const center = document.createElement('div');
    center.className = 'pick-center';
    const centerName = document.createElement('p');
    const roleLabel = document.createElement('span');
    roleLabel.className = 'pick-role';
    center.append(centerName, roleLabel);

    const nameContainer = document.createElement('div');
    nameContainer.className = 'pokemon-name';
    const barText = document.createElement('p');
    nameContainer.appendChild(barText);

    // The game's logo on the back (the Poké Ball for UNITE); its name if the logo can't load
    const backLogo = document.createElement('img');
    backLogo.alt = gameName;
    backLogo.src = gameLogoUrl(game);
    backLogo.addEventListener('error', () => {
        const backLabel = document.createElement('p');
        backLabel.className = 'back-label';
        backLabel.textContent = gameName;
        backLogo.replaceWith(backLabel);
    });
    cardBack.appendChild(backLogo);

    cardFront.append(playerContainer, pickImage, center, nameContainer);
    cardContent.appendChild(cardFront);
    cardContent.appendChild(cardBack);
    cardContainer.appendChild(cardContent);
    container.appendChild(cardContainer);

    const show = (entry) => {
        current = entry;
        const role = roleOf(game, entry.role);
        cardFront.style.backgroundColor = role.color;
        cardContainer.classList.toggle('text-card', textMode);
        centerName.textContent = entry.name;
        roleLabel.textContent = role.label;
        barText.textContent = textMode ? gameName : entry.name;
        if (!textMode && entry.image) pickImage.src = entry.image;
    };
    pickImage.addEventListener('error', () => {
        textMode = true;
        show(current);
    });
    show(current);

    let counter = 0;
    const interval = setInterval(() => {
        show(roster[selection[counter]]);
        counter++;
        if (counter === SPIN_TICKS) {
            window.clearInterval(interval);
            show(finalEntry);
            pickImage.classList.add('selected');
            cardFront.classList.add('selected');
        }
    }, TICK_MS);

    setTimeout(() => {
        cardContainer.classList.add('fade');
    }, 6000);

    setTimeout(() => {
        cardContainer.remove();
    }, 9000);
}

const getRandomSelection = (roster) => {
    const selection = [];
    while (selection.length < SPIN_TICKS) {
        selection.push(getRandomArrayElement(0, roster.length));
    }
    return selection;
}

export default createRandomizedCard;
