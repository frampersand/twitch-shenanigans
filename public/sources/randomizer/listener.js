import createRandomizedCard from "./randomizer.js";

let socket = io();

socket.on('randomize', (username, channel, target = '') => {
    const channelName = channel.slice(1);
    var urlParams = new URLSearchParams(window.location.search);
    var channelNameSource = urlParams.get('channel');
    
    if (channelName === channelNameSource && channelNameSource !== undefined) {
        createRandomizedCard(username, channel, target, socket);
    } else {
        console.log('Either this comes from another channel, or there is no channel parameter on the URL');
    }
})