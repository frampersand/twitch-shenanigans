/** Bot chat lines, shared by the server (chat) and the showcase/mock overlays (previews) */

const pickRandom = (messages) => messages[Math.floor(Math.random() * messages.length)];

export const randomizerMessages = (username, pick) => {

    const messages = [
        `A'ight buckaroo @${username} , seems like you got ${pick}, now deal with it`,
        `Like it or not, you gotta play some ${pick} right now, @${username}`,
        `What if I told you that you gotta play ${pick} now, huh @${username}?`,
        `Hope your ${pick} game is top tier @${username}, cause you are playing it`,
        `Get ready, its ${pick} time @${username}`,
        `Of all possible picks, you get to play ${pick} right now, @${username}`,
        `And here I was hoping I'd see some ${pick} gameplay tonight, go get 'em @${username}`,
        `I gotta say, @${username} you just got ${pick}, and I love that for you`,
        `The stars say that playing ${pick} is ideal for you right now, @${username}`,
        `I've been told you play ${pick} really well @${username}, show me`,
        `No way it landed on ${pick}... guess you gotta play it now @${username}`,
        `Sigh... You got ${pick}, hope you are happy @${username}`,
        `I bid you a happy ${pick} game @${username}`,
        `Pssst @${username}, care for a ${pick} game, silly goose?`,
        `Unfortunately, I believe you might actually do well with ${pick}, @${username}`,
    ];

    return pickRandom(messages);
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

    return pickRandom(messages);
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
    return pickRandom(messages);
}

/** Fixed bot replies; the showcase uses the same ones so its preview matches the real bot */
export const botReplies = {
    rain: (username) =>
        `Hear! hear! and rejoice! ${username} has just summoned the rain! And shall be known from now on as The Rainbearer! Summoner of Storms! Harbinger of the chill vibes!`,
    invalidColor: () =>
        `I'm sorry :( That's not a valid hex color, use https://colorpicker.me/ copy the hex color, and then try again in a bit`,
    invalidPattern: () =>
        `I'm sorry but I'll need the number of the pokedex :( Look it up over here -> https://www.pokemon.com/us/pokedex and try again in a bit, please <3`,
    rainbearer: (rainbearer) =>
        rainbearer
            ? `The current Rainbearer is ${rainbearer}, pay your respects if you may, for they brought the downpour sounds for our enjoyment!`
            : `There's currently not a rainbearer yet`,
    spamWarning: (username) => `I'll kindly ask you to stop spamming please @${username}`,
    randomizerHelp: (username, games) =>
        `I don't know that one @${username}. Try !dealwithit [game] [role] [@user]. Games: ${games}`,
    invalidDealTarget: () =>
        `I'm sorry to say, but that's not a valid user. If you want to use this command for someone else, give me their username properly (prefix it with @, please)`,
    portraitNotFound: (username) =>
        `I couldn't find that portrait @${username}. Use a Pokédex number, like !portrait 25 happy`,
    portraitUpdated: (username) => `Your portrait has been updated successfully @${username}`,
    guessWhosBackDenied: () => `Certainly not Frampersand, that's for sure`,
    guessWhosBack: [
        `Guess who's back catJAM`,
        `Back again catJAM`,
        `Framps is back catJAM`,
        `Tell a friend catJAM`,
    ],
    pmdUsage: (supported) =>
        `Usage: !pmdconfig <preference> <value> (available: ${supported.join(", ")}). Example: !pmdconfig chatDirection up`,
    pmdError: (error, preference, supported) => ({
        unsupported: `Unsupported preference "${preference}". Available: ${supported.join(", ")}`,
        invalid_boolean: `Preference "${preference}" expects true/false.`,
        invalid_chat_direction: `Preference "${preference}" expects up or down.`,
        invalid_color: `Preference "${preference}" expects a hex color (e.g. #6961a7 or 6961a7).`,
        invalid_portrait_shape: `Preference "${preference}" expects square, round, or rounded.`,
    })[error],
    pmdSet: (username, preference, value) => `@${username} set ${preference}=${String(value)}`,
    cardStyleCurrent: (label, styles) =>
        `Randomizer cards use: ${label}. Change it with !cardstyle <style>: ${styles}`,
    cardStyleUnknown: (username, styles) =>
        `I don't know that card style @${username}. Pick one of: ${styles}`,
    cardStyleSet: (username, label) => `@${username} randomizer cards now use: ${label}`,
};
