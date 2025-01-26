import { truncateString } from '../../utils/utils.js';

const getRandomPortrait = () => {
    return fetch('/random-portrait')
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


const generatePortrait = async (message, username) => {
    getRandomPortrait().then((imageUrl) => {
        if (!imageUrl) {
            console.error('Image URL could not be retrieved');
            return;
        }

        const container = document.createElement('div');
        container.className = 'pmd-portrait-container';

        const user = document.createElement('div');
        user.className = 'pmd-portrait-username';
        user.textContent = username;

        const portraitMessageBox = document.createElement('div');
        portraitMessageBox.className = 'pmd-portrait-message-box';

        const img = document.createElement('img');
        img.src = imageUrl;

        const textDiv = document.createElement('div');
        textDiv.className = 'pmd-portrait-message';
        textDiv.textContent = truncateString(message);

        portraitMessageBox.appendChild(img);
        portraitMessageBox.appendChild(textDiv);

        container.appendChild(user);
        container.appendChild(portraitMessageBox);


        document.body.appendChild(container);

        setTimeout(() => {
            container.classList.add('fade');
            setTimeout(() => {
                container.remove();
            }, 1000); 
        }, 3000);
    });
}

export { generatePortrait };