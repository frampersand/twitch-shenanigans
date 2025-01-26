const getRandomArrayElement = (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min) + min);
};


function getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function truncateString(str, maxLength = 160) {
    if (str.length > maxLength) {
        return str.slice(0, maxLength) + '...';
    }
    return str;
}

export { getRandomArrayElement, getRandomItem, truncateString };