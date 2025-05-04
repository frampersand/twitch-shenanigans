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

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function cleanString (str=''){
    return str.replaceAll('󠀀', '').trim();
}


const getPortraitUserData = async () => {
    try {
      const response = await fetch('http://localhost:3000/pmd-user-data');
      if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
      }
      const json = await response.json();
      return json;
    } catch (error) {
      console.error(error.message);
    }
  }


export { getRandomArrayElement, getRandomItem, truncateString, capitalizeFirstLetter, cleanString, getPortraitUserData};