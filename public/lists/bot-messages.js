import { getRandomArrayElement } from "../utils/utils.js";

export const randomizerMessages = (username, pokemon) => {

    const messages = [
        `A'ight buckaroo @${username} , seems like you got ${pokemon}, now deal with it`,
        `Like it or not, you gotta play some ${pokemon} right now, @${username}`,
        `What if I told you that you gotta play ${pokemon} now, huh @${username}?`,
        `Hope your ${pokemon} game is top tier @${username}, cause you are playing it`,
        `Get ready, its ${pokemon} time @${username}`,
        `Of all possible pokemon, you get to play ${pokemon} right now, @${username}`,
        `And here I was hoping I'd see some ${pokemon} gameplay tonight, go get 'em @${username}`,
        `I gotta say, @${username} you just got ${pokemon}, and I love that for you`,
        `The stars say that playing ${pokemon} is ideal for you right now, @${username}`,
        `I've been told you play ${pokemon} really well @${username}, show me`,
        `No way it landed on ${pokemon}... guess you gotta play it now @${username}`,
        `Sigh... You got ${pokemon}, hope you are happy @${username}`,
        `I bid you a happy ${pokemon} game @${username}`,
        `Pssst @${username}, care for a ${pokemon} game, silly goose?`,
        `Unfortunately, I believe you might actually do well with ${pokemon}, @${username}`,
    ];

    return messages[getRandomArrayElement(0, messages.length)];
};

export const randomizerCooldownMessages = (username) => {
    const messages = [
        `Redeem the re-roll, @${username} you weenie`,
        `Well @${username} how about YOU deal with the cooldown instead, bozo`,
        `Stop being a weenie @${username}, and play the dang mon`,
        `Maybe, just maybe, you should play the pokemon I asked you to @${username}`,
        `Fortune favors the bold @${username}, play what I told you to play`,
        `Play the pokemon I picked for you or I'll curse you with a Zacian&Comfey game @${username}`,
        `C'mon @${username}, just ask UniteDb what the build should be and play it`,
        `I'll get hella sad if you don't play what I requested @${username}`,
        `Listen, why did you ask for my opinion if you don't want to hear it @${username}`
    ];

    return messages[getRandomArrayElement(0, messages.length)];
}

export const welcomeMessages = (username) => {
    const messages = [
        `Hey ${username}! a big warm welcome to the stream! We hope you enjoy the chill vibes in the chat!`,
        `Welcome ${username}, I'm glad you've arrived! Hope you have a great time in here <3`,
        `You just arrived to the most wholesome place on twitch ${username}! Glad to have you here`,
        `Now now everyone, greet ${username}, they just arrived in here!`,
        `Ayooo new friend alert! ${username} hopping in for the first time! Have a nice stay <3`,
        `Everyone smile and wave to ${username} who just joined the Framily!`,
        `Friend, you just entered the Wholesome Gaming zone ${username}, relax and enjoy!`,
        `Welcome to Framperland ${username}, two tickets to ride on the Wholesome Train <3`
    ];
    return messages[getRandomArrayElement(0, messages.length)];
}