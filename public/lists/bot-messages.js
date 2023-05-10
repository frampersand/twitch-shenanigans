import getRandomArrayElement from "../utils.js";

const randomizerMessages = (username, pokemon) => {

    const messages = [
        `@${username} a'ight buckaroo, seems like you got ${pokemon}, now deal with it`,
        `Like it or not, you gotta play some ${pokemon} right now, @${username}`,
        `What if I told you that you gotta play ${pokemon} now, huh @${username}?`,
        `Hope your ${pokemon} game is top tier @${username}, cause you are playing it`,
        `Get ready, its ${pokemon} time @${username}`,
        `Of all possible pokemon, you get to play ${pokemon} right now, @${username}`,
        `And here I was hoping I'd see some ${pokemon} gameplay tonight, go get 'em @${username}`,
        `@${username} you just got ${pokemon}, and I love that for you`,
        `The stars say that playing ${pokemon} is ideal for you right now, @${username}`,
        `I've been told you play ${pokemon} really well @${username}, show me`,
        `No way it landed on ${pokemon}... guess you gotta play it now @${username}`,
        `Sigh... You got ${pokemon}, hope you are happy @${username}`,
        `I bid you a happy ${pokemon} game @${username}`,
        `@${username} care for a ${pokemon} game, silly goose?`,
    ];

    return messages[getRandomArrayElement(0, messages.length)];
}

export default randomizerMessages;