import { genderCases, unownCases, burmyCases, deerlingCases, vivillonCases, flabebeCases, pumpkabooCases, oricorioCases } from '../../lists/variation-cases.js';
import { positions } from '../../lists/positions.js';
import getRandomArrayElement from '../../utils/utils.js';

let socket = io();
let currentSprites = positions;

socket.on('sprite-number', function (pokemonNumber, targetContainer = '') {
    console.log('Spriting');
    borderSpriteGenerator(pokemonNumber, targetContainer);
});

const borderSpriteGenerator = (pokemonNumber, targetContainer) => {
    const gameArea = targetContainer ? targetContainer : document.getElementById('game-area');
    if (pokemonNumber > 0 && pokemonNumber < 807) {
        if (currentSprites.length) {
            const position = getRandomArrayElement(0, currentSprites.length);
            const pokemonContainer = document.createElement('div');
            pokemonContainer.className = 'pokemon-sprite';
            pokemonContainer.style.top = currentSprites[position].y + 'px';
            pokemonContainer.style.left = currentSprites[position].x + 'px';
            const pokemonImage = document.createElement('img');
            pokemonImage.src = getSprite(pokemonNumber);
            currentSprites.splice(position, 1);
            pokemonContainer.appendChild(pokemonImage);
            gameArea.appendChild(pokemonContainer);
        }
    }
} 

function getSprite(number) {
    let urlNumber = getExceptions(number.toString().padStart(3, '0'));
    if (number >= 1 && number <= 649)
        return `https://www.pokencyclopedia.info/sprites/gen5/ani_black-white/ani_bw_${urlNumber}.gif`;
    if (number == 720)
        return `https://www.pokencyclopedia.info/sprites/3ds/ani_6/3ani__${urlNumber}_oras.gif`;
    if (number >= 650 && number <= 721)
        return `https://www.pokencyclopedia.info/sprites/3ds/ani_6/3ani__${urlNumber}_xy.gif`;
    if (number >= 722 && number <= 802)
        return `https://www.pokencyclopedia.info/sprites/3ds/ani_7/3ani__${urlNumber}__sm.gif`;
    if (number >= 803 && number <= 807)
        return `https://www.pokencyclopedia.info/sprites/3ds/ani_7/3ani__${urlNumber}__uu.gif`;
}

function getExceptions(number) {
    const randomChoice = (choices) => choices[Math.floor(Math.random() * choices.length)];

    const cases = {
        gender: () => `${number}_${Math.random() < 0.5 ? 'm' : 'f'}`,
        unown: () => `${number}${randomChoice(unownCases)}`,
        burmy: () => `${number}${randomChoice(burmyCases)}`,
        weather: () => `${number}-${Math.random() < 0.5 ? 'overcast' : 'sunshine'}`,
        shellos: () => `${number}-${Math.random() < 0.5 ? 'east' : 'west'}`,
        giratina: () => `${number}-${Math.random() < 0.5 ? 'altered' : 'origin'}`,
        shaymin: () => `${number}-${Math.random() < 0.5 ? 'land' : 'sky'}`,
        basculin: () => `${number}-${Math.random() < 0.5 ? 'blue-striped' : 'red-striped'}`,
        darmanitan: () => `${number}-${Math.random() < 0.5 ? 'standard' : 'zen'}`,
        deerling: () => `${number}${randomChoice(deerlingCases)}`,
        therian: () => `${number}-${Math.random() < 0.5 ? 'incarnate' : 'therian__2'}`,
        keldeo: () => `${number}-${Math.random() < 0.5 ? 'ordinary' : 'resolute__2'}`,
        meloetta: () => `${number}-${Math.random() < 0.5 ? 'aria' : 'pirouette'}`,
        vivillon: () => `${number}${randomChoice(vivillonCases)}_`,
        flabebe: () => `${number}${randomChoice(flabebeCases)}_`,
        meowstic: () => `${number}-${Math.random() < 0.5 ? 'male_' : 'female_'}`,
        aegislash: () => `${number}-${Math.random() < 0.5 ? 'blade_' : 'shield_'}`,
        pumpkaboo: () => `${number}${randomChoice(pumpkabooCases)}_`,
        xerneas: () => `${number}-${Math.random() < 0.5 ? 'active_' : 'neutral_'}`,
        hoopa: () => `${number}-${Math.random() < 0.5 ? 'confined_' : 'unbound_'}`,
        oricorio: () => `${number}${randomChoice(oricorioCases)}`,
        lycanroc: () => `${number}-midday`,
        wishiwashi: () => `${number}-${Math.random() < 0.5 ? 'school' : 'solo'}`,
        mimikyu: () => `${number}-${Math.random() < 0.5 ? 'busted' : 'disguised'}`
    };

    const conditions = [
        { check: () => Object.values(genderCases).includes(number), action: cases.gender },
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
        { check: () => parseInt(number) >= 650 && parseInt(number) <= 721 && number !== '668', action: () => `${number}_` }
    ];

    for (const condition of conditions) {
        if (condition.check()) return condition.action();
    }

    return number;
}


export default borderSpriteGenerator;