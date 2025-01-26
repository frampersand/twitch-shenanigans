import { genderCases, unownCases, burmyCases, deerlingCases, vivillonCases, flabebeCases, pumpkabooCases, oricorioCases, lycanrocCases, cramorantCases } from '../../lists/variation-cases.js';
import { positions } from '../../lists/positions.js';
import { getRandomArrayElement } from '../../utils/utils.js';
import { getPokemonSpriteName } from '../background/background.js';

let socket = io();
let currentSprites = positions;

socket.on('sprite-number', function (pokemonNumber, targetContainer = '') {
    borderSpriteGenerator(pokemonNumber, targetContainer);
});

const borderSpriteGenerator = (pokemonNumber, targetContainer) => {
    const gameArea = targetContainer ? targetContainer : document.getElementById('game-area');
    let number = pokemonNumber;
    if(pokemonNumber === '0') {
        number = Math.floor(Math.random() * (893)) + 1;
    }
    
    if (number >= 0 && number <= 893) {
        if (currentSprites.length) {
            const position = getRandomArrayElement(0, currentSprites.length);
            const pokemonContainer = document.createElement('div');
            pokemonContainer.className = 'pokemon-sprite';
            pokemonContainer.style.top = currentSprites[position].y + 'px';
            pokemonContainer.style.left = currentSprites[position].x + 'px';
            const pokemonImage = document.createElement('img');
            pokemonImage.src = getSprite(number);
            currentSprites.splice(position, 1);
            pokemonContainer.appendChild(pokemonImage);
            gameArea.appendChild(pokemonContainer);
        }
    }
} 

function getSprite(number) {
    const spriteName = getPokemonSpriteName(number);
    let baseUrl;
    const spriteVersion = Math.random() < 0.1 ? 'shiny' : 'normal';

    let urlName = getExceptions(number.toString().padStart(3, '0'), spriteName);
    if (number >= 1 && number <= 649){
        baseUrl = `https://img.pokemondb.net/sprites/black-white/anim/${spriteVersion}/`;
        return `${baseUrl}${urlName}.gif`;
    }
    if (number >= 650 && number <= 807){
        baseUrl = `https://projectpokemon.org/images/${spriteVersion}-sprite/`;
         return `${baseUrl}${urlName}.gif`;
    }
    if (number >= 808 && number <= 893) {
        baseUrl = `https://projectpokemon.org/images/sprites-models/swsh-${spriteVersion}-sprites/`;
        return `${baseUrl}${urlName}.gif`;
    }
}

function getExceptions(number, spriteName) {
    const randomChoice = (choices) => choices[Math.floor(Math.random() * choices.length)];

    const cases = {
        gender: () => `${spriteName}_${Math.random() < 0.5 ? 'm' : 'f'}`,
        unown: () => `${spriteName}${randomChoice(unownCases)}`,
        burmy: () => `${spriteName}${randomChoice(burmyCases)}`,
        weather: () => `${spriteName}-${Math.random() < 0.5 ? 'overcast' : 'sunshine'}`,
        shellos: () => `${spriteName}-${Math.random() < 0.5 ? 'east' : 'west'}`,
        giratina: () => `${spriteName}-${Math.random() < 0.5 ? 'altered' : 'origin'}`,
        shaymin: () => `${spriteName}-${Math.random() < 0.5 ? 'land' : 'sky'}`,
        basculin: () => `${spriteName}-${Math.random() < 0.5 ? 'blue-striped' : 'red-striped'}`,
        darmanitan: () => `${spriteName}-${Math.random() < 0.5 ? 'standard-mode' : 'zen-mode'}`,
        deerling: () => `${spriteName}${randomChoice(deerlingCases)}`,
        therian: () => `${spriteName}-${Math.random() < 0.5 ? 'incarnate' : 'therian'}`,
        keldeo: () => `${spriteName}-${Math.random() < 0.5 ? 'ordinary' : 'resolute'}`,
        meloetta: () => `${spriteName}-${Math.random() < 0.5 ? 'aria' : 'pirouette'}`,
        vivillon: () => `${spriteName}${randomChoice(vivillonCases)}`,
        flabebe: () => `${spriteName}${randomChoice(flabebeCases)}`,
        meowstic: () => `${spriteName}${Math.random() < 0.5 ? '' : '-f'}`,
        aegislash: () => `${spriteName}${Math.random() < 0.5 ? '' : '-blade'}`,
        pumpkaboo: () => `${spriteName}${randomChoice(pumpkabooCases)}`,
        xerneas: () => `${spriteName}${Math.random() < 0.5 ? '' : '-active'}`,
        hoopa: () => `${spriteName}${Math.random() < 0.5 ? '' : '-unbound'}`,
        oricorio: () => `${spriteName}${randomChoice(oricorioCases)}`,
        lycanroc: () => `${spriteName}${randomChoice(lycanrocCases)}`,
        wishiwashi: () => `${spriteName}${Math.random() < 0.5 ? '-school' : ''}`,
        mimikyu: () => `${spriteName}${Math.random() < 0.5 ? '-busted' : ''}`,
        cramorant: () => `${spriteName}${randomChoice(cramorantCases)}`,
    };

    const conditions = [
        // { check: () => Object.values(genderCases).includes(number), action: cases.gender },
        { check: () => number === '201', action: cases.unown },
        { check: () => ['412', '413'].includes(number), action: cases.burmy },
        { check: () => number === '421', action: cases.weather },
        { check: () => ['422', '423'].includes(number), action: cases.shellos },
        { check: () => number === '487', action: cases.giratina },
        { check: () => number === '492', action: cases.shaymin },
        { check: () => number === '550', action: cases.basculin },
        { check: () => number === '555', action: cases.darmanitan },
        { check: () => ['585', '586'].includes(number), action: cases.deerling },
        { check: () => ['641', '642', '645'].includes(number), action: cases.therian },
        { check: () => number === '647', action: cases.keldeo },
        { check: () => number === '648', action: cases.meloetta },
        { check: () => number === '666', action: cases.vivillon },
        { check: () => ['669', '670', '671'].includes(number), action: cases.flabebe },
        { check: () => number === '678', action: cases.meowstic },
        { check: () => number === '681', action: cases.aegislash },
        { check: () => ['710', '711'].includes(number), action: cases.pumpkaboo },
        { check: () => number === '716', action: cases.xerneas },
        { check: () => number === '720', action: cases.hoopa },
        { check: () => number === '741', action: cases.oricorio },
        { check: () => number === '745', action: cases.lycanroc },
        { check: () => number === '746', action: cases.wishiwashi },
        { check: () => number === '778', action: cases.mimikyu },
        { check: () => number === '845', action: cases.cramorant },

        // { check: () => parseInt(number) >= 650 && parseInt(number) <= 721 && number !== '668', action: () => `${number}_` }
    ];
    // fix 642-645 case
    // fix 647 case

    for (const condition of conditions) {
        if (condition.check()) return condition.action();
    }

    return spriteName;
}


export default borderSpriteGenerator;