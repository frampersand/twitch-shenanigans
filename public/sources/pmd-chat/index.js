import { truncateString } from '../../utils/utils.js';

const getPortrait = (data) => {
    let queryParams = data
        ? `?portrait=${encodeURIComponent(data.portrait)}&variant=${encodeURIComponent(data.variant)}`
        : '';
    return fetch(`/portrait${queryParams}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch the image URL');
            }
            return response.json();
        })
        .then((data) => data.url)
        .catch((error) => {
            console.error(error);
            return null;
        });
}




const DEFAULT_NAME_COLOR = '#494981';

/** The viewer's chosen portrait; a random one if that fails (unknown number); null if the CDN is down */
const getPortraitWithFallback = async (userData) => {
    const imageUrl = await getPortrait(userData);
    if (imageUrl || !userData) return imageUrl;
    return getPortrait();
}

const generatePortrait = async (message, username, userBase = [], context = {}) => {
    // Twitch sends color: null for viewers who never picked a name color
    const color = context?.color || DEFAULT_NAME_COLOR;
    const userData = userBase.find((user) => user.username.toLowerCase() === username.toLowerCase());
    getPortraitWithFallback(userData).then((imageUrl) => {
        // Still show the message without a portrait rather than dropping it
        if (!imageUrl) {
            console.error('Portrait could not be retrieved for', username);
        }

        const currentChats = document.getElementsByClassName('pmd-portrait-container');
        if (currentChats.length > 5) {
            currentChats[0].remove();
        }

        const container = document.createElement('div');
        container.className = 'pmd-portrait-container';

        const userContainer = document.createElement('div');
        userContainer.className = 'pmd-portrait-username-container';
        userContainer.style.background = color;

        const user = document.createElement('div');
        user.className = 'pmd-portrait-username';
        user.textContent = username;
        const mostReadableColor = tinycolor.mostReadable(color, ['#18181b', '#e9e9e9']).toHexString();
        user.style.color = mostReadableColor;

        userContainer.appendChild(user);

        const portraitMessageBox = document.createElement('div');
        portraitMessageBox.className = 'pmd-portrait-message-box';

        if (imageUrl) {
            const img = document.createElement('img');
            img.src = imageUrl;
            portraitMessageBox.appendChild(img);
        }

        const textDiv = document.createElement('div');
        textDiv.className = 'pmd-portrait-message';
        textDiv.textContent = truncateString(message);

        portraitMessageBox.appendChild(textDiv);

        container.appendChild(userContainer);
        container.appendChild(portraitMessageBox);

        const chatContainer = document.getElementById('chat-container');
        chatContainer.appendChild(container);

        // setTimeout(() => {
        //     container.classList.add('fade');
        //     setTimeout(() => {
        //         container.remove();
        //     }, 1000); 
        // }, 3000);
    });
}
export { generatePortrait };