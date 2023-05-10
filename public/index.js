import { genderCases, unownCases, burmyCases, deerlingCases, vivillonCases, flabebeCases, pumpkabooCases, oricorioCases } from './variation-cases.js';
import { positions } from './positions.js';
import getRandomArrayElement from './utils.js';
let socket = io();
let currentSprites = positions;

socket.on('sprite-number', function (pokemonNumber) {
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
            const gameArea = document.getElementById('game-area');
            gameArea.appendChild(pokemonContainer);
        }
    }
});

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
    if (Object.values(genderCases).indexOf(number) > -1) {
        return Math.random() < 0.5 ? number + '_m' : number + '_f';
    }
    if (number === '201') {
        const randomUnown = getRandomArrayElement(0, unownCases.length);
        return number + unownCases[randomUnown];
    }
    if (number === '412' || number === '413') {
        const randomBurmy = getRandomArrayElement(0, burmyCases.length);
        return number + burmyCases[randomBurmy];
    }
    if (number === '421') {
        return Math.random() < 0.5 ? number + '-overcast' : number + '-sunshine';
    }
    if (number === '422' || number === '423') {
        return Math.random() < 0.5 ? number + '-east' : number + '-west';
    }
    if (number === '487') {
        return Math.random() < 0.5 ? number + '-altered' : number + '-origin';
    }
    if (number === '492') {
        return Math.random() < 0.5 ? number + '-land' : number + '-sky';
    };
    if (number === '550') {
        return Math.random() < 0.5 ? number + '-blue-striped' : number + '-red-striped';
    }
    if (number === '555') {
        return Math.random() < 0.5 ? number + '-standard' : number + '-zen';
    }
    if (number === '585' || number === '586') {
        const randomDeerling = getRandomArrayElement(0, deerlingCases.length);
        return number + deerlingCases[randomDeerling];
    }
    if (number === '641' || number === '642' || number === '645') {
        return Math.random() < 0.5 ? number + '-incarnate' : number + '-therian__2';
    }
    if (number === '647') {
        return Math.random() < 0.5 ? number + '-ordinary' : number + '-resolute__2';
    }
    if (number === '648') {
        return Math.random() < 0.5 ? number + '-aria' : number + '-pirouette';
    }
    if (number === '666') {
        const randomVivillon = getRandomArrayElement(0, vivillonCases.length);
        return number + vivillonCases[randomVivillon] + '_';
    }
    if (number === '669' || number === '670' || number === '671') {
        const randomFlabebe = getRandomArrayElement(0, flabebeCases.length);
        return number + flabebeCases[randomFlabebe] + '_';
    }
    if (number === '678') {
        return Math.random() < 0.5 ? number + '-male_' : number + '-female_';
    }
    if (number === '681') {
        return Math.random() < 0.5 ? number + '-blade_' : number + '-shield_';
    }
    if (number === '710' || number === '711') {
        const randomPumpkaboo = getRandomArrayElement(0, pumpkabooCases.length);
        return number + pumpkabooCases[randomPumpkaboo] + '_';
    }
    if (number === '716') {
        return Math.random() < 0.5 ? number + '-active_' : number + '-neutral_';
    }
    if (number === '720') {
        return Math.random() < 0.5 ? number + '-confined_' : number + '-unbound_';
    }
    if (number === '741') {
        const randomOricorio = getRandomArrayElement(0, oricorioCases.length);
        return number + oricorioCases[randomOricorio];
    }
    if (number === '745') {
        return number + '-midday';
    }
    if (number === '746') {
        return Math.random() < 0.5 ? number + '-school' : number + '-solo';
    }
    if (number === '778') {
        return Math.random() < 0.5 ? number + '-busted' : number + '-disguised';
    }

    if (parseInt(number) >= 650 && parseInt(number) <= 721 && number != '668') {
        number = number + '_';
    }
    return number;
}