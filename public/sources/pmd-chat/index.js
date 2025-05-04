import { truncateString } from '../../utils/utils.js';
import { uniteRoster } from "../../lists/unite-roster.js";
import { randomizerMessages } from "../../lists/bot-messages.js";

const getPortrait = (data) => {
    let queryParams = data ? `?portrait=${data.portrait}&variant=${data.variant}` : '';
    return fetch(`/portrait${queryParams}`)
        .then((response) => {
            if (!response.ok) {
                throw new Error('Failed to fetch the image URL');
            }
            return response.json();
        })
        .then((data) => `../../../assets/portrait/${data.file}`)
        .catch((error) => {
            console.error(error);
            return null;
        });
}




const generatePortrait = async (message, username, userBase, context = { color: '#494981' }) => {
    const { color } = context;
    const userData = userBase.find((user) => user.username.toLowerCase() === username.toLowerCase());
    // if (userData){
    //     getUserPortrait(userData).then(imageUrl){
    //         buildPortrait(imageUrl)
    //     };
    // }
    getPortrait(userData).then((imageUrl) => {
        console.log('imageUrl :', imageUrl);
        if (!imageUrl) {
            console.error('Image URL could not be retrieved');
            return;
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

        const img = document.createElement('img');
        img.src = imageUrl;

        const textDiv = document.createElement('div');
        textDiv.className = 'pmd-portrait-message';
        textDiv.textContent = truncateString(message);

        portraitMessageBox.appendChild(img);
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
// Code to test live chat
// setInterval(() => {
//     const username = 'Frampersand';
//     const userbase = [
//         {
//             "username": "Frampersand",
//             "portrait": "143",
//             "url": "",
//             "variant": "Inspired"
//         }
//     ];
//     const message = randomizerMessages(username, uniteRoster[Math.floor(Math.random() * (uniteRoster.length - 1))].name);
//     generatePortrait(message, truncateString(username, 25), { color: '#' + (Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0') }, userbase)
// }, 5000);

export { generatePortrait };